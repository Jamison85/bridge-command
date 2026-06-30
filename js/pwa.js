import "./state-polish.js";

const installHintKey = "storePilot.installHintSeen.v1";
let deferredInstallPrompt = null;

function setStandaloneClass() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  document.documentElement.classList.toggle("is-standalone", standalone);
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallHint();
});

function showInstallHint() {
  if (localStorage.getItem(installHintKey) === "yes") return;
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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

setStandaloneClass();
window.matchMedia("(display-mode: standalone)").addEventListener?.("change", setStandaloneClass);
