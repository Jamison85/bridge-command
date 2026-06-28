const ACTIVE_KEYS = {
  completed: "storePilot.completed.v6",
  notes: "storePilot.notes.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7",
  active: "storePilot.activeTask.v8"
};

const ACTIVE_SHIFT_ORDER = ["morning", "mid", "close"];
const ACTIVE_SHIFT_LABEL = { morning: "Morning", mid: "Mid", close: "Close" };
let activeTimer = null;

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function removeKey(key) {
  localStorage.removeItem(key);
}

function currentShift() {
  return readJSON(ACTIVE_KEYS.shift, "morning");
}

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftKey(shift = currentShift(), date = new Date()) {
  return `${dateKey(date)}:${shift}`;
}

function tasks() {
  const templates = readJSON(ACTIVE_KEYS.templates, {});
  const custom = readJSON(ACTIVE_KEYS.customTasks, {})[shiftKey()] || [];
  return [...(templates[currentShift()] || []), ...custom].sort((a, b) => (a.priority || 99) - (b.priority || 99));
}

function completedIds() {
  return readJSON(ACTIVE_KEYS.completed, {})[shiftKey()] || [];
}

function states() {
  return readJSON(ACTIVE_KEYS.taskStates, {})[shiftKey()] || {};
}

function nextTask() {
  const done = new Set(completedIds());
  const stateMap = states();
  const open = tasks().filter((task) => !done.has(task.id));
  return open.find((task) => !stateMap[task.id]) || open[0] || null;
}

function getTaskById(id) {
  return tasks().find((task) => task.id === id) || null;
}

function setCompleted(ids) {
  const all = readJSON(ACTIVE_KEYS.completed, {});
  all[shiftKey()] = [...new Set(ids)];
  writeJSON(ACTIVE_KEYS.completed, all);
}

function setState(taskId, state) {
  const all = readJSON(ACTIVE_KEYS.taskStates, {});
  all[shiftKey()] = { ...(all[shiftKey()] || {}), [taskId]: { ...state, updatedAt: new Date().toISOString() } };
  writeJSON(ACTIVE_KEYS.taskStates, all);
}

function clearState(taskId) {
  const all = readJSON(ACTIVE_KEYS.taskStates, {});
  const map = { ...(all[shiftKey()] || {}) };
  delete map[taskId];
  all[shiftKey()] = map;
  writeJSON(ACTIVE_KEYS.taskStates, all);
}

function addCustomTask(title, area = "Carry Forward", key = shiftKey()) {
  const all = readJSON(ACTIVE_KEYS.customTasks, {});
  const list = all[key] || [];
  all[key] = [...list, {
    id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    area,
    minutes: 8,
    priority: 40 + list.length,
    detail: "Created from active task mode."
  }];
  writeJSON(ACTIVE_KEYS.customTasks, all);
}

function addNote(text) {
  const clean = String(text || "").trim();
  if (!clean) return;
  const notes = readJSON(ACTIVE_KEYS.notes, []);
  notes.push(`${new Date().toLocaleString()} (${ACTIVE_SHIFT_LABEL[currentShift()]})\n${clean}`);
  writeJSON(ACTIVE_KEYS.notes, notes.slice(-50));
}

function carryKey(destination = "next shift") {
  const normalized = String(destination).toLowerCase();
  const today = new Date();
  if (normalized.includes("tomorrow")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return shiftKey("morning", tomorrow);
  }
  if (normalized.includes("morning")) return shiftKey("morning", today);
  if (normalized.includes("mid")) return shiftKey("mid", today);
  if (normalized.includes("close") || normalized.includes("closing")) return shiftKey("close", today);
  const index = ACTIVE_SHIFT_ORDER.indexOf(currentShift());
  const next = ACTIVE_SHIFT_ORDER[index + 1] || "morning";
  const target = new Date(today);
  if (!ACTIVE_SHIFT_ORDER[index + 1]) target.setDate(today.getDate() + 1);
  return shiftKey(next, target);
}

function activeTask() {
  return readJSON(ACTIVE_KEYS.active, null);
}

function setActive(task) {
  writeJSON(ACTIVE_KEYS.active, task);
}

function clearActive() {
  removeKey(ACTIVE_KEYS.active);
  stopTimer();
}

function startActiveTask(task) {
  const active = {
    id: task.id,
    title: task.title,
    area: task.area,
    minutes: task.minutes || 10,
    detail: task.detail || "Focus on this task until it is done, delayed, or carried forward.",
    shift: currentShift(),
    startedAt: Date.now(),
    pausedAt: null,
    pausedTotal: 0,
    status: "running"
  };
  setActive(active);
  renderActiveMode();
}

