/* 字芽 Service Worker：应用外壳预缓存 + 运行时缓存，首次打开后完全离线可玩。 */
const VERSION = 'ziya-v10';
const CORE = [
  './',
  'index.html',
  'manifest.json',
  'css/app.css',
  'js/data/chars.js',
  'js/core/pinyin.js',
  'js/core/store.js',
  'js/core/srs.js',
  'js/core/audio.js',
  'js/core/strokes.js',
  'js/vendor/hanzi-writer.min.js',
  'js/data/pinyin-data.js',
  'js/data/reads.js',
  'img/manifest.js',
  'js/game/gen.js',
  'js/game/pinyin.js',
  'js/app.js',
  'audio/ui.js',
  'audio/g01.js',
  'icon.svg',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) =>
      Promise.all(CORE.map((u) => c.add(u).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
    })
  );
});
