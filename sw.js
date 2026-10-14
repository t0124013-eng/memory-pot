/* メモリーポット service worker
   アプリを更新したら VERSION の数字を1つ上げてください（例：v1 → v2）。 */
const VERSION = 'v1';
const CORE = 'memory-pot-core-' + VERSION;
const FONTS = 'memory-pot-fonts';
const CORE_FILES = [
  './', './index.html', './manifest.webmanifest', './vendor/xlsx.full.min.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CORE).then(c => c.addAll(CORE_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('memory-pot-core-') && k !== CORE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // ページ本体：通信できれば最新、できなければ保存済みを表示
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CORE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Google Fonts：保存済みをすぐ使い、裏で更新
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONTS).then(async c => {
        const hit = await c.match(req);
        const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // 同じサイト内のファイル：保存済みを優先
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CORE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
