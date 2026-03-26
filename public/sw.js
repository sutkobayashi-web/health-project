// Service Worker - Network First (常に最新を取得、オフライン時のみキャッシュ使用)
const CACHE_NAME = 'cowell-health-v2';

self.addEventListener('install', (event) => {
  // skipWaitingしない（ログイン中のリロードを防止）
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // 同一オリジン以外はSWで処理しない（CSP違反防止）
  if (new URL(req.url).origin !== self.location.origin) return;
  // APIリクエストはキャッシュしない
  if (req.url.includes('/api/')) return;
  // GETのみキャッシュ
  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req).then((res) => {
      // 成功したらキャッシュを更新
      const clone = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
      return res;
    }).catch(() => {
      // オフライン時はキャッシュから返す
      return caches.match(req);
    })
  );
});
