// Tebille — service worker: guarda la app para que abra sin internet.
// Al cambiar cualquier archivo de la app, sube VERSION para que los teléfonos descarguen la nueva.
const VERSION = "mis-gastos-v30";
const APP = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/atajo-gasto.png",
  "icons/atajo-ingreso.png"
];
const FONTS = "mis-gastos-fonts";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fuentes de Google y librerías de Firebase (versión fija): guardar la primera vez y usar la copia después
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com" ||
      (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/"))) {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); c.put(req, res.clone()); return res; }
      catch { return new Response("", { status: 504 }); }
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // Página: primero la red (para recibir actualizaciones), si no hay internet la copia guardada
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put("index.html", copy));
        return res;
      }).catch(() => caches.match("index.html"))
    );
    return;
  }

  // Resto de archivos de la app: copia guardada primero
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
