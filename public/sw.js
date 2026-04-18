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

// ====== Web Push 通知 ======
self.addEventListener('push', (event) => {
  let data = { title: 'CoWell', body: '海が呼んでいる' };
  try { if (event.data) data = event.data.json(); } catch(e) { try { data.body = event.data.text(); } catch(e2){} }
  const title = data.title || 'CoWell';
  const options = {
    body: data.body || '',
    icon: '/img/icon-192.png',
    badge: '/img/icon-192.png',
    tag: data.tag || 'cowell-push',
    renotify: data.renotify === true,
    data: { url: data.url || '/' },
    requireInteraction: data.important === true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if (c.url.indexOf(urlToOpen) !== -1 && 'focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow(urlToOpen);
  }));
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

  // 魚画像と背景画像はブラウザHTTPキャッシュも完全バイパスして必ず最新を取る
  if (req.url.includes('/fish/') || req.url.includes('/bg/')) {
    event.respondWith(
      fetch(req, { cache: 'reload' }).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        return res;
      }).catch(() => caches.match(req))
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
