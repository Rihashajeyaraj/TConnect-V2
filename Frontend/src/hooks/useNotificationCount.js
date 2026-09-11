import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { notificationAPI } from '../services/api.js';
import authSession from '../utils/authSession.js';
import {
  requestNotificationPermission as reqNotifPerm,
  triggerSystemNotification,
  registerPushSubscription,
} from '../utils/webPushManager.js';

const STORAGE_KEY = 'tc_unread_message_count';

export default function useNotificationCount() {
  const [unreadCount, setUnreadCount] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved !== null && saved !== 'undefined' ? Number(saved) || 0 : 0;
    } catch (_) {
      return 0;
    }
  });

  const processedIdsRef    = useRef(new Set());
  const supabaseRef        = useRef(window.__supabase_client || null);
  const pushRegisteredRef  = useRef(false);   // prevent duplicate registration per mount

  // ── Badge sync ─────────────────────────────────────────────────────────────
  const updateAppBadge = useCallback((count) => {
    const numCount = Number(count) || 0;

    try { localStorage.setItem(STORAGE_KEY, String(numCount)); } catch (_) {}

    // 1. Badging API — works in foreground on supported browsers
    if (typeof window !== 'undefined' && 'navigator' in window && 'setAppBadge' in navigator) {
      if (numCount > 0) {
        navigator.setAppBadge(numCount).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    }

    // 2. Relay to Service Worker so Android launcher badge persists after app close
    if (
      typeof window !== 'undefined' &&
      'navigator' in window &&
      'serviceWorker' in navigator &&
      navigator.serviceWorker.controller
    ) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type:  numCount > 0 ? 'SET_BADGE' : 'CLEAR_BADGE',
          count: numCount,
        });
      } catch (_) {}
    }
  }, []);

  const updateCountState = useCallback((newCount) => {
    const validCount = Math.max(0, Number(newCount) || 0);
    setUnreadCount(validCount);
    updateAppBadge(validCount);
  }, [updateAppBadge]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationAPI.getUnreadCount({ silentError: true, timeout: 8000 });
      const count = res?.data?.unread_count ?? res?.unread_count ?? (typeof res?.data === 'number' ? res.data : 0);
      updateCountState(count);
    } catch (_) {}
  }, [updateCountState]);

  // ── Push subscription registration ─────────────────────────────────────────
  const registerPush = useCallback(async () => {
    if (pushRegisteredRef.current) return;

    try {
      const token = authSession.getStoredToken();
      if (!token) return;

      pushRegisteredRef.current = true;
      await registerPushSubscription(token);
    } catch (err) {
      console.warn('[NotifCount] Push registration error:', err);
      pushRegisteredRef.current = false;  // allow retry
    }
  }, []);

  // ── Notification permission + push registration ────────────────────────────
  useEffect(() => {
    const init = async () => {
      const permission = await reqNotifPerm();
      if (permission === 'granted') {
        // Register push subscription after SW is ready
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(() => registerPush()).catch(() => {});
        }
      }
    };
    init();
  }, [registerPush]);

  // ── Initial fetch + polling fallback ──────────────────────────────────────
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // ── Handle pushsubscriptionchange from SW ─────────────────────────────────
  // When the browser regenerates the push subscription, the SW sends us the new one
  // so we can POST it to the backend.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleSwMessage = async (event) => {
      if (!event.data) return;

      if (event.data.type === 'PUSH_SUBSCRIPTION_CHANGED') {
        // New subscription object from SW — re-register with backend
        try {
          const { subscription } = event.data;
          if (!subscription?.endpoint) return;

          const token = authSession.getStoredToken();
          if (!token) return;

          const { endpoint, keys } = subscription;
          const { p256dh, auth }   = keys || {};
          if (!p256dh || !auth) return;

          await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/notifications/push-subscription`,
            {
              method:  'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization:  `Bearer ${token}`,
              },
              body: JSON.stringify({ endpoint, p256dh, auth }),
            }
          );
          pushRegisteredRef.current = true;
          console.info('[NotifCount] Re-registered renewed push subscription with backend.');
        } catch (e) {
          console.warn('[NotifCount] Failed to re-register renewed subscription:', e);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }, []);

  // ── Supabase Realtime ─────────────────────────────────────────────────────
  useEffect(() => {
    const SUPA_URL  = import.meta.env.VITE_SUPABASE_URL;
    const SUPA_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!SUPA_URL || !SUPA_ANON) return;

    if (!supabaseRef.current) {
      try {
        supabaseRef.current = createClient(SUPA_URL, SUPA_ANON);
        window.__supabase_client = supabaseRef.current;
      } catch (err) {
        console.warn('[NotificationRealtime] Client init error:', err);
        return;
      }
    }

    const user = authSession.getStoredUser();
    if (!user) return;

    const userEmail    = String(user.email || '').toLowerCase().trim();
    const userEmpCode  = String(user.employee_code || user.employee_id || '').toLowerCase().trim();
    const userId       = String(user.id || user.user_id || user.auth_user_id || '').toLowerCase().trim();
    const userRole     = authSession.normalizeRole(user);
    const channelName  = `realtime_notifs_${userId || userEmail || 'guest'}`;

    let channel;
    try {
      channel = supabaseRef.current.channel(channelName)
        .on('postgres_changes', {
          event:  'INSERT',
          schema: 'system',
          table:  'notifications',
        }, (payload) => {
          const newNotif = payload.new;
          if (!newNotif || !newNotif.id) return;

          if (processedIdsRef.current.has(newNotif.id)) return;
          processedIdsRef.current.add(newNotif.id);

          const rEmail   = String(newNotif.recipient_email || '').toLowerCase().trim();
          const rId      = String(newNotif.recipient_id || newNotif.recipient_user_id || newNotif.employee_id || '').toLowerCase().trim();
          const rRole    = String(newNotif.recipient_role || 'all').toLowerCase().trim();
          const senderId = String(newNotif.sender_id || newNotif.created_by || '').toLowerCase().trim();
          const senderEmail = String(newNotif.sender_email || '').toLowerCase().trim();

          if ((senderId && (senderId === userId || senderId === userEmpCode)) ||
              (senderEmail && senderEmail === userEmail)) return;

          const assocEmail = String(newNotif.assigned_to_email || newNotif.employee_email || '').toLowerCase().trim();
          const assocId    = String(newNotif.assigned_to_id || newNotif.user_id || '').toLowerCase().trim();
          const isTargeted = Boolean(rEmail || rId || assocEmail || assocId);
          let isRecipient  = false;

          if (isTargeted) {
            isRecipient = (userEmail && (rEmail === userEmail || assocEmail === userEmail)) ||
                          (rId && (rId === userId || rId === userEmpCode)) ||
                          (assocId && (assocId === userId || assocId === userEmpCode));
          } else {
            isRecipient = rRole === 'all' || rRole === userRole || userRole.includes(rRole) || rRole.includes(userRole);
          }

          if (isRecipient && (newNotif.unread || !newNotif.is_read || !newNotif.read)) {
            // Fetch actual count from server rather than doing prev + 1
            // This ensures the in-app count and badge are always accurate
            fetchUnreadCount().then(() => {
              // Also show a system notification card while the app is open
              triggerSystemNotification({
                title: newNotif.title || 'TwiteConnect Notification',
                body:  newNotif.message || newNotif.body || 'You have a new update in TwiteConnect.',
                url:   newNotif.url || newNotif.link || '/notifications',
              });
            });
          }
        })
        .on('postgres_changes', {
          event:  'UPDATE',
          schema: 'system',
          table:  'notifications',
        }, () => {
          fetchUnreadCount();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[NotificationRealtime] Connected to Supabase Realtime');
          }
        });
    } catch (e) {
      console.warn('[NotificationRealtime] Subscription error:', e);
    }

    return () => {
      if (channel) {
        try { supabaseRef.current.removeChannel(channel); } catch (_) {}
      }
    };
  }, [fetchUnreadCount, updateAppBadge]);

  // ── Cross-Tab Synchronization & Window Focus ──────────────────────────────
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        const count = Number(e.newValue) || 0;
        setUnreadCount(count);
        updateAppBadge(count);
      }
    };

    const handleCustomEvent = () => fetchUnreadCount();
    // Re-fetch when app gains focus (corrects stale badge after background period)
    const handleFocus = () => fetchUnreadCount();

    window.addEventListener('storage',                   handleStorageChange);
    window.addEventListener('tc_notifications_updated',  handleCustomEvent);
    window.addEventListener('focus',                     handleFocus);

    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('tc_unread_messages');
        bc.onmessage = (event) => {
          if (event.data && typeof event.data.count === 'number') {
            updateCountState(event.data.count);
          }
        };
      } catch (_) {}
    }

    return () => {
      window.removeEventListener('storage',                  handleStorageChange);
      window.removeEventListener('tc_notifications_updated', handleCustomEvent);
      window.removeEventListener('focus',                    handleFocus);
      if (bc) { try { bc.close(); } catch (_) {} }
    };
  }, [fetchUnreadCount, updateAppBadge, updateCountState]);

  // ── Public API ─────────────────────────────────────────────────────────────
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') await registerPush();
        return perm;
      } catch {
        return Notification.permission;
      }
    }
    return 'denied';
  }, [registerPush]);

  const formattedCount = unreadCount > 99 ? '99+' : String(unreadCount);

  return { unreadCount, formattedCount, refreshCount: fetchUnreadCount, requestNotificationPermission };
}
