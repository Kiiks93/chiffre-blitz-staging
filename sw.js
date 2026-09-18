const CACHE = "chiffre-blitz-v4"; // ⬅️ incrémente (v4, v5…) à chaque grosse mise à jour

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const isCode = url.pathname.endsWith(".js") || url.pathname.endsWith(".html") || url.pathname === "/";

  if (isCode) {
    // NETWORK-FIRST : toujours la version fraîche du serveur
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // CACHE-FIRST pour le reste (images, sons…)
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
