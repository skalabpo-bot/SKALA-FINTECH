// Service Worker — Push Notifications para Skala Fintech

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Recibir push y mostrar notificación nativa
self.addEventListener('push', (event) => {
  let data = { title: 'Skala', body: 'Tienes una nueva notificación', icon: '/skala.png' };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/skala.png',
    badge: '/skala.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'skala-notification',
    renotify: true,
    data: {
      url: data.url || '/',
      creditId: data.creditId || null,
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click en notificación → abrir la app en la URL correspondiente
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Si ya hay una pestaña abierta, enfocarla y navegar
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url: targetUrl });
          return;
        }
      }
      // Si no hay pestaña abierta, abrir una nueva
      return self.clients.openWindow(targetUrl);
    })
  );
});
