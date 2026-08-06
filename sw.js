/* ============================================================
   인터넷이 끊겨도 앱 화면이 열리게 해주는 부분입니다.

   앱 껍데기(html/css/js)만 저장해 두고, 날씨와 검색어처럼
   매번 새로 받아야 하는 자료는 저장하지 않습니다.
   그래야 오래된 날씨가 보이는 일이 없습니다.

   ※ 파일을 고친 뒤 폰에서 바뀐 게 안 보이면
      아래 CACHE 뒤의 숫자를 1 올리세요.
   ============================================================ */
var CACHE = 'today-v1';
var SHELL = ['./', './index.html', './app.css', './app.js', './manifest.json'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); })
          .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = e.request.url;

  // 날씨·검색어·당첨번호는 항상 새로 받습니다 (저장해두면 옛날 자료가 보입니다)
  if (url.indexOf('open-meteo') !== -1 || url.indexOf('/data/') !== -1) return;
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request);
    })
  );
});
