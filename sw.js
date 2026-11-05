/* 学习系统 · Service Worker
   - HTML 页面：网络优先（保证内容更新即时到达），失败时回退缓存（离线兜底）
   - 静态资源（图标/manifest/sync.js）：缓存优先
   - 版本号变更会清空旧缓存 */
const CACHE = 'study-system-v3';
const SHELL = [
  './',
  './index.html',
  './sync.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
const PAGES = [
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
  './会计学第4版-思维导图.html',
  './管理学第15版-思维导图.html'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(a => c.add(a).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || e.request.url.indexOf('api.github.com') >= 0) return;
  const isNav = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').indexOf('text/html') >= 0;
  if (isNav) {
    // HTML：网络优先，离线回退缓存
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }
  // 其他 GET：缓存优先
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
      if (resp && resp.ok && resp.type === 'basic') {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return resp;
    }))
  );
});
