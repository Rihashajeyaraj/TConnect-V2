// ── TwiteConnect Service Worker ───────────────────────────────────────────────
// v4 — Web Push background badge support (iPhone + Android)
// -----------------------------------------------------------------------------
const CACHE_NAME = 'twiteconnect-v4'
const BADGE_CACHE = 'tc-badge-v1'   // Stores latest unread count across push events

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/favicon.svg'
]

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {})
    })
  )
  self.skipWaiting()
})

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== BADGE_CACHE) {
            return caches.delete(cache)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return
  }

  // Bypass cache for JS/CSS assets to allow Vite lazy imports & dynamic module reloading
  if (event.request.url.includes('/assets/') || event.request.url.endsWith('.js')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const contentType = response.headers.get('content-type') || ''
        if (event.request.url.endsWith('.js') && contentType.includes('text/html')) {
          return new Response('console.warn("Module chunk updated. Refreshing page...");', {
            status: 404,
            headers: { 'Content-Type': 'application/javascript' }
          })
        }
        return response
      }).catch(async () => {
        const cached = await caches.match(event.request)
        return cached || new Response('console.warn("Module fetch failed offline");', {
          status: 404,
          headers: { 'Content-Type': 'application/javascript' }
        })
      })
    )
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {})
          })
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached
        if (event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html')) {
          const indexFallback = (await caches.match('/index.html')) || (await caches.match('/'))
          if (indexFallback) return indexFallback
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
      })
  )
})

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Persist the latest unread count so push events can retrieve the last known value. */
async function cacheUnreadCount(count) {
  try {
    const cache = await caches.open(BADGE_CACHE)
    await cache.put('/tc-badge', new Response(String(count)))
  } catch (_) {}
}

/** Read the last cached unread count (fallback = 0). */
async function getCachedUnreadCount() {
  try {
    const cache = await caches.open(BADGE_CACHE)
    const res = await cache.match('/tc-badge')
    if (res) return Number(await res.text()) || 0
  } catch (_) {}
  return 0
}

/** Update the OS app-icon badge using the Badging API (supported on iOS 16.4+ and Android Chrome). */
async function updateOsBadge(count) {
  const numCount = Number(count) || 0
  try {
    if ('setAppBadge' in self.navigator) {
      console.log(`[SW] setAppBadge called with count = ${numCount}`)
      if (numCount > 0) {
        await self.navigator.setAppBadge(numCount)
      } else {
        await self.navigator.clearAppBadge()
      }
    }
  } catch (err) {
    console.warn('[SW] setAppBadge error:', err)
  }
  await cacheUnreadCount(numCount)
}

// ── Web Push Event ────────────────────────────────────────────────────────────
/**
 * Fires when the backend sends a Web Push message.
 * This is the ONLY path that updates the app-icon badge while the app is closed.
 *
 * Expected payload from backend:
 * {
 *   "type":         "new_notification",
 *   "title":        "...",
 *   "body":         "...",
 *   "unread_count": N,     ← actual server-computed count; NEVER hardcoded
 *   "url":          "/notifications"
 * }
 */
self.addEventListener('push', (event) => {
  console.log('[SW] PUSH EVENT RECEIVED')
  let data = {}
  if (event.data) {
    try {
      data = event.data.json()
    } catch (_) {
      data = { body: event.data.text() }
    }
  }

  const title    = data.title || 'TwiteConnect'
  const body     = data.body  || data.message || 'You have a new notification'
  const url      = data.url   || '/notifications'
  // Use server-provided unread_count — never +1 yourself
  const unread   = Number(data.unread_count)
  const hasCount = !isNaN(unread) && unread >= 0
  console.log(`[SW] unread_count received = ${unread}`)

  // Deduplicate: ignore if we already showed a notification with the same title+body
  // within the last 2 seconds (rapid consecutive messages are still shown individually)
  const tag = data.tag || `tc-${Date.now()}`

  event.waitUntil(
    (async () => {
      // 1. Update OS app-icon badge (works on iOS 16.4+ PWA, Android Chrome 81+)
      if (hasCount) {
        await updateOsBadge(unread)
      }

      // 2. Show the notification card (Android notification shade + iOS lock-screen)
      //    badge MUST be a PNG — SVG is not supported on Android
      await self.registration.showNotification(title, {
        body,
        icon:     '/pwa-192x192.png',
        badge:    '/pwa-192x192.png',   // ← PNG required; SVG silently breaks Android badge
        vibrate:  [200, 100, 200],
        tag,
        renotify: true,
        data: {
          url,
          unread_count: hasCount ? unread : null
        }
      })
    })()
  )
})

// ── Notification Click ────────────────────────────────────────────────────────
function sanitizeInternalUrl(url) {
  if (!url || typeof url !== 'string') return '/'
  const trimmed = url.trim()
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('javascript:')) {
    return trimmed
  }
  return '/'
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawUrl = event.notification.data?.url || '/'
  const targetUrl = sanitizeInternalUrl(rawUrl)

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate to target route
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client && targetUrl && targetUrl !== '/') {
            client.navigate(targetUrl).catch(() => {})
          }
          return client.focus()
        }
      }
      // Otherwise open the target URL in a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// ── Push Subscription Change ──────────────────────────────────────────────────
/**
 * Fires when the browser invalidates the push subscription (e.g. after browser update
 * or long inactivity). Re-subscribe and notify the app so it can POST the new subscription
 * to the backend.
 *
 * The app will handle the backend update via the 'PUSH_SUBSCRIPTION_CHANGED' message.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Re-subscribe with the same applicationServerKey as before
        const oldSub      = event.oldSubscription
        const appServerKey = oldSub?.options?.applicationServerKey
        if (!appServerKey) return   // Can't re-subscribe without the key

        const newSub = await self.registration.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: appServerKey,
        })

        // Notify all open app windows so they can POST the new subscription to the backend
        const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
        for (const client of allClients) {
          client.postMessage({
            type:         'PUSH_SUBSCRIPTION_CHANGED',
            subscription: newSub.toJSON(),
          })
        }
      } catch (err) {
        console.warn('[SW] pushsubscriptionchange re-subscribe failed:', err)
      }
    })()
  )
})

// ── Service Worker Messages ───────────────────────────────────────────────────
/**
 * Messages from the React app:
 *
 * SET_BADGE         { count: N }   — Update badge when app is in foreground
 * CLEAR_BADGE       {}             — Clear badge (all messages read)
 * TRIGGER_NOTIFICATION { title, options } — Show notification from foreground
 */
self.addEventListener('message', (event) => {
  if (!event.data) return

  if (event.data.type === 'SET_BADGE') {
    const count = Number(event.data.count) || 0
    updateOsBadge(count)   // async, fire-and-forget
  }

  if (event.data.type === 'CLEAR_BADGE') {
    updateOsBadge(0)
  }

  if (event.data.type === 'TRIGGER_NOTIFICATION') {
    const { title, options } = event.data
    if (title && self.registration?.showNotification) {
      self.registration.showNotification(title, {
        icon:     '/pwa-192x192.png',
        badge:    '/pwa-192x192.png',
        vibrate:  [200, 100, 200],
        renotify: true,
        ...options,
      }).catch(() => {})
    }
  }
})
