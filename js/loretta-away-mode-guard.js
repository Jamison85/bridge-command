const NativeMutationObserver = window.MutationObserver;

function mutationIsInsideAwaySheet(record) {
  const node = record?.target;
  const element = node instanceof Element ? node : node?.parentElement;
  return Boolean(element?.closest?.("#loretta-away-sheet"));
}

if (NativeMutationObserver && !window.__storePilotAwayMutationFilter) {
  window.__storePilotAwayMutationFilter = true;
  window.MutationObserver = class StorePilotMutationObserver extends NativeMutationObserver {
    constructor(callback) {
      super((records, observer) => {
        const relevant = records.filter((record) => !mutationIsInsideAwaySheet(record));
        if (relevant.length) callback(relevant, observer);
      });
    }
  };
}

let lorettaAwayHostObserver = null;
let lorettaAwayHostQueued = false;

function readAwayGuardJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

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

function reconcileArchivedLorettaNotes() {
  const store = readAwayGuardJSON("storePilot.lorettaAway.v1", { periods: [] });
  const period = (store.periods || []).find((item) => item.status === "active");
  if (!period?.noteStates) return;
  const notes = new Map(readAwayGuardJSON("storePilot.lorettaNotes.v1", []).map((note) => [note.id, note]));
  let changed = false;

  Object.entries(period.noteStates).forEach(([noteId, state]) => {
    if (notes.get(noteId)?.status !== "archived" || state.status === "done") return;
    period.noteStates[noteId] = { ...state, status: "done", updatedAt: new Date().toISOString() };
    changed = true;
  });

  if (changed) {
    localStorage.setItem("storePilot.lorettaAway.v1", JSON.stringify(store));
    window.dispatchEvent(new CustomEvent("storepilot:loretta-away-changed"));
  }
}

function correctNeedsLorettaMetric() {
  const store = readAwayGuardJSON("storePilot.lorettaAway.v1", { periods: [] });
  const period = (store.periods || []).find((item) => item.status === "active");
  if (!period?.noteStates) return;
  const unresolved = Object.values(period.noteStates)
    .filter((state) => state.lane === "approval" && state.status !== "done")
    .length;
  const metric = document.querySelector(".loretta-away-panel.active .loretta-away-metrics span:last-child b");
  if (metric && metric.textContent !== String(unresolved)) metric.textContent = String(unresolved);
}

function queueLorettaAwayHost() {
  if (lorettaAwayHostQueued) return;
  lorettaAwayHostQueued = true;
  requestAnimationFrame(() => {
    lorettaAwayHostQueued = false;
    ensureLorettaAwayHost();
    reconcileArchivedLorettaNotes();
    correctNeedsLorettaMetric();
  });
}

function observeLorettaAwayHost() {
  if (lorettaAwayHostObserver) return;
  lorettaAwayHostObserver = new MutationObserver(queueLorettaAwayHost);
  lorettaAwayHostObserver.observe(document.body, { childList: true, subtree: true });
}

window.addEventListener("storepilot:loretta-away-changed", queueLorettaAwayHost);
setTimeout(() => {
  ensureLorettaAwayHost();
  reconcileArchivedLorettaNotes();
  observeLorettaAwayHost();
  correctNeedsLorettaMetric();
}, 280);
