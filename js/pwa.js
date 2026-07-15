const installHintKey = "storePilot.installHintSeen.v1";
const reloadGuardKey = "storePilot.pwaReloaded.command-center-19";
let deferredInstallPrompt = null;
let refreshingForUpdate = false;

function setStandaloneClass() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  document.documentElement.classList.toggle("is-standalone", standalone);
}

function setPwaStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallHint();
});

function showInstallHint() {
  if (localStorage.getItem(installHintKey) === "yes" || document.querySelector(".install-hint")) return;
  const hint = document.createElement("button");
  hint.className = "install-hint";
  hint.type = "button";
  hint.textContent = "Install App";
  hint.addEventListener("click", async () => {
    localStorage.setItem(installHintKey, "yes");
    hint.remove();
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
  });
  document.body.appendChild(hint);
  setTimeout(() => hint.classList.add("ready"), 50);
}

function activateWaitingWorker(registration) {
  if (!registration.waiting) return;
  setPwaStatus("Updating app");
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
}

async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register("./sw.js?v=command-center-19", { updateViaCache: "none" });
    await registration.update();
    activateWaitingWorker(registration);

    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) activateWaitingWorker(registration);
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshingForUpdate) return;
      refreshingForUpdate = true;
      if (sessionStorage.getItem(reloadGuardKey) === "yes") {
        setPwaStatus("App updated");
        return;
      }
      sessionStorage.setItem(reloadGuardKey, "yes");
      location.reload();
    });
  } catch {
    setPwaStatus("Offline mode unavailable");
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", registerServiceWorker);
}

setStandaloneClass();
window.matchMedia("(display-mode: standalone)").addEventListener?.("change", setStandaloneClass);