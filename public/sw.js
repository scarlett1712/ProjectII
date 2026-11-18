// Little Star Service Worker for Background Push Notifications & Offline Caching
const CACHE_NAME = "little-star-static-v1";
const STATIC_ASSETS = [
  "/chatbot-star.png",
  "/bg-stars.png",
  "/icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Cache-First / Stale-While-Revalidate for static assets, Network-First for navigation
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Never cache API calls or NextAuth routes
  if (url.pathname.startsWith("/api/")) return;

  // Navigation requests: Network-First with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return caches.match("/dashboard").then((dash) => dash || Response.error());
        });
      })
    );
    return;
  }

  // Static assets (images, icons, fonts, CSS/JS chunks): Stale-While-Revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
  }
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
    } catch {
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
