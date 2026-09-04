const CACHE_NAME = 'twiteconnect-v3'
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/favicon.svg'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {})
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache)
          }
        })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return
  }

  // Bypass cache for JS/CSS assets to allow Vite lazy imports & dynamic module reloading
  if (event.request.url.includes('/assets/') || event.request.url.endsWith('.js')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const contentType = response.headers.get('content-type') || ''
        // Prevent SPA server returning HTML fallback (index.html) for a missing JS module chunk
        if (event.request.url.endsWith('.js') && contentType.includes('text/html')) {
          return new Response('console.warn("Module chunk updated. Refreshing page...");', {
            status: 404,
            headers: { 'Content-Type': 'application/javascript' }
          })
        }
        return response
      }).catch(() => caches.match(event.request))
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
      .catch(() => caches.match(event.request))
  )
})

// ── Web Push Event Listener ───────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Twite Connect Notification', message: 'You have a new message from Twite Connect', url: '/' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (_) {
      data.message = event.data.text();
    }
  }

  // Update OS Taskbar & App Icon Badge on background Web Push
  const unread = Number(data.unread_count || data.count) || 1;
  if ('setAppBadge' in self.navigator) {
    self.navigator.setAppBadge(unread).catch(() => {});
  }

  const options = {
    body: data.message || data.body || 'New notification',
    icon: '/pwa-192x192.png',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    tag: `twiteconnect-push-${Date.now()}`,
    renotify: true,
    data: {
      url: data.url || '/',
      count: unread
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Twite Connect Notification', options)
  );
});

// ── Handle Notification Click ─────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Handle Service Worker Messages (Badging & Notifications) ──────────────────
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SET_BADGE') {
    const count = Number(event.data.count) || 0;
    if ('setAppBadge' in self.navigator) {
      if (count > 0) {
        self.navigator.setAppBadge(count).catch(() => {});
      } else {
        self.navigator.clearAppBadge().catch(() => {});
      }
    }
  }

  if (event.data.type === 'TRIGGER_NOTIFICATION') {
    const { title, options } = event.data;
    if (title && self.registration && self.registration.showNotification) {
      self.registration.showNotification(title, {
        icon: '/pwa-192x192.png',
        badge: '/favicon.svg',
        vibrate: [200, 100, 200],
        renotify: true,
        ...options,
      }).catch(() => {});
    }
  }
});


