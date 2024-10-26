self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
});

self.addEventListener('push', (event) => {
  console.log('Push message received:', event);
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2'
      }
    };
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('message', (event) => {
  console.log('Message received in SW:', event.data);
  if (event.data && event.data.type === 'PUSH') {
    const data = JSON.parse(event.data.payload);
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.png'
    });
  }
});