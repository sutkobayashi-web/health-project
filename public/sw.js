// Service Worker - Network First (常に最新を取得、オフライン時のみキャッシュ使用)
// CACHE_NAMEはクエリパラメータからバージョンを取得
const swUrl = new URL(self.registration.scope);
const CACHE_NAME = 'cowell-health-' + (new URL(self.location).searchParams.get('v') || 'default');

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // 同一オリジン以外はSWで処理しない
  if (new URL(req.url).origin !== self.location.origin) return;
  // APIリクエストはキャッシュしない
  if (req.url.includes('/api/')) return;
  // GETのみ
  if (req.method !== 'GET') return;

  // HTMLナビゲーション（ページ本体）は常にネットワーク優先
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // その他の静的ファイルはnetwork-first + キャッシュ更新
  event.respondWith(
    fetch(req).then((res) => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
      return res;
    }).catch(() => {
      return caches.match(req);
    })
  );
});
