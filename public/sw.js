// Service worker del panel: muestra las notificaciones push y, al tocarlas,
// abre (o enfoca) el panel en la página del aviso.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let aviso = { titulo: "Nueva Isapre", cuerpo: "", url: "/admin/pipeline" };
  try {
    aviso = { ...aviso, ...event.data.json() };
  } catch (_) {
    if (event.data) aviso.cuerpo = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(aviso.titulo, {
      body: aviso.cuerpo,
      icon: "/icon",
      badge: "/icon",
      tag: aviso.tag,
      data: { url: aviso.url || "/admin/pipeline" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/admin/pipeline", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if (v.url.startsWith(self.location.origin) && "focus" in v) {
          v.navigate(url);
          return v.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
