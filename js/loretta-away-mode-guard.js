let lorettaAwayHostObserver = null;
let lorettaAwayHostQueued = false;

function ensureLorettaAwayHost() {
  const screen = document.querySelector("#loretta-notes-screen");
  const actions = screen?.querySelector(".loretta-screen-actions");
  if (!screen || !actions) return;

  let host = [...screen.children].find((child) => child.classList?.contains("loretta-away-panel-holder"));
  if (!host) {
    host = document.createElement("div");
    host.className = "loretta-away-panel-holder";
    actions.insertAdjacentElement("afterend", host);
  }
  host.dataset.awayPanel = "host";
  host.dataset.awayPanelHost = "true";
}

function queueLorettaAwayHost() {
  if (lorettaAwayHostQueued) return;
  lorettaAwayHostQueued = true;
  requestAnimationFrame(() => {
    lorettaAwayHostQueued = false;
    ensureLorettaAwayHost();
  });
}

function observeLorettaAwayHost() {
  if (lorettaAwayHostObserver) return;
  lorettaAwayHostObserver = new MutationObserver(queueLorettaAwayHost);
  lorettaAwayHostObserver.observe(document.body, { childList: true, subtree: true });
}

setTimeout(() => {
  ensureLorettaAwayHost();
  observeLorettaAwayHost();
}, 280);
