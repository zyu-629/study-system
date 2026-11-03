/* 学习系统 · Service Worker：缓存全部课程页面，离线可用 */
const CACHE = 'study-system-v1';
const ASSETS = [
  './',
  './index.html',
  './会计学-学习系统.html',
  './管理学-学习系统.html',
  './组织行为学-学习系统.html',
  './行为投资学-学习系统.html',
  './微观经济学-学习系统.html',
  './宏观经济学-学习系统.html',
  './组织行为学第18版-思维导图.html',
  './行为投资学-思维导图.html',
  './微观经济学-思维导图.html',
  './宏观经济学-思维导图.html',
  './sync.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || e.request.url.indexOf('api.github.com') >= 0) return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(resp => {
        if (resp && resp.ok && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
