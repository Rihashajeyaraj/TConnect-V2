import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { notificationAPI } from '../services/api.js';
import authSession from '../utils/authSession.js';
import { requestNotificationPermission as reqNotifPerm, triggerSystemNotification } from '../utils/webPushManager.js';

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

  const processedIdsRef = useRef(new Set());
  const supabaseRef = useRef(window.__supabase_client || null);

  // Synchronize count to OS Badging API & Service Worker
  const updateAppBadge = useCallback((count) => {
    const numCount = Number(count) || 0;

    // Save to localStorage for cross-tab & page refresh persistence
    try {
      localStorage.setItem(STORAGE_KEY, String(numCount));
    } catch (_) {}

    // 1. Update Windows/Mac OS Taskbar App Badge & Mobile PWA Badge
    if (typeof window !== 'undefined' && 'navigator' in window && 'setAppBadge' in navigator) {
      if (numCount > 0) {
        navigator.setAppBadge(numCount).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    }

    // 2. Relay count to Service Worker for Android PWA launcher badging
    if (typeof window !== 'undefined' && 'navigator' in window && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: 'SET_BADGE',
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
    } catch (_) {
      // Silent catch for background notification count polling
    }
  }, [updateCountState]);

  // Request browser Notification permissions once
  useEffect(() => {
    reqNotifPerm();
  }, []);

  // Initial fetch and polling fallback
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Supabase Realtime Subscription for instant < 100ms unread count increment
  useEffect(() => {
    const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
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

    const userEmail = String(user.email || '').toLowerCase().trim();
    const userEmpCode = String(user.employee_code || user.employee_id || '').toLowerCase().trim();
    const userId = String(user.id || user.user_id || user.auth_user_id || '').toLowerCase().trim();
    const userRole = authSession.normalizeRole(user);

    const channelName = `realtime_notifs_${userId || userEmail || 'guest'}`;

    let channel;
    try {
      channel = supabaseRef.current.channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'system',
          table: 'notifications',
        }, (payload) => {
          const newNotif = payload.new;
          if (!newNotif || !newNotif.id) return;

          // Deduplicate events
          if (processedIdsRef.current.has(newNotif.id)) return;
          processedIdsRef.current.add(newNotif.id);

          // Check if notification is intended for current user
          const rEmail = String(newNotif.recipient_email || '').toLowerCase().trim();
          const rId = String(newNotif.recipient_id || newNotif.recipient_user_id || newNotif.employee_id || '').toLowerCase().trim();
          const rRole = String(newNotif.recipient_role || 'all').toLowerCase().trim();

          const senderId = String(newNotif.sender_id || newNotif.created_by || '').toLowerCase().trim();
          const senderEmail = String(newNotif.sender_email || '').toLowerCase().trim();

          // Exclude self-sent notifications
          if ((senderId && (senderId === userId || senderId === userEmpCode)) || (senderEmail && senderEmail === userEmail)) {
            return;
          }

          const assocEmail = String(newNotif.assigned_to_email || newNotif.employee_email || '').toLowerCase().trim();
          const assocId = String(newNotif.assigned_to_id || newNotif.user_id || '').toLowerCase().trim();

          const isTargeted = Boolean(rEmail || rId || assocEmail || assocId);
          let isRecipient = false;

          if (isTargeted) {
            isRecipient = (userEmail && (rEmail === userEmail || assocEmail === userEmail)) || (rId && (rId === userId || rId === userEmpCode)) || (assocId && (assocId === userId || assocId === userEmpCode));
          } else {
            isRecipient = rRole === 'all' || rRole === userRole || userRole.includes(rRole) || rRole.includes(userRole);
          }

          if (isRecipient && (newNotif.unread || !newNotif.is_read || !newNotif.read)) {
            setUnreadCount((prev) => {
              const next = prev + 1;
              updateAppBadge(next);
              
              // Trigger system notification so Android OS adds a notification shade card
              // and renders the badge counter on the PWA homescreen icon (matching WhatsApp).
              triggerSystemNotification({
                title: newNotif.title || 'TwiteConnect Notification',
                body: newNotif.message || newNotif.body || 'You have a new update in TwiteConnect.',
                count: next,
                url: newNotif.url || newNotif.link || '/'
              });

              return next;
            });
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'system',
          table: 'notifications',
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

  // Cross-Tab Synchronization & Window Focus Handlers
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        const count = Number(e.newValue) || 0;
        setUnreadCount(count);
        updateAppBadge(count);
      }
    };

    const handleCustomEvent = () => fetchUnreadCount();
    const handleFocus = () => fetchUnreadCount();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tc_notifications_updated', handleCustomEvent);
    window.addEventListener('focus', handleFocus);

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
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tc_notifications_updated', handleCustomEvent);
      window.removeEventListener('focus', handleFocus);
      if (bc) {
        try { bc.close(); } catch (_) {}
      }
    };
  }, [fetchUnreadCount, updateAppBadge, updateCountState]);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        return perm;
      } catch {
        return Notification.permission;
      }
    }
    return 'denied';
  }, []);

  const formattedCount = unreadCount > 99 ? '99+' : String(unreadCount);

  return { unreadCount, formattedCount, refreshCount: fetchUnreadCount, requestNotificationPermission };
}
