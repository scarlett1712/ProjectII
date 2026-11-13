// Little Star Service Worker for Background Push Notifications
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for push events from server
self.addEventListener("push", (event) => {
  let data = {
    title: "Little Star Nhắc Nhở ⭐",
    body: "Đã đến giờ uống nước hoặc kiểm tra công việc rồi nè!",
    icon: "/chatbot-star.png",
    badge: "/chatbot-star.png",
    data: { url: "/dashboard" },
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/chatbot-star.png",
    badge: data.badge || "/chatbot-star.png",
    vibrate: [100, 50, 100],
    data: data.data || { url: "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Click notification to open or focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
