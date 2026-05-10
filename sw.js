// BrainBlast Service Worker v1
const CACHE = 'brainblast-v1';

const STATIC = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install — cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(STATIC).catch(err => console.warn('Cache partial fail:', err))
    )
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Navigation (HTML pages) → network first, fallback to cache
// - Firebase/opentdb/external APIs → network only (never cache)
// - Everything else → cache first, fallback to network
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // Never cache external APIs
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('opentdb.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('fonts.google')
  ) return;

  // Navigation — network first
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match('/index.html')
      )
    );
    return;
  }

  // Static assets — cache first
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const network = fetch(e.request).then(res => {
          if (res && res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    )
  );
});

// Skip waiting when told to update
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
