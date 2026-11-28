self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  const p = u.pathname;
  if (e.request.mode === 'navigate' || p.endsWith('/') || p.endsWith('.html') || p.endsWith('.json')) {
    e.stopImmediatePropagation();
    e.respondWith(fetch(e.request, { cache: 'no-store' }).catch(() =>
      caches.match(e.request).then((r) => r || caches.match('./index.html'))));
  }
});

const CACHE_NAME = 'raspisanie-cache-20261128211515';
const CORE_FILES = ['./', './index.html', './manifest.json', './icon.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_FILES)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  // JSON с расписанием всегда берём из сети (чтобы не показывать устаревшее),
  // с откатом на кэш при отсутствии интернета
  if (url.includes('/data/') && url.endsWith('.json')) {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Остальные файлы — сначала кэш, потом сеть
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
