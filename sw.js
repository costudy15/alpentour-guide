// 알펜루트 여행 가이드 - Service Worker
const CACHE_NAME = 'alpentour-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// 설치: 핵심 파일 캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 활성화: 구버전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: 캐시 우선 → 네트워크 폴백
self.addEventListener('fetch', (event) => {
  // 외부 API 요청(Claude API, 환율 API)은 캐시하지 않음
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('anthropic.com') ||
    url.hostname.includes('exchangerate-api.com') ||
    url.hostname.includes('google.com')
  ) {
    return; // 브라우저 기본 처리
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          // 성공한 응답은 캐시에 저장
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // 오프라인 + 캐시도 없는 경우: index.html 반환
          return caches.match('/index.html');
        });
    })
  );
});
