// 앱 파일을 고쳐서 다시 올릴 때마다 이 숫자를 올려 주세요 (v1 → v2).
// 그래야 설치된 앱이 새 버전을 받아 "새 버전이 준비됐어요" 안내를 띄웁니다.
const VERSION = 'english-routine-v1';
const FONT_CACHE = 'english-routine-fonts';
const SHELL = [
  './',
  './index.html',
  './giu-data.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 화면에서 "지금 적용"을 누를 때만 새 버전으로 바꿔요.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// 알림을 누르면 앱을 열어요.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then(list => {
    if (list.length) return list[0].focus();
    return self.clients.openWindow('./');
  }));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: 저장해 둔 것을 쓰고, 뒤에서 새로 받아 둬요.
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(caches.open(FONT_CACHE).then(async cache => {
      const hit = await cache.match(req);
      const fresh = fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      }).catch(() => hit);
      return hit || fresh;
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // 앱 화면은 저장해 둔 것으로 열어서 인터넷 없이도 열려요.
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./index.html').then(hit => hit || fetch(req)));
    return;
  }
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
