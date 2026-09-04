/**
 * Web Push & PWA System Notification Utility
 * Manages OS Taskbar badging, Android status shade notifications, and Service Worker push listeners.
 */

export async function requestNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      try {
        const perm = await Notification.requestPermission();
        return perm;
      } catch (err) {
        console.warn('[WebPush] Permission request error:', err);
      }
    }
    return Notification.permission;
  }
  return 'denied';
}

/**
 * Triggers a System Level Web Notification (via ServiceWorker registration)
 * This ensures Android OS adds a notification shade card and renders the 
 * badge counter on the PWA homescreen icon (matching native apps like WhatsApp).
 */
export async function triggerSystemNotification({
  title = 'TwiteConnect Notification',
  body = 'You have a new update in TwiteConnect.',
  icon = '/pwa-192x192.png',
  badge = '/favicon.svg',
  count = null,
  url = '/',
  tag = 'twiteconnect-notif',
  vibrate = [200, 100, 200],
} = {}) {
  // Update App Badge API
  if (typeof window !== 'undefined' && count !== null && 'navigator' in window && 'setAppBadge' in navigator) {
    const numCount = Number(count) || 0;
    if (numCount > 0) {
      navigator.setAppBadge(numCount).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }

  // Ensure notification permission is granted
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  const options = {
    body,
    icon,
    badge,
    vibrate,
    tag: `${tag}-${Date.now()}`,
    renotify: true,
    data: { url, count },
  };

  // 1. Primary: Use Service Worker Registration to display Notification (Required for Android Mobile PWA homescreen badging)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return true;
      }
    } catch (swErr) {
      console.warn('[WebPush] SW showNotification failed, trying fallback:', swErr);
    }
  }

  // 2. Fallback: Browser native Notification API (Desktop)
  try {
    const notif = new Notification(title, options);
    notif.onclick = () => {
      window.focus();
      if (url && url !== '/') {
        window.location.href = url;
      }
      notif.close();
    };
    return true;
  } catch (err) {
    console.warn('[WebPush] Fallback Notification error:', err);
    return false;
  }
}

/**
 * Register Web Push Subscription with Service Worker PushManager
 */
export async function subscribeToWebPush(publicVapidKey = null) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription && publicVapidKey) {
      const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    return subscription;
  } catch (err) {
    console.warn('[WebPush] Push subscription error:', err);
    return null;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
