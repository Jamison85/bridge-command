const VOICE_STORAGE = {
  completed: "storePilot.completed.v6",
  notes: "storePilot.notes.v6",
  reports: "storePilot.reports.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6"
};

const VOICE_SHIFT_LABELS = { morning: "Morning", mid: "Mid", close: "Close" };
const VOICE_SHIFT_ORDER = ["morning", "mid", "close"];

const VOICE_TASKS = {
  morning: [
    vtask("bookwork", "Bookwork / SmartSafe match", "Opening", ["book", "bookwork", "safe", "deposit", "smartsafe"]),
    vtask("smart-counts", "Smart Counts", "Inventory", ["smart count", "counts", "inventory"]),
    vtask("lto", "LTO screenshot to Loretta", "Admin", ["lto", "screenshot", "loretta"]),
    vtask("morning-walk", "Morning walk", "Walk", ["walk", "morning walk"]),
    vtask("coffee-fountain", "Coffee and fountain reset", "Guest", ["coffee", "fountain", "cups", "lids", "straws", "bibs", "bib"]),
    vtask("open-air", "Open-air cooler dates", "Fresh", ["open air", "cooler", "dates", "fresh", "rotate"]),
    vtask("food-warmers", "Food warmers check", "Fresh", ["warmer", "warmers", "food warmer"]),
    vtask("shift-note", "Morning handoff note", "Closeout", ["handoff", "note", "shift note"])
  ],
  mid: [
    vtask("mid-walk", "Mid-shift floor reset walk", "Walk", ["walk", "floor", "reset"]),
    vtask("coffee-fountain-mid", "Coffee / fountain recovery", "Guest", ["coffee", "fountain", "cups", "lids", "straws", "bibs", "bib"]),
    vtask("cooler-fresh-mid", "Cooler and fresh food check", "Fresh", ["cooler", "fresh", "dates", "open air"]),
    vtask("restrooms-mid", "Restrooms and trash pass", "Guest", ["restroom", "restrooms", "bathroom", "trash"]),
    vtask("backstock-mid", "Backstock / back room quick reset", "Stock", ["backstock", "back room", "stock"]),
    vtask("handoff-mid", "Mid-shift handoff note", "Closeout", ["handoff", "note", "shift note"])
  ],
  close: [
    vtask("close-walk", "Closing walk and recovery", "Walk", ["walk", "closing walk", "recovery"]),
    vtask("dates-close", "Fresh food / cooler date pass", "Fresh", ["dates", "cooler", "fresh", "open air"]),
    vtask("coffee-fountain-close", "Coffee and fountain close reset", "Guest", ["coffee", "fountain", "cups", "lids", "straws", "bibs", "bib"]),
    vtask("restrooms-close", "Restrooms, trash, and floor", "Guest", ["restroom", "restrooms", "bathroom", "trash", "floor"]),
    vtask("lock-doors", "Lock doors / closing timing", "Close", ["lock", "doors", "closing", "close"]),
    vtask("handoff-close", "Closing handoff note", "Closeout", ["handoff", "note", "shift note"])
  ]
};

const VOICE_WEEKLY = {
  0: [vtask("outs", "Sunday outs check", "Weekly", ["outs", "sunday outs"])],
  1: [vtask("store-order", "Store order by 2 PM", "Weekly", ["store order", "order"] )],
  2: [vtask("cig-audit", "Cigarette audits", "Weekly", ["cigarette", "audit", "cig audit"]), vtask("backstock", "Backstock and back room reset", "Weekly", ["backstock", "back room"])],
  3: [vtask("truck-prep", "Truck prep and walkway clear", "Truck", ["truck prep", "walkway", "dollies"]), vtask("truck-triage", "Truck triage", "Truck", ["truck", "triage", "freight"])]
};

function vtask(id, title, area, aliases = []) {
  return { id, title, area, aliases };
}

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getDefaultShift() {
  const hour = new Date().getHours();
  return hour < 10 ? "morning" : hour < 16 ? "mid" : "close";
}

