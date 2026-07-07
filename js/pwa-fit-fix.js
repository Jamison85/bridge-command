const PWA_FIT_STYLE = `
html.home-fit .app-shell {
  grid-template-rows: auto auto auto auto 1fr !important;
  align-content: stretch !important;
}

html.home-fit .voice-fab {
  display: none !important;
}

html.home-fit .screen-card {
  height: 100% !important;
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

html.home-fit .screen-content {
  min-height: 0 !important;
  flex: 1 1 auto !important;
  display: flex !important;
}

html.home-fit .task-row {
  flex: 1 1 auto !important;
  width: 100% !important;
  min-height: 0 !important;
  align-content: center !important;
}

html.home-fit .task-actions,
html.home-fit .task-row .action-row {
  align-self: end !important;
}

html.home-fit .hero-card p:not(.eyebrow) {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
  font-size: 0.64rem !important;
  line-height: 1.15 !important;
}

html.context-editing,
html.context-editing body {
  height: auto !important;
  min-height: 100dvh !important;
  overflow: auto !important;
}

html.context-editing .context-engine-card {
  position: relative !important;
  z-index: 30 !important;
}

html.context-editing .context-mode-strip {
  display: flex !important;
  overflow-x: auto !important;
  padding-bottom: 8px !important;
}
`;

let contextDrawerWantedOpen = false;

function installPwaFitStyle() {
  if (document.querySelector("#pwa-fit-fix-style")) return;
  const style = document.createElement("style");
  style.id = "pwa-fit-fix-style";
  style.textContent = PWA_FIT_STYLE;
  document.head.appendChild(style);
}

function stableHeroCopy() {
  const title = document.querySelector("#next-title")?.textContent?.trim() || "";
  const copy = document.querySelector("#next-copy");
  if (!copy) return;
  const wanted = /closing walk|walk and recovery/i.test(title)
    ? "Best next: finish the walk, fix visible issues, document waits."
    : "Best next: handle this focus item, document waits.";
  if (copy.textContent !== wanted) copy.textContent = wanted;
}

function maintainContextDrawer() {
  const drawer = document.querySelector(".context-edit-drawer");
  if (!drawer) return;
  if (contextDrawerWantedOpen && !drawer.open) drawer.open = true;
  document.documentElement.classList.toggle("context-editing", drawer.open || contextDrawerWantedOpen);
  if (drawer.open) document.documentElement.classList.remove("home-fit");
}

function refreshPwaFit() {
  installPwaFitStyle();
  stableHeroCopy();
  maintainContextDrawer();
}

document.addEventListener("click", (event) => {
  const summary = event.target.closest?.(".context-edit-drawer summary");
  if (summary) {
    const drawer = summary.closest(".context-edit-drawer");
    contextDrawerWantedOpen = !drawer?.open;
    setTimeout(refreshPwaFit, 60);
    setTimeout(refreshPwaFit, 240);
    return;
  }

  if (event.target.closest?.("[data-context-mode]")) {
    contextDrawerWantedOpen = false;
    document.documentElement.classList.remove("context-editing");
    setTimeout(refreshPwaFit, 100);
  }
}, true);

document.addEventListener("toggle", (event) => {
  if (event.target?.matches?.(".context-edit-drawer")) {
    contextDrawerWantedOpen = event.target.open;
    refreshPwaFit();
  }
}, true);

const heroObserver = new MutationObserver(stableHeroCopy);
setTimeout(() => {
  const copy = document.querySelector("#next-copy");
  if (copy) heroObserver.observe(copy, { childList: true, characterData: true, subtree: true });
}, 300);

setInterval(refreshPwaFit, 250);
setTimeout(refreshPwaFit, 80);
setTimeout(refreshPwaFit, 500);
