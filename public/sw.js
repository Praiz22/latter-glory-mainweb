// LGA Service Worker - I implemented this for PWA and Push Notifications
const CACHE_NAME = 'lga-v1';
const ASSETS = [
    '/blog.html',
    '/blogstyle.css',
    '/blogstyle-modern.css',
    '/editorial-ui.css',
    '/blog.js',
    '/supabase-init.js',
    '/config.js',
    '/latter-glory-logo.svg',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
];

// I install the service worker and cache critical assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// I activate and clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// I handle fetch requests with a cache-first strategy for static assets
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            const networked = fetch(event.request)
                .then((response) => {
                    const cacheCopy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, cacheCopy);
                    });
                    return response;
                })
                .catch(() => cached);

            return cached || networked;
        })
    );
});

// I handle push notifications here
self.addEventListener('push', (event) => {
    let data = { title: 'Latter Glory Academy', body: 'New update available!' };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: '/latter-glory-logo.svg',
        badge: '/latter-glory-logo.svg',
        data: data.url || '/blog.html',
        vibrate: [100, 50, 100],
        actions: [
            { action: 'open', title: 'View Now' },
            { action: 'close', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// I handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'close') return;

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            const url = event.notification.data;
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
