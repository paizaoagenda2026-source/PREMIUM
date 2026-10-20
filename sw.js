/* ============================================================
   SERVICE WORKER – PREMIUM CATALISADORES PWA
   ============================================================ */
const CACHE_NAME = 'premium-cat-v1.0.0';

const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// INSTALL – faz o cache inicial
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        urlsToCache.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Falha ao cachear:', url, err))
        )
      );
    })
  );
});

// ACTIVATE – limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// FETCH – estratégia inteligente
self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // NAVEGAÇÃO (HTML): network-first com fallback offline
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone)).catch(()=>{});
          return res;
        })
        .catch(() =>
          caches.match(req)
            .then(cached => cached || caches.match('./') || caches.match('./index.html'))
        )
    );
    return;
  }

  // DEMAIS ASSETS: cache-first com fallback rede
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone)).catch(()=>{});
        }
        return res;
      }).catch(() => cached);
    })
  );
});

// Mensagem do cliente para ativar novo SW imediatamente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
