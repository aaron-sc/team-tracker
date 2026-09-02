// Formation push notification service worker. Deliberately minimal — this app has no offline
// mode or caching strategy, so the only job here is turning a push message into a notification
// and handling the click.

self.addEventListener("push", (event) => {
  let data = { title: "Formation", body: "" };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // Non-JSON payload — fall back to the default above.
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Formation", {
      body: data.body || "",
      data: { url: data.linkUrl || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
