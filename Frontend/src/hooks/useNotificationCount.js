import { useState, useEffect, useCallback } from 'react';
import { notificationAPI } from '../services/api.js';

export default function useNotificationCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationAPI.getUnreadCount();
      const count = res?.data?.unread_count ?? res?.unread_count ?? (typeof res?.data === 'number' ? res.data : 0);
      const numCount = Number(count) || 0;
      setUnreadCount(numCount);

      // Update Windows/Mac OS Taskbar App Badge & Mobile PWA Badge
      if ('setAppBadge' in navigator) {
        if (numCount > 0) {
          navigator.setAppBadge(numCount).catch(() => {});
        } else {
          navigator.clearAppBadge().catch(() => {});
        }
      }

      // Relay count to Service Worker for Android PWA launcher badging
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SET_BADGE',
          count: numCount,
        });
      }
    } catch (err) {
      console.warn('[NotificationCount] Failed to fetch unread count:', err);
    }
  }, []);

  useEffect(() => {
    // Automatically trigger browser & mobile OS Notification Permission prompt
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => {
          console.log('[NotificationPermission] Status:', perm);
        }).catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    // Poll unread count every 15 seconds
    const interval = setInterval(fetchUnreadCount, 15000);

    // Listen for custom immediate update events
    const handleUpdate = () => fetchUnreadCount();
    window.addEventListener('tc_notifications_updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('tc_notifications_updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [fetchUnreadCount]);

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

  return { unreadCount, refreshCount: fetchUnreadCount, requestNotificationPermission };
}
