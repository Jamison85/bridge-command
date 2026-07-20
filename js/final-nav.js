let navSyncQueued = false;

function syncActiveNavState() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    if (button.classList.contains("active")) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function queueNavSync() {
  if (navSyncQueued) return;
  navSyncQueued = true;
  requestAnimationFrame(() => {
    navSyncQueued = false;
    syncActiveNavState();
  });
}

window.addEventListener("storepilot:screen-changed", queueNavSync);
window.addEventListener("storepilot:app-ready", queueNavSync);
queueNavSync();
