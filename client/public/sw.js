// Omega Longevity PWA Service Worker
// Version 3 - Fixed caching strategy to prevent stale JS chunk issues
const CACHE_NAME = 'omega-longevity-v3';
const OFFLINE_URL = '/offline.html';

// Only cache truly static assets that don't change between deployments
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/pwa-icon-192x192.png',
  '/pwa-icon-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/offline.html'
];

// Install event - cache essential static assets only
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install v3');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching static assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up ALL old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate v3');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - network first for everything, minimal caching
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API/tRPC requests entirely - always go to network
  if (event.request.url.includes('/api/') || event.request.url.includes('/trpc/')) {
    return;
  }

  // NEVER cache Vite dev server requests or JS/CSS chunks
  // This prevents stale React/module bundles from causing dual-React issues
  const url = new URL(event.request.url);
  if (
    url.pathname.includes('/@') ||           // Vite internal (/@vite, /@react-refresh, /@fs)
    url.pathname.includes('/node_modules/') || // Vite dep optimization
    url.pathname.endsWith('.js') ||           // JS files (hashed chunks change between builds)
    url.pathname.endsWith('.mjs') ||
    url.pathname.endsWith('.css') ||          // CSS files
    url.pathname.endsWith('.ts') ||           // TypeScript source (dev mode)
    url.pathname.endsWith('.tsx') ||
    url.pathname.includes('/src/') ||         // Source files in dev mode
    url.pathname.includes('/assets/')         // Built assets with hash
  ) {
    return; // Let the browser handle these normally - no SW interception
  }

  // For navigation requests (HTML pages) - network first, offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(OFFLINE_URL) || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // For static assets (images, icons, fonts) - cache first with network fallback
  if (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseClone);
                  });
              }
              return networkResponse;
            });
        })
    );
    return;
  }

  // Everything else - just let the browser handle it normally
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  
  let data = {
    title: 'Omega Longevity',
    body: 'You have a new notification',
    icon: '/pwa-icon-192x192.png',
    badge: '/pwa-icon-72x72.png',
    url: '/'
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        url: payload.url || payload.data?.url || data.url,
        tag: payload.tag,
        data: payload.data
      };
    } catch (e) {
      console.log('[ServiceWorker] Error parsing push data:', e);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    tag: data.tag || 'omega-notification',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url,
      ...data.data
    },
    actions: [
      {
        action: 'open',
        title: 'Open'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event.action);
  
  event.notification.close();

  // Handle dismiss action
  if (event.action === 'dismiss') {
    return;
  }

  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            return client.focus().then((focusedClient) => {
              if (focusedClient && 'navigate' in focusedClient) {
                return focusedClient.navigate(url);
              }
            });
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[ServiceWorker] Notification closed');
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[ServiceWorker] Push subscription changed');
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('BImRHF64hUETZkqsXEQgY4G4x6LD4YHadpgyOfhywetfK4U2VDr-JaGMvXBRNQp4jH2Df0wTEoG28432s90TLYM')
    }).then((subscription) => {
      return fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      });
    })
  );
});

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
