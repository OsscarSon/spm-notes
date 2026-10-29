// 改了网站内容后，把版本号 +1 (spm-v6、v7...)，用户就会收到「有新版本」提示
const CACHE = 'spm-v63';
const PRECACHE = ['./', './index.html', './music.js', './online.js', './focus.js', './img/focus/sakura.webp', './img/focus/sakura-s.webp', './img/focus/sakura-m.webp', './img/focus/onsen.webp', './img/focus/onsen-s.webp', './img/focus/onsen-m.webp', './img/focus/brick.webp', './img/focus/brick-s.webp', './img/focus/brick-m.webp', './img/focus/cabin.webp', './img/focus/cabin-s.webp', './img/focus/cabin-m.webp', './img/focus/sunny.webp', './img/focus/sunny-s.webp', './img/focus/sunny-m.webp', './img/focus/night.webp', './img/focus/night-s.webp', './img/focus/night-m.webp', './img/focus/cafe.webp', './img/focus/cafe-s.webp', './img/focus/cafe-m.webp', './img/focus/lighthouse.webp', './img/focus/lighthouse-s.webp', './img/focus/lighthouse-m.webp', './starmap.js', './labs.js', './lab-ptable.js', './lab-plot.js', './lab-physics.js', './lab-geo.js', './lab-mol.js', './lab-phet.js', './lab-mmap.js', './lab-ocr.js', './lab-mathin.js', './lab-cas.js', './lab-mermaid.js', './lab-space.js', './lab-m3d.js', './lab-bio3d.js', './data/sej.js', './data/bio.js', './data/kim.js', './data/fiz.js', './data/mat.js', './data/sci.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 点专注完成的通知：回到已打开的 App，没有就打开它 */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  }));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });

    // 自己网站的文件：有网就拿最新的，没网 / 很慢就用缓存
    if (url.origin === self.location.origin) {
      const net = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      });
      if (!cached) return net;
      return Promise.race([net, new Promise((_, rej) => setTimeout(rej, 4000))]).catch(() => cached);
    }

    // 公式库等外部文件：先用缓存，后台更新
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || net;
  }));
});
