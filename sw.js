const CACHE = 'workbench-v1';
const SHELL = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // 跨域资源（jsDelivr 动作库、rss2json 资讯）直接走网络，绝不缓存
  if (url.origin !== location.origin) return;

  // 打开 App 时优先拿网络最新版，失败再兜底离线缓存
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put('./index.html', cp)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 其他同源资源：先缓存，后网络
  e.respondWith(
    caches.match(e.request).then((c) =>
      c || fetch(e.request).then((r) => {
        if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((ca) => ca.put(e.request, cp)); }
        return r;
      }).catch(() => c)
    )
  );
});
