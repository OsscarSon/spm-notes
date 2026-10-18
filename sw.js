// 改了网站内容后，把版本号 +1 (spm-v6、v7...)，用户就会收到「有新版本」提示
const CACHE = 'spm-v10';
// 新增 data/ 里的数据文件时，记得把它也加进下面这个清单 (这样装好 App 后第一次没网也能打开)
const PRECACHE = ['./', './index.html', './data/sej.js', './data/bio.js', './data/kim.js', './data/mat.js', './data/crops.json', './data/animals.json', './data/items.json', './data/monsters.json', './data/skills.json', './data/balance.json', './data/bundles.json', './data/glossary.json', './data/foraging.json', './data/merchant.json', './data/quests.json', './data/events.json', './data/npcs.json', './data/dialogue_generic.json', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  // 某个文件暂时下载失败，也不会让整个安装失败
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRECACHE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
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
