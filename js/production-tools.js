const PROD_KEYS = {
  completed: "storePilot.completed.v6",
  notes: "storePilot.notes.v6",
  reports: "storePilot.reports.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7",
  active: "storePilot.activeTask.v8",
  handoffPrefs: "storePilot.handoffPrefs.v10",
  installHint: "storePilot.installHintSeen.v1"
};

function prodRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function prodWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function prodDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function prodShift() {
  return prodRead(PROD_KEYS.shift, "morning");
}

function prodShiftKey(shift = prodShift(), date = new Date()) {
  return `${prodDateKey(date)}:${shift}`;
}

function setProdStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  clearTimeout(setProdStatus.timer);
  setProdStatus.timer = setTimeout(() => { status.textContent = "Ready"; }, 1800);
}

function getTodayShiftKeys() {
  const today = prodDateKey();
  return ["morning", "mid", "close"].map((shift) => `${today}:${shift}`);
}

function clearObjectKeys(storageKey, keysToClear) {
  const data = prodRead(storageKey, {});
  keysToClear.forEach((key) => delete data[key]);
  prodWrite(storageKey, data);
}

function resetCurrentShift() {
  const key = prodShiftKey();
  clearObjectKeys(PROD_KEYS.completed, [key]);
  clearObjectKeys(PROD_KEYS.customTasks, [key]);
  clearObjectKeys(PROD_KEYS.taskStates, [key]);
  localStorage.removeItem(PROD_KEYS.active);
  setProdStatus("Shift reset");
  document.querySelector('[data-screen="next"]')?.click();
}

function resetToday() {
  const keys = getTodayShiftKeys();
  clearObjectKeys(PROD_KEYS.completed, keys);
  clearObjectKeys(PROD_KEYS.customTasks, keys);
  clearObjectKeys(PROD_KEYS.taskStates, keys);
  localStorage.removeItem(PROD_KEYS.active);
  setProdStatus("Today reset");
  document.querySelector('[data-screen="next"]')?.click();
}

function resetTemplates() {
  if (!confirm("Reset Morning, Mid, and Close templates back to defaults?")) return;
  localStorage.removeItem(PROD_KEYS.templates);
  setProdStatus("Templates reset");
  location.reload();
}

function clearInstallHint() {
  localStorage.removeItem(PROD_KEYS.installHint);
  setProdStatus("Install hint reset");
}

function qaChecks() {
  const checks = [
    ["App shell", Boolean(document.querySelector(".app-shell"))],
    ["Four core screens", document.querySelectorAll(".nav-button").length === 4],
    ["Shift buttons", document.querySelectorAll(".shift-button").length === 3],
    ["Focused runtime", window.StorePilotRuntime?.productMode === "focused-core"],
    ["Quick capture", Boolean(window.StorePilotLorettaInbox || document.querySelector("#loretta-capture-sheet"))],
    ["Templates saved", Boolean(localStorage.getItem(PROD_KEYS.templates))],
    ["PWA manifest", Boolean(document.querySelector('link[rel="manifest"]'))],
    ["Service worker", "serviceWorker" in navigator]
  ];
  return checks;
}

function runQA() {
  const checks = qaChecks();
  const passed = checks.filter(([, ok]) => ok).length;
  setProdStatus(`${passed}/${checks.length} checks`);
  renderProductionTools(true);
}

function renderProductionTools(force = false) {
  const title = document.querySelector("#screen-title")?.textContent || "";
  const content = document.querySelector("#screen-content");
  if (!content || !title.toLowerCase().includes("templates")) return;
  if (!force && document.querySelector(".production-tools-card")) return;

  document.querySelector(".production-tools-card")?.remove();
  const checks = qaChecks();
  const passed = checks.filter(([, ok]) => ok).length;
  const card = document.createElement("article");
  card.className = "production-tools-card";
  card.innerHTML = `
    <div class="screen-header">
      <div>
        <p class="eyebrow">MAINTENANCE</p>
        <h3>Reset and app checks</h3>
      </div>
      <span class="badge">${passed}/${checks.length}</span>
    </div>
    <p class="helper-text">These controls stay in Settings so the daily shift screens remain focused.</p>
    <div class="qa-list">
      ${checks.map(([label, ok]) => `<div class="qa-row ${ok ? "pass" : "fail"}"><span>${ok ? "✓" : "!"}</span><strong>${label}</strong></div>`).join("")}
    </div>
    <div class="prod-tool-grid">
      <button class="secondary-action" type="button" data-prod-tool="qa">Run checks</button>
      <button class="secondary-action" type="button" data-prod-tool="shift">Reset Shift</button>
      <button class="secondary-action" type="button" data-prod-tool="today">Reset Today</button>
      <button class="secondary-action" type="button" data-prod-tool="install">Reset Install Hint</button>
      <button class="secondary-action danger" type="button" data-prod-tool="templates">Reset Templates</button>
    </div>`;
  content.appendChild(card);
}

document.addEventListener("click", (event) => {
  const action = event.target.closest("[data-prod-tool]")?.dataset.prodTool;
  if (action) {
    event.preventDefault();
    event.stopPropagation();
    if (action === "qa") runQA();
    if (action === "shift" && confirm("Reset only the current shift progress and added tasks?")) resetCurrentShift();
    if (action === "today" && confirm("Reset all Morning, Mid, and Close progress for today?")) resetToday();
    if (action === "install") clearInstallHint();
    if (action === "templates") resetTemplates();
    return;
  }
  setTimeout(renderProductionTools, 80);
}, true);

document.addEventListener("change", () => setTimeout(renderProductionTools, 80));
setInterval(renderProductionTools, 1200);
setTimeout(renderProductionTools, 250);