const CACHE_NAME = 'bhubezi-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/bhubezi-icon.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(err => console.error('Cache install failed:', err))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Return cached response if found
        if (cachedResponse) {
          // Fetch in background to update cache
          fetch(request)
            .then(networkResponse => {
              if (networkResponse.ok) {
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(request, networkResponse.clone());
                });
              }
            })
            .catch(() => {});
          
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        return fetch(request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Cache the new response
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
            
            return networkResponse;
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            // Return offline fallback if available
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            throw error;
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-actions') {
    event.waitUntil(syncPendingActions());
  }
});

// Push notification support
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/bhubezi-icon-192.png',
        badge: '/bhubezi-icon-72.png',
        tag: data.tag,
        requireInteraction: true
      })
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

async function syncPendingActions() {
  // This would sync pending actions from IndexedDB
  console.log('Syncing pending actions...');
}
