/* GezGelir Service Worker — Web Push */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "GezGelir", body: "", icon: "bell" };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }
  const options = {
    body: data.body || "",
    icon: "/app_icon.png",
    badge: "/app_icon.png",
    vibrate: [60, 40, 60],
    tag: data.tag || "gezgelir",
    data: { url: "/" },
  };
  event.waitUntil(self.registration.showNotification(data.title || "GezGelir", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});
