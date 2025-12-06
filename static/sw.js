const CACHE_NAME = 'bharatcraft-v6-offline';
const DYNAMIC_CACHE = 'bharatcraft-dynamic-v6';
const OFFLINE_PAGE = '/offline.html';

// Critical assets for offline functionality
const CRITICAL_ASSETS = [
    '/',
    '/index.html',
    '/static/css/main.css',
    '/static/css/homepage-vibrant.css',
    '/static/css/mobile-responsive.css',
    '/static/js/main.js',
    '/static/js/auth-helper.js',
    '/static/logo.png?v=3',
    '/static/manifest.json',
    '/static/favicon.ico',
    '/static/favicon-32x32.png',
    '/static/favicon-16x16.png',
    '/static/apple-touch-icon.png',
    '/static/images/icons/icon-72.png',
    '/static/images/icons/icon-96.png',
    '/static/images/icons/icon-128.png',
    '/static/images/icons/icon-144.png',
    '/static/images/icons/icon-152.png',
    '/static/images/icons/icon-192.png',
    '/static/images/icons/icon-384.png',
    '/static/images/icons/icon-512.png'
];

// Assets to cache for artisan dashboard (works offline)
const ARTISAN_ASSETS = [
    '/artisan',
    '/artisan/dashboard',
    '/static/css/artisan-simple.css',
    '/static/css/artisan-dashboard.css',
    '/static/css/ai-features.css',
    '/static/js/artisan-simple.js',
    '/static/js/artisan-simple-multilingual.js',
    '/static/js/artisan-voice.js',
    '/static/js/chat.js',
    '/static/js/chat-enhanced.js'
];

// Assets to cache for buyer dashboard
const BUYER_ASSETS = [
    '/buyer',
    '/buyer/dashboard',
    '/static/css/buyer-modern.css',
    '/static/css/buyer.css',
    '/static/css/chat.css',
    '/static/css/chat-enhanced.css',
    '/static/js/buyer-modern.js',
    '/static/js/buyer.js',
    '/static/js/chat.js',
    '/static/js/chat-enhanced.js'
];

// All assets to cache
const ASSETS_TO_CACHE = [...CRITICAL_ASSETS, ...ARTISAN_ASSETS, ...BUYER_ASSETS];

// Install Service Worker - Cache critical assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker for offline support...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching critical assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('[SW] All assets cached successfully');
                return self.skipWaiting(); // Activate immediately
            })
            .catch((error) => {
                console.error('[SW] Failed to cache assets:', error);
            })
    );
});

// Activate Service Worker - Clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    const cacheWhitelist = [CACHE_NAME, DYNAMIC_CACHE];

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (!cacheWhitelist.includes(cacheName)) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Service worker activated');
                return self.clients.claim(); // Take control immediately
            })
    );
});

// Fetch Strategy - Network First with Cache Fallback (for artisans in low network)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // API requests - Network first, cache fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Clone and cache successful responses
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Network failed, try cache
                    return caches.match(request)
                        .then((cachedResponse) => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            // Return offline data if available
                            return new Response(
                                JSON.stringify({
                                    error: 'Offline',
                                    message: 'You are offline. Data will sync when online.'
                                }),
                                {
                                    headers: { 'Content-Type': 'application/json' },
                                    status: 503
                                }
                            );
                        });
                })
        );
        return;
    }

    // Static assets - Cache first, network fallback
    if (request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'image' ||
        request.destination === 'font') {
        event.respondWith(
            caches.match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return fetch(request)
                        .then((response) => {
                            // Cache new assets
                            if (response.ok) {
                                const responseClone = response.clone();
                                caches.open(DYNAMIC_CACHE).then((cache) => {
                                    cache.put(request, responseClone);
                                });
                            }
                            return response;
                        });
                })
        );
        return;
    }

    // HTML pages - Network first, cache fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Cache successful page loads
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Return offline page
                        return caches.match(OFFLINE_PAGE) ||
                            caches.match('/') ||
                            new Response(
                                '<h1>Offline</h1><p>You are currently offline. Please check your connection.</p>',
                                { headers: { 'Content-Type': 'text/html' } }
                            );
                    });
            })
    );
});

// Background Sync - For artisans to sync data when back online
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered:', event.tag);

    if (event.tag === 'sync-products') {
        event.waitUntil(syncProducts());
    } else if (event.tag === 'sync-orders') {
        event.waitUntil(syncOrders());
    } else if (event.tag === 'sync-messages') {
        event.waitUntil(syncMessages());
    }
});

// Sync functions for background sync
async function syncProducts() {
    try {
        const cache = await caches.open('pending-uploads');
        const requests = await cache.keys();

        for (const request of requests) {
            try {
                await fetch(request.clone());
                await cache.delete(request);
                console.log('[SW] Product synced successfully');
            } catch (error) {
                console.error('[SW] Failed to sync product:', error);
            }
        }
    } catch (error) {
        console.error('[SW] Sync products failed:', error);
    }
}

async function syncOrders() {
    console.log('[SW] Syncing orders...');
    // Implement order sync logic
}

async function syncMessages() {
    console.log('[SW] Syncing messages...');
    // Implement message sync logic
}

// Push Notifications - For order updates
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Bharatcraft Notification';
    const options = {
        body: data.body || 'You have a new update',
        icon: '/static/images/icons/icon-192.png',
        badge: '/static/images/icons/icon-192.png',
        vibrate: [200, 100, 200],
        data: data.url || '/',
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'close', title: 'Close' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        const urlToOpen = event.notification.data || '/';
        event.waitUntil(
            clients.openWindow(urlToOpen)
        );
    }
});

// Message Handler - For communication with main app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CACHE_URLS') {
        const urlsToCache = event.data.urls;
        event.waitUntil(
            caches.open(DYNAMIC_CACHE)
                .then((cache) => cache.addAll(urlsToCache))
        );
    }
});

console.log('[SW] Service Worker loaded successfully - Offline support enabled!');
