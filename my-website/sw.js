/* ======================================
   LoopFlix — Service Worker
   Caches shell assets for offline/installability
   ====================================== */
const CACHE_NAME = 'loopflix-v2';
const SHELL_ASSETS = [
    './',
    './index.html',
    './css/home.css',
    './js/home.js',
    './manifest.json'
];

// Install: cache shell
self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});

// Fetch: network-first for API, cache-first for shell
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Skip non-GET requests
    if (e.request.method !== 'GET') 
        return;
    

    // API calls: network-first with cache fallback
    if (url.hostname === 'api.themoviedb.org') {
        e.respondWith(fetch(e.request).then(res => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
            return res;
        }).catch(() => caches.match(e.request)));
        return;
    }

    // TMDB images: cache-first (they never change)
    if (url.hostname === 'image.tmdb.org') {
        e.respondWith(caches.match(e.request).then(cached => {
            if (cached) 
                return cached;
            
            return fetch(e.request).then(res => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                return res;
            });
        }));
        return;
    }

    // Shell assets: cache-first, fallback to network
    if (url.origin === self.location.origin) {
        e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
    }
});
