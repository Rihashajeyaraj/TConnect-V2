/**
 * TwiteConnect — Web Push Manager
 * =================================
 * Manages:
 *  - OS Taskbar / PWA app-icon badge updates (via Badging API)
 *  - Push subscription registration and backend sync
 *  - Push subscription unregistration on logout
 *  - System notification display (foreground fallback)
 *
 * SECURITY: VAPID public key only — private key never touches the browser.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || null

// ── Internal state ────────────────────────────────────────────────────────────
let _subscriptionRegistered = false   // prevent duplicate registrations per session
let _lastEndpoint = null              // detect if subscription changed

// ── Notification permission ───────────────────────────────────────────────────

export async function requestNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      try {
        const perm = await Notification.requestPermission()
        return perm
      } catch (err) {
        console.warn('[WebPush] Permission request error:', err)
      }
    }
    return Notification.permission
  }
  return 'denied'
}

// ── VAPID key conversion ──────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output  = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}

// ── Push subscription registration ───────────────────────────────────────────

/**
 * Subscribe this device to Web Push and register the subscription with the backend.
 *
 * Safe to call multiple times — will skip if already registered with same endpoint.
 *
 * @param {string|null} authToken  The user's Bearer token for the backend API call.
 */
export async function registerPushSubscription(authToken) {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.info('[WebPush] PushManager not supported on this browser/platform.')
    return
  }
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[WebPush] VITE_VAPID_PUBLIC_KEY not set — skipping push registration.')
    return
  }
  if (Notification.permission !== 'granted') {
    console.info('[WebPush] Notification permission not granted — skipping push registration.')
    return
  }

  try {
    const reg = await navigator.serviceWorker.ready
    if (!reg.pushManager) return

    // Get existing subscription or create new one if granted
    let subscription = await reg.pushManager.getSubscription()
    console.info('[WebPush] current browser subscription detected:', subscription ? 'YES' : 'NO')

    if (!subscription) {
      console.info('[WebPush] Creating new PushManager subscription with VAPID key...')
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      console.info('[WebPush] New PushManager subscription created successfully.')
    }

    const endpoint = subscription.endpoint

    // Skip if already registered this exact subscription in memory this session
    if (_subscriptionRegistered && _lastEndpoint === endpoint) {
      console.info('[WebPush] Subscription endpoint already synced with backend this session.')
      return
    }

    // Extract keys
    const rawKey  = subscription.getKey('p256dh')
    const rawAuth = subscription.getKey('auth')
    if (!rawKey || !rawAuth) {
      console.warn('[WebPush] Subscription missing p256dh/auth keys.')
      return
    }

    const p256dh = btoa(String.fromCharCode(...new Uint8Array(rawKey)))
    const auth   = btoa(String.fromCharCode(...new Uint8Array(rawAuth)))

    console.info('[WebPush] subscription registration/update attempted for endpoint:', endpoint.slice(0, 45) + '...')
    const response = await fetch(`${API_BASE_URL}/notifications/push-subscription`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ endpoint, p256dh, auth }),
    })

    if (response.ok) {
      _subscriptionRegistered = true
      _lastEndpoint = endpoint
      const resData = await response.json().catch(() => ({}))
      console.info('[WebPush] backend response:', response.status, resData.message || 'Push subscription synced successfully')
    } else {
      console.warn('[WebPush] backend response:', response.status, 'failed to sync push subscription')
    }
  } catch (err) {
    console.warn('[WebPush] registerPushSubscription error:', err)
  }
}

// ── Push subscription unregistration (logout) ─────────────────────────────────

/**
 * Unsubscribe this device from Web Push and remove the subscription from the backend.
 * Call this on logout to ensure no push is sent to a device with a different user logged in.
 *
 * @param {string|null} authToken  The user's Bearer token.
 */
export async function unregisterPushSubscription(authToken) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  _subscriptionRegistered = false
  _lastEndpoint = null

  try {
    const reg = await navigator.serviceWorker.ready
    if (!reg.pushManager) return

    const subscription = await reg.pushManager.getSubscription()
    if (!subscription) return

    const endpoint = subscription.endpoint
    const rawKey   = subscription.getKey('p256dh')
    const rawAuth  = subscription.getKey('auth')
    const p256dh   = rawKey  ? btoa(String.fromCharCode(...new Uint8Array(rawKey)))  : ''
    const auth     = rawAuth ? btoa(String.fromCharCode(...new Uint8Array(rawAuth))) : ''

    // Remove from backend first (token still valid)
    if (authToken) {
      await fetch(`${API_BASE_URL}/notifications/push-subscription`, {
        method:  'DELETE',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${authToken}`,
        },
        body: JSON.stringify({ endpoint, p256dh, auth }),
      }).catch(() => {})
    }

    // Unsubscribe from browser push manager
    await subscription.unsubscribe()
    console.info('[WebPush] Push subscription unregistered.')
  } catch (err) {
    console.warn('[WebPush] unregisterPushSubscription error:', err)
  }
}

// ── Old API — subscribe without backend registration (kept for compatibility) ──

export async function subscribeToWebPush(publicVapidKey = null) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null
  }
  try {
    const reg = await navigator.serviceWorker.ready
    let subscription = await reg.pushManager.getSubscription()
    if (!subscription && publicVapidKey) {
      const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey)
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      })
    }
    return subscription
  } catch (err) {
    console.warn('[WebPush] Push subscription error:', err)
    return null
  }
}

// ── System notification (foreground only) ─────────────────────────────────────
/**
 * Show a system notification when the app IS in foreground.
 * Background notifications come through the service worker push event — not this function.
 */
export async function triggerSystemNotification({
  title  = 'TwiteConnect Notification',
  body   = 'You have a new update in TwiteConnect.',
  icon   = '/pwa-192x192.png',
  badge  = '/pwa-192x192.png',   // PNG required for Android
  count  = null,
  url    = '/',
  tag    = 'twiteconnect-notif',
  vibrate = [200, 100, 200],
} = {}) {
  // Update App Badge API (foreground)
  if (typeof window !== 'undefined' && count !== null && 'navigator' in window && 'setAppBadge' in navigator) {
    const numCount = Number(count) || 0
    if (numCount > 0) {
      navigator.setAppBadge(numCount).catch(() => {})
    } else {
      navigator.clearAppBadge().catch(() => {})
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return false
  }

  const options = {
    body,
    icon,
    badge,
    vibrate,
    tag:      `${tag}-${Date.now()}`,
    renotify: true,
    data:     { url, count },
  }

  // Primary: Use Service Worker Registration (required for Android Mobile PWA homescreen badging)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready
      if (reg?.showNotification) {
        await reg.showNotification(title, options)
        return true
      }
    } catch (swErr) {
      console.warn('[WebPush] SW showNotification failed, trying fallback:', swErr)
    }
  }

  // Fallback: Browser native Notification API (Desktop)
  try {
    const notif = new Notification(title, options)
    notif.onclick = () => {
      window.focus()
      if (url && url !== '/') window.location.href = url
      notif.close()
    }
    return true
  } catch (err) {
    console.warn('[WebPush] Fallback Notification error:', err)
    return false
  }
}
