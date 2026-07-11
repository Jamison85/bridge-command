const INTERRUPTION_KEY = "storePilot.interruptions.v1";
const SHIFT_KEY = "storePilot.shift.v6";
const INTERRUPTION_TYPES = [
  "Register coverage",
  "Customer rush",
  "Staff callout",
  "Delivery / vendor",
  "Phone / tech support",
  "Manager request",
  "Other"
];

let interruptionTick = null;
let interruptionObserver = null;

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentShift() {
  const saved = readJSON(SHIFT_KEY, "morning");
  return ["morning", "mid", "close"].includes(saved) ? saved : "morning";
}

function currentShiftKey() {
  return `${dateKey()}:${currentShift()}`;
}

function allInterruptions() {
  return readJSON(INTERRUPTION_KEY, []);
}

function saveInterruptions(items) {
  writeJSON(INTERRUPTION_KEY, items.slice(0, 200));
  window.dispatchEvent(new CustomEvent("storepilot:interruptions-changed", { detail: { shiftKey: currentShiftKey() } }));
}

function activeInterruption() {
  return allInterruptions().find((item) => item.shiftKey === currentShiftKey() && item.status === "active") || null;
}

function todaysInterruptions() {
  return allInterruptions().filter((item) => item.shiftKey === currentShiftKey());
}

function currentTask() {
  try {
    return window.StorePilotCommandCenter?.analyze?.().next || null;
  } catch {
    return null;
  }
}

function elapsedMs(item, now = Date.now()) {
  if (!item?.startedAt) return 0;
  const end = item.endedAt ? new Date(item.endedAt).getTime() : now;
  return Math.max(0, end - new Date(item.startedAt).getTime());
}

function formatClock(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatMinutes(ms) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  return `${minutes} min`;
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function setStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => { status.textContent = "Ready"; }, 2200);
}

function ensureInterruptionSheet() {
  let sheet = document.querySelector("#interruption-sheet");
  if (sheet) return sheet;

  sheet = document.createElement("section");
  sheet.id = "interruption-sheet";
  sheet.className = "interruption-sheet";
  sheet.setAttribute("aria-hidden", "true");
  sheet.innerHTML = `<div class="interruption-card" role="dialog" aria-modal="true" aria-labelledby="interruption-title"></div>`;
  sheet.addEventListener("click", (event) => {
    if (event.target === sheet || event.target.closest("[data-interruption-close]")) closeInterruptionSheet();
  });
  document.body.appendChild(sheet);
  return sheet;
}

function historyHTML() {
  const items = todaysInterruptions();
  const completed = items.filter((item) => item.status === "ended");
  const totalMs = completed.reduce((sum, item) => sum + elapsedMs(item), 0);

  if (!items.length) {
    return `<section class="interruption-history"><div class="interruption-history-head"><strong>Today</strong><span>No interruptions logged</span></div></section>`;
  }

  return `
    <section class="interruption-history">
      <div class="interruption-history-head">
        <strong>Today</strong>
        <span>${completed.length} logged · ${completed.length ? formatMinutes(totalMs) : "0 min"}</span>
      </div>
      <div class="interruption-history-list">
        ${items.slice(0, 6).map((item) => `
          <article class="interruption-history-row ${item.status === "active" ? "active" : ""}">
            <div>
              <strong>${escapeHTML(item.type)}</strong>
              <span>${formatTime(item.startedAt)}${item.endedAt ? `–${formatTime(item.endedAt)}` : " · active"}</span>
            </div>
            <b>${item.status === "active" ? formatClock(elapsedMs(item)) : formatMinutes(elapsedMs(item))}</b>
          </article>`).join("")}
      </div>
    </section>`;
}

function renderStartView(card) {
  const task = currentTask();
  card.innerHTML = `
    <div class="interruption-head">
      <div><p>SHIFT INTERRUPTION</p><h2 id="interruption-title">What pulled you away?</h2></div>
      <button type="button" data-interruption-close aria-label="Close">Close</button>
    </div>
    <p class="interruption-helper">The timer records the lost time and remembers what you were doing.</p>
    <form id="interruption-start-form" class="interruption-form">
      <label>Reason
        <select name="type">
          ${INTERRUPTION_TYPES.map((type) => `<option>${escapeHTML(type)}</option>`).join("")}
        </select>
      </label>
      <label>Quick note <span>optional</span>
        <textarea name="note" rows="2" placeholder="Register line, vendor arrived, Loretta called, system issue..."></textarea>
      </label>
      <div class="interruption-paused-task">
        <span>Current task</span>
        <strong>${escapeHTML(task?.title || "No active task")}</strong>
      </div>
      <button class="interruption-start-button" type="submit">Start interruption</button>
    </form>
    ${historyHTML()}`;

  card.querySelector("#interruption-start-form")?.addEventListener("submit", startInterruption);
}

function renderActiveView(card, active) {
  card.innerHTML = `
    <div class="interruption-head">
      <div><p>INTERRUPTION ACTIVE</p><h2 id="interruption-title">${escapeHTML(active.type)}</h2></div>
      <button type="button" data-interruption-close aria-label="Close">Close</button>
    </div>
    <div class="interruption-live">
      <span id="interruption-live-time">${formatClock(elapsedMs(active))}</span>
      <small>Started ${formatTime(active.startedAt)}</small>
    </div>
    ${active.note ? `<p class="interruption-active-note">${escapeHTML(active.note)}</p>` : ""}
    <div class="interruption-paused-task active">
      <span>Paused task</span>
      <strong>${escapeHTML(active.pausedTaskTitle || "Shift plan")}</strong>
    </div>
    <button class="interruption-end-button" type="button" data-interruption-end>End interruption</button>
    ${historyHTML()}`;

  card.querySelector("[data-interruption-end]")?.addEventListener("click", endInterruption);
}

