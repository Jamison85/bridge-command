const VOICE_KEYS = {
  completed: "storePilot.completed.v6",
  notes: "storePilot.notes.v6",
  reports: "storePilot.reports.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7"
};

const SHIFT_ORDER = ["morning", "mid", "close"];
const SHIFT_LABEL = { morning: "Morning", mid: "Mid", close: "Close" };

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function shiftNow() {
  return readJSON(VOICE_KEYS.shift, "morning");
}

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftKey(shift = shiftNow(), date = new Date()) {
  return `${dateKey(date)}:${shift}`;
}

function norm(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tasks() {
  const key = shiftKey();
  const templates = readJSON(VOICE_KEYS.templates, {});
  const custom = readJSON(VOICE_KEYS.customTasks, {})[key] || [];
  return [...(templates[shiftNow()] || []), ...custom];
}

function findTask(query) {
  const q = norm(query).replace(/\b(the|a|an|task|please|today)\b/g, "").trim();
  if (!q) return null;
  let best = null;
  let bestScore = 0;
  for (const task of tasks()) {
    const title = norm(task.title);
    let score = title.includes(q) || q.includes(title) ? 8 : 0;
    for (const word of q.split(" ")) {
      if (word.length > 2 && title.includes(word)) score += 2;
    }
    if (score > bestScore) { best = task; bestScore = score; }
  }
  return bestScore >= 2 ? best : null;
}

function completed() {
  return readJSON(VOICE_KEYS.completed, {})[shiftKey()] || [];
}

function setCompleted(ids) {
  const all = readJSON(VOICE_KEYS.completed, {});
  all[shiftKey()] = [...new Set(ids)];
  writeJSON(VOICE_KEYS.completed, all);
}

function setState(taskId, state) {
  const all = readJSON(VOICE_KEYS.taskStates, {});
  all[shiftKey()] = { ...(all[shiftKey()] || {}), [taskId]: { ...state, updatedAt: new Date().toISOString() } };
  writeJSON(VOICE_KEYS.taskStates, all);
}

function clearState(taskId) {
  const all = readJSON(VOICE_KEYS.taskStates, {});
  const states = { ...(all[shiftKey()] || {}) };
  delete states[taskId];
  all[shiftKey()] = states;
  writeJSON(VOICE_KEYS.taskStates, all);
}

function addTask(title, area = "Voice", key = shiftKey()) {
  const clean = String(title || "").trim();
  if (!clean) return false;
  const all = readJSON(VOICE_KEYS.customTasks, {});
  const list = all[key] || [];
  all[key] = [...list, { id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`, title: clean, area, minutes: 8, priority: 40 + list.length, detail: "Added by voice command." }];
  writeJSON(VOICE_KEYS.customTasks, all);
  return true;
}

function note(text) {
  const notes = readJSON(VOICE_KEYS.notes, []);
  notes.push(`${new Date().toLocaleString()} (${SHIFT_LABEL[shiftNow()]})\n${text}`);
  writeJSON(VOICE_KEYS.notes, notes.slice(-50));
}

function report(text) {
  const reports = readJSON(VOICE_KEYS.reports, []);
  reports.push(`Update from Jamison - ${new Date().toLocaleString()}\n\nShift: ${SHIFT_LABEL[shiftNow()]}\n\nType: Voice report\n\nWhat happened:\n${text}\n\nNo reply needed unless you want me to handle this differently.`);
  writeJSON(VOICE_KEYS.reports, reports.slice(-50));
}

function carryKey(destination = "next shift") {
  const destinationText = norm(destination);
  const today = new Date();
  if (destinationText.includes("tomorrow")) { const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1); return shiftKey("morning", tomorrow); }
  if (destinationText.includes("morning")) return shiftKey("morning", today);
  if (destinationText.includes("mid")) return shiftKey("mid", today);
  if (destinationText.includes("close") || destinationText.includes("closing")) return shiftKey("close", today);
  const index = SHIFT_ORDER.indexOf(shiftNow());
  const next = SHIFT_ORDER[index + 1] || "morning";
  const target = new Date(today);
  if (!SHIFT_ORDER[index + 1]) target.setDate(today.getDate() + 1);
  return shiftKey(next, target);
}

function runCommand(raw) {
  const text = String(raw || "").trim();
  if (!norm(text)) return { handled: false };
  let match = text.match(/^(?:mark|set|complete|finish)\s+(.+?)\s+(?:done|complete|completed|finished)$/i) || text.match(/^(?:done|completed|finished)\s+(.+)$/i);
  if (match) { const task = findTask(match[1]); if (!task) return { handled: true, message: "Could not match that task" }; clearState(task.id); setCompleted([...completed(), task.id]); return { handled: true, message: `Marked done: ${task.title}` }; }
  match = text.match(/^(?:delay|delayed|push back)\s+(.+?)(?:\s+(?:because|due to|for)\s+(.+))?$/i);
  if (match) { const task = findTask(match[1]); if (!task) return { handled: true, message: "Could not match that task" }; setState(task.id, { type: "delayed", reason: match[2] || "Reason noted by voice" }); return { handled: true, message: `Delayed: ${task.title}` }; }
  match = text.match(/^(?:carry|carry forward|move)\s+(.+?)(?:\s+(?:to|until|for)\s+(.+))?$/i);
  if (match) { const task = findTask(match[1]); if (!task) return { handled: true, message: "Could not match that task" }; const destination = match[2] || "next shift"; addTask(`Carry forward: ${task.title}`, "Carry Forward", carryKey(destination)); setState(task.id, { type: "carry", reason: destination }); return { handled: true, message: `Carried forward: ${task.title}` }; }
  match = text.match(/^(?:note|log)\s+(.+)$/i); if (match) { note(match[1]); return { handled: true, message: "Note saved" }; }
  match = text.match(/^(?:report|incident|create report for)\s+(.+)$/i); if (match) { report(match[1]); return { handled: true, message: "Report saved" }; }
  match = text.match(/^(?:add|create|new task)\s+(.+)$/i); if (match) { addTask(match[1]); return { handled: true, message: "Task added" }; }
  return { handled: false };
}

function status(text) {
  const el = document.querySelector("#system-status");
  if (!el) return;
  el.textContent = text;
  setTimeout(() => { el.textContent = "Ready"; }, 1600);
}

function refresh() {
  document.querySelector('[data-screen="tasks"]')?.click();
}

function intercept(buttonSelector, textareaSelector) {
  document.addEventListener("click", (event) => {
    const button = event.target.closest(buttonSelector);
    if (!button) return;
    const textarea = document.querySelector(textareaSelector);
    const result = runCommand(textarea?.value || "");
    if (!result.handled) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (textarea) textarea.value = "";
    status(result.message || "Command handled");
    refresh();
  }, true);
}

intercept("#save-capture-task", "#voice-capture-text");
intercept("#save-note-task", "#voice-note");
window.StorePilotVoiceCommands = { runCommand };
