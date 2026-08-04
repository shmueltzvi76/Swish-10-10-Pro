const CACHE_NAME = 'swish-shell-v2';
const SHELL_URLS = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // קבצי assets עם hash בשם (Vite) לעולם לא משתנים - קאש קודם, בלי לחכות לרשת בכלל
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return res;
      }))
    );
    return;
  }

  // מסמך ה-HTML ושאר קבצי המעטפת - רשת קודם, כדי שגרסה חדשה שעולה לפרודקשן תמיד תתפוס מיד, נופל לקאש רק כשאין חיבור
  event.respondWith(
    fetch(request).then((res) => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      return res;
    }).catch(() => caches.match(request))
  );
});
