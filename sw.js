const CACHE_NAME = "store-pilot-command-center-5";
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
  "./css/production-tools.css",
  "./css/task-states.css",
  "./css/feedback.css",
  "./css/smart-brain.css",
  "./css/visual-polish.css",
  "./css/shift-command-center.css",
  "./css/loretta-inbox.css",
  "./css/loretta-consistency.css",
  "./css/mobile-density.css",
  "./css/landing-no-scroll.css",
  "./js/main-v8.js",
  "./js/review-layer.js",
  "./js/voice-commands.js",
  "./js/app-runtime.js",
  "./js/shift-command-center.js",
  "./js/loretta-inbox.js",
  "./js/loretta-ui-fix.js",
  "./js/pwa.js"
];

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

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
    fetch(event.request, { cache: "no-store" })
      .then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
