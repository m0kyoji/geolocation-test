// public/sw.js
self.addEventListener('push', function(event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon.png', // アプリのアイコンパスを指定
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    }
  };
  event.waitUntil(
      self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'PUSH') {
    const data = JSON.parse(event.data.payload);
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.png'
    });
  }
});