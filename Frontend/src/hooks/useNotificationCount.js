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

      // Update Windows/Mac OS Taskbar App Badge (Just like Microsoft Teams!)
      if ('setAppBadge' in navigator) {
        if (numCount > 0) {
          navigator.setAppBadge(numCount).catch(() => {});
        } else {
          navigator.clearAppBadge().catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[NotificationCount] Failed to fetch unread count:', err);
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

  return { unreadCount, refreshCount: fetchUnreadCount };
}
