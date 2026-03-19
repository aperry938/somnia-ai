// Push Notification Service Worker
// Handles incoming push events and notification click actions.

self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    const title = data.title || 'Somnia';
    const options = {
        body: data.body || '',
        icon: '/logo.png',
        badge: '/favicon.png',
        tag: data.tag || 'somnia-notification',
        data: { url: data.url || '/' },
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
});
