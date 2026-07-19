const CACHE_NAME = "store-pilot-command-center-28";
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
  "./css/interruption-timer.css",
  "./css/interruption-timer-mobile.css",
  "./css/start-shift-briefing.css",
  "./css/start-shift-briefing-compact.css",
  "./css/loretta-away-mode.css",
  "./css/landing-coming-up-fix.css",
  "./css/task-completion-fix.css",
  "./css/incident-save-guard.css",
  "./css/proof-of-work-pack.css",
  "./css/backup-restore.css",
  "./css/diagnostics.css",
  "./css/manager-photo-checkin.css",
  "./css/daily-scratchpad.css",
  "./css/morning-manager-guidance.css",
  "./css/delete-custom-task.css",
  "./css/loretta-win.css",
  "./css/notes-screen-controller.css",
  "./js/incident-controller.js",
  "./js/incident-state-model.js",
  "./js/task-action-controller.js",
  "./js/task-action-model.js",
  "./js/main-v8.js",
  "./js/review-layer.js",
  "./js/voice-commands.js",
  "./js/voice-template-aware.js",
  "./js/app-runtime.js",
  "./js/pwa.js",
  "./js/state-polish.js",
  "./js/production-tools.js",
  "./js/final-nav.js",
  "./js/final-task-highlight.js",
  "./js/review-layer-variety.js",
  "./js/runtime-clean-bridge.js",
  "./js/shift-brain.js",
  "./js/task-state-clarity.js",
  "./js/feedback-layer.js",
  "./js/manager-photo-checkin.js",
  "./js/remove-handoff-task.js",
  "./js/shift-command-center.js",
  "./js/delete-custom-task.js",
  "./js/loretta-inbox.js",
  "./js/loretta-ui-fix.js",
  "./js/daily-scratchpad.js",
  "./js/notes-screen-style.js",
  "./js/notes-screen-controller.js",
  "./js/interruption-timer.js",
  "./js/interruption-shift-guard.js",
  "./js/start-shift-briefing.js",
  "./js/morning-manager-guidance.js",
  "./js/loretta-win.js",
  "./js/loretta-away-mode.js",
  "./js/loretta-away-mode-guard.js",
  "./js/proof-of-work-pack.js",
  "./js/backup-restore.js",
  "./js/diagnostics.js",
  "./js/review-template-aware.js",
  "./js/active-task.js",
  "./js/followup-cleanup.js",
  "./js/log-page-css.js",
  "./js/log-page-fixes.js",
  "./js/log-final-polish.js"
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