function renderInterruptionSheet() {
  const sheet = ensureInterruptionSheet();
  const card = sheet.querySelector(".interruption-card");
  const active = activeInterruption();
  if (active) renderActiveView(card, active);
  else renderStartView(card);
  updateLiveUI();
}

function openInterruptionSheet() {
  const sheet = ensureInterruptionSheet();
  renderInterruptionSheet();
  sheet.classList.add("open");
  sheet.setAttribute("aria-hidden", "false");
  document.body.classList.add("interruption-sheet-open");
}

function closeInterruptionSheet() {
  const sheet = document.querySelector("#interruption-sheet");
  sheet?.classList.remove("open");
  sheet?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("interruption-sheet-open");
}

function startInterruption(event) {
  event.preventDefault();
  if (activeInterruption()) {
    renderInterruptionSheet();
    return;
  }

  const values = new FormData(event.currentTarget);
  const task = currentTask();
  const item = {
    id: `interruption-${Date.now()}`,
    shiftKey: currentShiftKey(),
    shift: currentShift(),
    type: String(values.get("type") || "Other"),
    note: String(values.get("note") || "").trim(),
    status: "active",
    startedAt: new Date().toISOString(),
    endedAt: "",
    pausedTaskId: task?.id || "",
    pausedTaskTitle: task?.title || "",
    createdAt: new Date().toISOString()
  };

  saveInterruptions([item, ...allInterruptions()]);
  closeInterruptionSheet();
  setStatus("Interruption timer started");
  renderContextAction();
  updateLiveUI();
}

function endInterruption() {
  const active = activeInterruption();
  if (!active) return;
  const endedAt = new Date().toISOString();
  const items = allInterruptions().map((item) => item.id === active.id
    ? { ...item, status: "ended", endedAt, durationMs: elapsedMs({ ...item, endedAt }) }
    : item);
  saveInterruptions(items);
  closeInterruptionSheet();
  setStatus(`Interruption ended · ${formatMinutes(elapsedMs({ ...active, endedAt }))}`);
  renderContextAction();
  showResumeBanner({ ...active, endedAt });
  window.StorePilotCommandCenter?.render?.();
}

function navigateToPausedTask(item) {
  document.querySelector('[data-screen="tasks"]')?.click();
  setTimeout(() => {
    const taskButton = item.pausedTaskId ? document.querySelector(`[data-task="${CSS.escape(item.pausedTaskId)}"]`) : null;
    taskButton?.closest("article")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 220);
}

function showResumeBanner(item) {
  document.querySelector("#interruption-resume-banner")?.remove();
  const banner = document.createElement("aside");
  banner.id = "interruption-resume-banner";
  banner.className = "interruption-resume-banner";
  banner.innerHTML = `
    <div><span>Back to the shift</span><strong>${escapeHTML(item.pausedTaskTitle || "Recheck the next priority")}</strong></div>
    <div class="interruption-resume-actions">
      ${item.pausedTaskId ? `<button type="button" data-resume-task>Resume task</button>` : ""}
      <button type="button" data-replan-shift>Replan</button>
    </div>`;
  banner.querySelector("[data-resume-task]")?.addEventListener("click", () => {
    banner.remove();
    navigateToPausedTask(item);
  });
  banner.querySelector("[data-replan-shift]")?.addEventListener("click", () => {
    banner.remove();
    window.StorePilotCommandCenter?.render?.();
    document.querySelector('[data-screen="next"]')?.click();
  });
  document.body.appendChild(banner);
  setTimeout(() => banner.classList.add("ready"), 20);
  setTimeout(() => banner.remove(), 12000);
}

function renderContextAction() {
  const summary = document.querySelector(".command-context-summary");
  const edit = summary?.querySelector(".command-context-edit");
  if (!summary || !edit) return;

  let actions = summary.querySelector(".command-context-actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.className = "command-context-actions";
    edit.replaceWith(actions);
    actions.appendChild(edit);
  }

  let button = actions.querySelector("[data-interruption-open]");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.dataset.interruptionOpen = "true";
    button.addEventListener("click", openInterruptionSheet);
    actions.insertBefore(button, edit);
  }

  const active = activeInterruption();
  button.className = `interruption-context-button${active ? " active" : ""}`;
  button.textContent = active ? `End ${formatClock(elapsedMs(active))}` : "Pulled away";
  button.setAttribute("aria-label", active ? `Interruption active for ${formatClock(elapsedMs(active))}` : "Start an interruption timer");
}

function updateLiveUI() {
  const active = activeInterruption();
  const live = document.querySelector("#interruption-live-time");
  if (live && active) live.textContent = formatClock(elapsedMs(active));
  renderContextAction();
}

function observeContextCard() {
  if (interruptionObserver) return;
  interruptionObserver = new MutationObserver(() => renderContextAction());
  interruptionObserver.observe(document.body, { childList: true, subtree: true });
}

function initInterruptionTimer() {
  ensureInterruptionSheet();
  observeContextCard();
  renderContextAction();
  clearInterval(interruptionTick);
  interruptionTick = setInterval(updateLiveUI, 1000);
}

window.StorePilotInterruptions = {
  getAll: allInterruptions,
  getToday: todaysInterruptions,
  getActive: activeInterruption,
  open: openInterruptionSheet
};

window.addEventListener("storage", updateLiveUI);
window.addEventListener("focus", updateLiveUI);
document.addEventListener("visibilitychange", () => { if (!document.hidden) updateLiveUI(); });
setTimeout(initInterruptionTimer, 260);
