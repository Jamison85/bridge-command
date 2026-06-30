const CACHE_NAME = "store-pilot-pwa-state-20";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/store-pilot-icon.svg",
  "./css/style.css",
  "./css/handoff.css",
  "./css/followups.css",
  "./css/review.css",
  "./css/templates.css",
  "./css/polish.css",
  "./css/manager-mode.css",
  "./css/pwa.css",
  "./js/main-v7.js",
  "./js/review-layer.js",
  "./js/review-template-aware.js",
  "./js/voice-commands.js",
  "./js/voice-template-aware.js",
  "./js/active-task.js",
  "./js/followup-cleanup.js",
  "./js/state-polish.js",
  "./js/pwa.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
