const CACHE_NAME = 'fitpro-v1';
const STATIC_ASSETS = ['/', '/dashboard', '/workouts', '/diets', '/students', '/exercises', '/progress'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Nunca cachear APIs (dados sensiveis/pessoais ficam fora do cache do SW).
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // So cacheia respostas validas e do mesmo orgom.
        if (response.ok || response.type === 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'FitPro', body: 'Novo aviso', url: '/dashboard' };
  try {
    if (event.data) data = Object.assign(data, event.data.json());
  } catch (e) {
    /* payload invalido */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const given = (event.notification.data && event.notification.data.url) || '/dashboard';
  // So navega para URLs do proprio site (evita open-redirect via payload).
  let url = given;
  try {
    if (typeof given === 'string' && !given.startsWith('//')) {
      const parsed = new URL(given, self.location.origin);
      url = parsed.origin === self.location.origin ? parsed.href : '/dashboard';
    } else {
      url = '/dashboard';
    }
  } catch (e) {
    url = '/dashboard';
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('navigate' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});