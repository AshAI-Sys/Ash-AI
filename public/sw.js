/**
 * ASH AI Service Worker - Advanced Caching Strategy for Apparel Manufacturing ERP
 * Provides offline functionality, background sync, and push notifications
 */

const CACHE_NAME = 'ash-ai-v1';
const STATIC_CACHE = 'ash-ai-static-v1';
const DYNAMIC_CACHE = 'ash-ai-dynamic-v1';

// Critical files that must be cached for offline functionality
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/orders',
  '/analytics',
  '/production',
  '/inventory',
  '/qc',
  '/client-portal',
  '/ai-assistant',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/Ash-AI.png'
];

// API routes to cache for offline functionality
const _CACHE_API_ROUTES = [
  '/api/auth/session',
  '/api/orders',
  '/api/analytics',
  '/api/inventory',
  '/api/qc/inspections',
  '/api/notifications',
  '/api/ai/ashley'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE && 
                     cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Claim all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (isStaticAsset(request)) {
    // Cache first for static assets
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else if (isApiRequest(request)) {
    // Network first for API requests with offline fallback
    event.respondWith(networkFirstWithOfflineFallback(request));
  } else if (isNavigationRequest(request)) {
    // Stale while revalidate for navigation
    event.respondWith(staleWhileRevalidateStrategy(request));
  } else {
    // Network first for everything else
    event.respondWith(networkFirstStrategy(request));
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-orders') {
    event.waitUntil(syncOfflineOrders());
  } else if (event.tag === 'background-sync-inventory') {
    event.waitUntil(syncOfflineInventory());
  } else if (event.tag === 'background-sync-qc') {
    event.waitUntil(syncOfflineQCData());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);
  
  const options = {
    body: 'You have new updates in ASH AI',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: event.data ? event.data.json() : {},
    actions: [
      {
        action: 'view',
        title: 'View Dashboard',
        icon: '/icon-192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icon-192.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.title = data.title || 'ASH AI Notification';
    options.body = data.body || options.body;
    options.data = data;
  }
  
  event.waitUntil(
    self.registration.showNotification('ASH AI', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  const { action, data } = event;
  
  let url = '/dashboard';
  if (data && data.url) {
    url = data.url;
  } else if (action === 'view') {
    url = '/dashboard';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // If already open, focus the existing window
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise, open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Caching Strategies

async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }
    
    console.log('[SW] Fetching and caching:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    return new Response('Offline - Resource not available', { status: 503 });
  }
}

async function networkFirstStrategy(request) {
  try {
    console.log('[SW] Fetching from network:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (_error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline - Resource not available', { status: 503 });
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    console.log('[SW] API request - network first:', request.url);
    const networkResponse = await fetch(request);
    
    // Only cache successful GET requests
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (_error) {
    console.log('[SW] API network failed, checking cache:', request.url);
    
    // For GET requests, try cache
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Return offline indicator for failed API requests
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'API request failed - you are currently offline',
        offline: true 
      }), 
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Fetch from network in background
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Network failed, but we might have cached version
    return cachedResponse;
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    console.log('[SW] Serving stale from cache:', request.url);
    return cachedResponse;
  }
  
  // Otherwise wait for network
  console.log('[SW] No cache, waiting for network:', request.url);
  return fetchPromise;
}

// Offline sync functions

async function syncOfflineOrders() {
  try {
    console.log('[SW] Syncing offline orders...');
    
    // Get offline orders from IndexedDB or localStorage
    const offlineOrders = await getOfflineData('orders');
    
    for (const order of offlineOrders) {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order)
        });
        
        if (response.ok) {
          await removeOfflineData('orders', order.id);
          console.log('[SW] Order synced successfully:', order.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync order:', order.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Order sync failed:', error);
  }
}

async function syncOfflineInventory() {
  try {
    console.log('[SW] Syncing offline inventory updates...');
    
    const offlineUpdates = await getOfflineData('inventory');
    
    for (const update of offlineUpdates) {
      try {
        const response = await fetch(`/api/inventory/${update.itemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update.data)
        });
        
        if (response.ok) {
          await removeOfflineData('inventory', update.id);
          console.log('[SW] Inventory synced successfully:', update.itemId);
        }
      } catch (error) {
        console.error('[SW] Failed to sync inventory:', update.itemId, error);
      }
    }
  } catch (error) {
    console.error('[SW] Inventory sync failed:', error);
  }
}

async function syncOfflineQCData() {
  try {
    console.log('[SW] Syncing offline QC data...');
    
    const offlineQCData = await getOfflineData('qc');
    
    for (const qcData of offlineQCData) {
      try {
        const response = await fetch('/api/qc/inspections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(qcData)
        });
        
        if (response.ok) {
          await removeOfflineData('qc', qcData.id);
          console.log('[SW] QC data synced successfully:', qcData.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync QC data:', qcData.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] QC sync failed:', error);
  }
}

// Helper functions

function isStaticAsset(request) {
  return request.url.includes('.js') || 
         request.url.includes('.css') || 
         request.url.includes('.png') || 
         request.url.includes('.jpg') || 
         request.url.includes('.svg') ||
         request.url.includes('.ico');
}

function isApiRequest(request) {
  return request.url.includes('/api/');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// IndexedDB helpers for offline data storage
async function getOfflineData(store) {
  try {
    const db = await openIndexedDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sync_queue'], 'readonly')
      const objectStore = transaction.objectStore('sync_queue')
      const index = objectStore.index('type')
      const request = index.getAll(store)
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('[SW] Failed to get offline data:', error)
    return []
  }
}

async function removeOfflineData(store, id) {
  try {
    const db = await openIndexedDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sync_queue'], 'readwrite')
      const objectStore = transaction.objectStore('sync_queue')
      const request = objectStore.delete(id)
      
      request.onsuccess = () => {
        console.log(`[SW] Removed offline data from ${store}:`, id)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('[SW] Failed to remove offline data:', error)
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ash-ai-offline', 1)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

console.log('[SW] ASH AI Service Worker loaded successfully');