function getCurrentShift() {
  return readJSON(VOICE_STORAGE.shift, getDefaultShift());
}

function getDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getShiftKey(shift = getCurrentShift(), date = new Date()) {
  return `${getDateKey(date)}:${shift}`;
}

function getTasks() {
  const shift = getCurrentShift();
  const base = VOICE_TASKS[shift] || VOICE_TASKS.morning;
  const weekly = shift === "morning" ? (VOICE_WEEKLY[new Date().getDay()] || []) : [];
  const custom = readJSON(VOICE_STORAGE.customTasks, {})[getShiftKey()] || [];
  return [...base, ...weekly, ...custom];
}

function normalize(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function findTask(query) {
  const q = normalize(query).replace(/\b(the|a|an|task|please|today)\b/g, "").trim();
  if (!q) return null;
  let best = null;
  let bestScore = 0;

  for (const task of getTasks()) {
    const title = normalize(task.title);
    const aliases = (task.aliases || []).map(normalize);
    let score = 0;

    if (title.includes(q) || q.includes(title)) score += 8;
    for (const alias of aliases) {
      if (q.includes(alias) || alias.includes(q)) score += 6;
    }
    for (const word of q.split(" ")) {
      if (word.length > 2 && title.includes(word)) score += 1;
      if (aliases.some((alias) => alias.includes(word))) score += 1;
    }

    if (score > bestScore) {
      best = task;
      bestScore = score;
    }
  }

  return bestScore >= 2 ? best : null;
}

function getCompleted() {
  return readJSON(VOICE_STORAGE.completed, {})[getShiftKey()] || [];
}

function setCompleted(ids) {
  const all = readJSON(VOICE_STORAGE.completed, {});
  all[getShiftKey()] = [...new Set(ids)];
  writeJSON(VOICE_STORAGE.completed, all);
}

function setTaskState(taskId, state) {
  const all = readJSON(VOICE_STORAGE.taskStates, {});
  all[getShiftKey()] = { ...(all[getShiftKey()] || {}), [taskId]: { ...state, updatedAt: new Date().toISOString() } };
  writeJSON(VOICE_STORAGE.taskStates, all);
}

function clearTaskState(taskId) {
  const all = readJSON(VOICE_STORAGE.taskStates, {});
  const states = { ...(all[getShiftKey()] || {}) };
  delete states[taskId];
  all[getShiftKey()] = states;
  writeJSON(VOICE_STORAGE.taskStates, all);
}

function addCustomTask(title, detail = "Added by voice command.", area = "Voice", key = getShiftKey()) {
  const clean = String(title || "").trim();
  if (!clean) return false;
  const all = readJSON(VOICE_STORAGE.customTasks, {});
  const existing = all[key] || [];
  all[key] = [...existing, {
    id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: clean,
    area,
    minutes: 8,
    priority: 40 + existing.length,
    detail
  }];
  writeJSON(VOICE_STORAGE.customTasks, all);
  return true;
}

function saveNote(text) {
  const notes = readJSON(VOICE_STORAGE.notes, []);
  notes.push(`${new Date().toLocaleString()} (${VOICE_SHIFT_LABELS[getCurrentShift()]})\n${text}`);
  writeJSON(VOICE_STORAGE.notes, notes.slice(-50));
}

function saveReport(text) {
  const reports = readJSON(VOICE_STORAGE.reports, []);
  reports.push(`Update from Jamison - ${new Date().toLocaleString()}\n\nShift: ${VOICE_SHIFT_LABELS[getCurrentShift()]}\n\nType: Voice report\n\nWhat happened:\n${text}\n\nNo reply needed unless you want me to handle this differently.`);
  writeJSON(VOICE_STORAGE.reports, reports.slice(-50));
}

function markDone(task) {
  clearTaskState(task.id);
  setCompleted([...getCompleted(), task.id]);
}

function getCarryKey(destination = "next shift") {
  const normalized = normalize(destination);
  const today = new Date();
  if (normalized.includes("tomorrow")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return getShiftKey("morning", tomorrow);
  }
  if (normalized.includes("morning")) return getShiftKey("morning", today);
  if (normalized.includes("mid")) return getShiftKey("mid", today);
  if (normalized.includes("close") || normalized.includes("closing")) return getShiftKey("close", today);

  const shift = getCurrentShift();
  const index = VOICE_SHIFT_ORDER.indexOf(shift);
  const nextShift = VOICE_SHIFT_ORDER[index + 1] || "morning";
  const date = new Date(today);
  if (!VOICE_SHIFT_ORDER[index + 1]) date.setDate(today.getDate() + 1);
  return getShiftKey(nextShift, date);
}

function runVoiceCommand(raw) {
  const text = String(raw || "").trim();
  const simple = normalize(text);
  if (!simple) return { handled: false };

  let match = text.match(/^(?:mark|set|complete|finish)\s+(.+?)\s+(?:done|complete|completed|finished)$/i)
    || text.match(/^(?:done|completed|finished)\s+(.+)$/i);
  if (match) {
    const task = findTask(match[1]);
    if (!task) return { handled: true, message: "I could not match that task" };
    markDone(task);
    return { handled: true, message: `Marked done: ${task.title}` };
  }

  match = text.match(/^(?:delay|delayed|push back)\s+(.+?)(?:\s+(?:because|due to|for)\s+(.+))?$/i);
  if (match) {
    const task = findTask(match[1]);
    if (!task) return { handled: true, message: "I could not match that task" };
    setTaskState(task.id, { type: "delayed", reason: match[2] || "Reason noted by voice" });
    return { handled: true, message: `Delayed: ${task.title}` };
  }

  match = text.match(/^(?:carry|carry forward|move)\s+(.+?)(?:\s+(?:to|until|for)\s+(.+))?$/i);
  if (match) {
    const task = findTask(match[1]);
    if (!task) return { handled: true, message: "I could not match that task" };
    const destination = match[2] || "next shift";
    addCustomTask(`Carry forward: ${task.title}`, `Carried forward by voice command. Destination/reason: ${destination}.`, "Carry Forward", getCarryKey(destination));
    setTaskState(task.id, { type: "carry", reason: destination });
    return { handled: true, message: `Carried forward: ${task.title}` };
  }

  match = text.match(/^(?:note|log)\s+(.+)$/i);
  if (match) {
    saveNote(match[1]);
    return { handled: true, message: "Note saved" };
  }

  match = text.match(/^(?:report|incident|create report for)\s+(.+)$/i);
  if (match) {
    saveReport(match[1]);
    return { handled: true, message: "Report saved" };
  }

  match = text.match(/^(?:add|create|new task)\s+(.+)$/i);
  if (match) {
    addCustomTask(match[1], "Added by voice command.", "Voice");
    return { handled: true, message: "Task added" };
  }

  return { handled: false };
}

function setStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => { status.textContent = "Ready"; }, 1800);
}

function refreshTasks() {
  const tasksButton = document.querySelector('[data-screen="tasks"]');
  if (tasksButton) tasksButton.click();
}

function interceptCommand(buttonSelector, textareaSelector) {
  document.addEventListener("click", (event) => {
    const button = event.target.closest(buttonSelector);
    if (!button) return;
    const textarea = document.querySelector(textareaSelector);
    const value = textarea?.value || "";
    const result = runVoiceCommand(value);
    if (!result.handled) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (textarea) textarea.value = "";
    setStatus(result.message || "Command handled");
    refreshTasks();
  }, true);
}

interceptCommand("#save-capture-task", "#voice-capture-text");
interceptCommand("#save-note-task", "#voice-note");

window.StorePilotVoiceCommands = { runVoiceCommand };
