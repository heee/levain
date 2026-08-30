// Levain — offline cache. Bump CACHE_NAME on every shipped change so
// clients pick up new files instead of serving stale ones forever.
const CACHE_NAME = "levain-v38";
const CORE = [
  "./",
  "./index.html",
  "./config.js",
  "./style.css",
  "./app.js",
  "./storage.js",
  "./api.js",
  "./sync.js",
  "./manifest.json",
  "./screens/shared-ui.js",
  "./screens/photo-crop.js",
  "./screens/welcome.js",
  "./screens/now.js",
  "./screens/bakes.js",
  "./screens/recipes.js",
  "./screens/starter.js",
  "./screens/starter-vm.js",
  "./screens/log.js",
  "./screens/shared-view.js",
  "./screens/tablet.js",
  "./game/methods.js",
  "./game/schedule.js",
  "./game/bakes.js",
  "./game/advice.js",
  "./game/seed-data.js",
  "./game/ownership.js",
  "./game/ids.js",
  "./game/merge.js",
  "./assets/loaf.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // never intercept the Worker API or fonts
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((res) => {
        if (res.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