function elapsed(active = activeTask()) {
  if (!active) return 0;
  const now = active.status === "paused" && active.pausedAt ? active.pausedAt : Date.now();
  return Math.max(0, now - active.startedAt - (active.pausedTotal || 0));
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function stopTimer() {
  if (activeTimer) clearInterval(activeTimer);
  activeTimer = null;
}

function tickTimer() {
  const timer = document.querySelector("#active-task-timer");
  const active = activeTask();
  if (timer && active) timer.textContent = formatTime(elapsed(active));
}

function renderActiveMode() {
  const active = activeTask();
  const content = document.querySelector("#screen-content");
  const eyebrow = document.querySelector("#screen-eyebrow");
  const title = document.querySelector("#screen-title");
  if (!active || !content || !eyebrow || !title) return;

  eyebrow.textContent = "Focus";
  title.textContent = "Active Task";
  content.innerHTML = `
    <article class="active-task-card">
      <div class="active-task-topline">
        <span class="badge">${escapeHTML(active.area || "Task")}</span>
        <span class="active-task-status">${active.status === "paused" ? "Paused" : "Running"}</span>
      </div>
      <h3>${escapeHTML(active.title)}</h3>
      <p>${escapeHTML(active.detail || "Work this task, then choose what happened.")}</p>
      <div class="active-timer" id="active-task-timer">${formatTime(elapsed(active))}</div>
      <div class="active-task-actions">
        <button class="primary-action" id="active-done" type="button">Done</button>
        <button class="secondary-action" id="active-pause" type="button">${active.status === "paused" ? "Resume" : "Pause"}</button>
        <button class="secondary-action" id="active-delay" type="button">Delay</button>
        <button class="secondary-action" id="active-carry" type="button">Carry</button>
        <button class="secondary-action" id="active-note" type="button">Add Note</button>
        <button class="secondary-action" id="active-exit" type="button">Exit Focus</button>
      </div>
    </article>`;

  document.querySelector("#active-done")?.addEventListener("click", completeActive);
  document.querySelector("#active-pause")?.addEventListener("click", togglePause);
  document.querySelector("#active-delay")?.addEventListener("click", delayActive);
  document.querySelector("#active-carry")?.addEventListener("click", carryActive);
  document.querySelector("#active-note")?.addEventListener("click", noteActive);
  document.querySelector("#active-exit")?.addEventListener("click", () => refreshMain("next"));

  stopTimer();
  activeTimer = setInterval(tickTimer, 1000);
}

function completeActive() {
  const active = activeTask();
  if (!active) return;
  clearState(active.id);
  setCompleted([...completedIds(), active.id]);
  addNote(`Completed: ${active.title}. Time focused: ${formatTime(elapsed(active))}.`);
  clearActive();
  setStatus("Task completed");
  refreshMain("tasks");
}

function togglePause() {
  const active = activeTask();
  if (!active) return;
  if (active.status === "paused") {
    const pausedTotal = (active.pausedTotal || 0) + (Date.now() - (active.pausedAt || Date.now()));
    setActive({ ...active, pausedAt: null, pausedTotal, status: "running" });
  } else {
    setActive({ ...active, pausedAt: Date.now(), status: "paused" });
  }
  renderActiveMode();
}

function delayActive() {
  const active = activeTask();
  if (!active) return;
  const reason = prompt("Why is this delayed?", "Customer volume / register coverage / short staffing / time constraint") || "Reason noted";
  setState(active.id, { type: "delayed", reason });
  addNote(`Delayed: ${active.title}. Reason: ${reason}. Time focused: ${formatTime(elapsed(active))}.`);
  clearActive();
  setStatus("Marked delayed");
  refreshMain("tasks");
}

function carryActive() {
  const active = activeTask();
  if (!active) return;
  const destination = prompt("Carry forward to next shift or tomorrow?", "Next shift") || "Next shift";
  addCustomTask(`Carry forward: ${active.title}`, "Carry Forward", carryKey(destination));
  setState(active.id, { type: "carry", reason: destination });
  addNote(`Carried forward: ${active.title}. Destination/reason: ${destination}. Time focused: ${formatTime(elapsed(active))}.`);
  clearActive();
  setStatus("Carried forward");
  refreshMain("tasks");
}

function noteActive() {
  const active = activeTask();
  if (!active) return;
  const text = prompt("Add note for this task", `${active.title}: `);
  if (!text) return;
  addNote(text);
  setStatus("Note added");
}

function refreshMain(screen = "tasks") {
  const button = document.querySelector(`[data-screen="${screen}"]`) || document.querySelector('[data-screen="tasks"]');
  button?.click();
}

function setStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => { status.textContent = "Ready"; }, 1800);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

document.addEventListener("click", (event) => {
  const startButton = event.target.closest("#complete-next");
  if (!startButton) return;
  const task = nextTask();
  if (!task || task.id === "morning-walk") return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  startActiveTask(task);
}, true);

document.addEventListener("click", (event) => {
  const active = activeTask();
  if (!active) return;
  if (event.target.closest('[data-screen="next"]')) setTimeout(renderActiveMode, 25);
});

setTimeout(() => {
  if (activeTask()) renderActiveMode();
}, 80);
