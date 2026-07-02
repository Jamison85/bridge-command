const STORAGE = {
  completed: "storePilot.completed.v6",
  notes: "storePilot.notes.v6",
  reports: "storePilot.reports.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7"
};

const SHIFT_LABELS = { morning: "Morning", mid: "Mid", close: "Close" };
const SHIFT_ORDER = ["morning", "mid", "close"];

const DEFAULT_TEMPLATES = {
  morning: [
    task("bookwork", "Bookwork / SmartSafe match", "Opening", 18, 1, "Verify SmartSafe, deposits, lottery, and starting cash."),
    task("smart-counts", "Smart Counts", "Inventory", 14, 2, "Complete Smart Counts early while the shift is still manageable."),
    task("lto", "LTO screenshot to Loretta", "Admin", 6, 3, "Send the daily LTO screenshot.", "10:00 AM"),
    task("morning-walk", "Morning walk", "Walk", 12, 4, "Check the store once, then transfer anything unfinished into follow-up tasks."),
    task("coffee-fountain", "Coffee and fountain reset", "Guest", 12, 5, "Cups, lids, straws, coffee area, fountain area, and BIBs."),
    task("open-air", "Open-air cooler dates", "Fresh", 12, 6, "Check dates, face product, and rotate as needed."),
    task("food-warmers", "Food warmers check", "Fresh", 8, 7, "Check quality, holding, labels, and presentation."),
    task("shift-note", "Morning handoff note", "Closeout", 7, 9, "Capture what was done, what moved, and what needs follow-up.")
  ],
  mid: [
    task("mid-walk", "Mid-shift floor reset walk", "Walk", 10, 1, "Check customer-facing areas and catch anything morning could not finish."),
    task("coffee-fountain-mid", "Coffee / fountain recovery", "Guest", 10, 2, "Refill cups, lids, straws, clean counters, and check fountain issues."),
    task("cooler-fresh-mid", "Cooler and fresh food check", "Fresh", 14, 3, "Face open-air, check dates, rotate issues, and fix empty spots."),
    task("restrooms-mid", "Restrooms and trash pass", "Guest", 10, 4, "Supplies, trash, quick wipe, and customer-facing reset."),
    task("backstock-mid", "Backstock / back room quick reset", "Stock", 20, 5, "Put out priority backstock and keep paths clear."),
    task("handoff-mid", "Mid-shift handoff note", "Closeout", 7, 8, "Log what was done, what still needs done, and anything leadership should know.")
  ],
  close: [
    task("close-walk", "Closing walk and recovery", "Walk", 12, 1, "Check floor, restrooms, trash, cooler, coffee, fountain, and safety issues."),
    task("dates-close", "Fresh food / cooler date pass", "Fresh", 14, 2, "Check open-air and priority fresh items."),
    task("coffee-fountain-close", "Coffee and fountain close reset", "Guest", 10, 3, "Clean and stock for the next morning."),
    task("restrooms-close", "Restrooms, trash, and floor", "Guest", 16, 4, "Restrooms stocked, trash handled, floors checked, and store presentable."),
    task("lock-doors", "Lock doors / closing timing", "Close", 5, 5, "Use the store process for closing timing."),
    task("handoff-close", "Closing handoff note", "Closeout", 8, 8, "Log what is complete, what carried forward, and any incident or delay.")
  ]
};

const WEEKLY_TASKS = {
  0: [task("outs", "Sunday outs check", "Weekly", 20, 2, "Complete outs check.")],
  1: [task("store-order", "Store order by 2 PM", "Weekly", 35, 1, "Protect time for the Monday store order.", "2:00 PM")],
  2: [task("cig-audit", "Cigarette audits", "Weekly", 120, 1, "Tuesday audit block."), task("backstock", "Backstock and back room reset", "Weekly", 35, 4, "Put backstock out and organize priority areas.")],
  3: [task("truck-prep", "Truck prep and walkway clear", "Truck", 20, 2, "Carts/dollies ready and receiving area clear."), task("truck-triage", "Truck triage", "Truck", 35, 3, "Prioritize customer-impacting freight first.")]
};

const WALK_ITEMS = ["Front doors / entry", "Restrooms", "Cooler / open-air", "Coffee area", "Fountain / BIBs", "Trash", "Wet floors / safety", "Customer-facing issues"];

const ui = {
  status: $("#system-status"), shiftLabel: $("#shift-label"), dateLabel: $("#date-label"),
  nextTitle: $("#next-title"), nextCopy: $("#next-copy"), completeNext: $("#complete-next"), openReport: $("#open-report"),
  progressText: $("#progress-text"), progressFill: $("#progress-fill"), progressRingText: $("#progress-ring-text"), progressRing: $(".progress-ring"), progressSubtext: $("#progress-subtext"),
  screenEyebrow: $("#screen-eyebrow"), screenTitle: $("#screen-title"), screenContent: $("#screen-content"), copyOutput: $("#copy-output"),
  navButtons: $$(".nav-button"), shiftButtons: $$(".shift-button"), menuButton: $(".icon-button"), voiceFab: $("#voice-fab"), voiceSheet: $("#voice-sheet"),
  closeVoiceSheet: $("#close-voice-sheet"), voiceCaptureText: $("#voice-capture-text"), startGlobalSpeech: $("#start-global-speech"), saveCaptureTask: $("#save-capture-task"), saveCaptureNote: $("#save-capture-note")
};

let currentScreen = "next";
let generatedReport = "";
let currentShift = readJSON(STORAGE.shift, getDefaultShift());
let screenMessage = "";

init();

function task(id, title, area, minutes, priority, detail, due = "") { return { id, title, area, minutes, priority, detail, due }; }
function $(selector) { return document.querySelector(selector); }
function $$(selector) { return document.querySelectorAll(selector); }
function cloneTasks(tasks) { return tasks.map((item, index) => ({ ...item, priority: index + 1 })); }

function init() {
  ui.dateLabel.textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date());
  ui.navButtons.forEach((button) => button.addEventListener("click", () => openScreen(button.dataset.screen)));
  ui.shiftButtons.forEach((button) => button.addEventListener("click", () => setShift(button.dataset.shift)));
  ui.menuButton?.addEventListener("click", () => openScreen("templates"));
  ui.completeNext.addEventListener("click", () => handleCompleteNext());
  ui.openReport.addEventListener("click", () => openScreen("report"));
  ui.copyOutput.addEventListener("click", copyGeneratedOutput);
  ui.voiceFab.addEventListener("click", openVoiceSheet);
  ui.closeVoiceSheet.addEventListener("click", closeVoiceSheet);
  ui.startGlobalSpeech.addEventListener("click", () => startSpeech(ui.voiceCaptureText));
  ui.saveCaptureTask.addEventListener("click", saveCaptureAsTask);
  ui.saveCaptureNote.addEventListener("click", saveCaptureAsNote);
  ensureTemplates();
  renderAll();
}

function getDefaultShift() { const hour = new Date().getHours(); return hour < 10 ? "morning" : hour < 16 ? "mid" : "close"; }
function setShift(shift) { currentShift = shift; screenMessage = ""; writeJSON(STORAGE.shift, shift); setStatus(`${SHIFT_LABELS[shift]} shift`); renderAll(); }
function getDateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function getShiftKey(shift = currentShift, date = new Date()) { return `${getDateKey(date)}:${shift}`; }
function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function ensureTemplates() {
  const templates = readJSON(STORAGE.templates, null);
  if (!templates) writeJSON(STORAGE.templates, cloneTemplateMap(DEFAULT_TEMPLATES));
}
function cloneTemplateMap(map) { return Object.fromEntries(Object.entries(map).map(([shift, tasks]) => [shift, cloneTasks(tasks)])); }
function getTemplates() { ensureTemplates(); return readJSON(STORAGE.templates, cloneTemplateMap(DEFAULT_TEMPLATES)); }
function setTemplates(templates) { writeJSON(STORAGE.templates, templates); }
function getTemplateTasks(shift = currentShift) { return cloneTasks(getTemplates()[shift] || DEFAULT_TEMPLATES[shift] || DEFAULT_TEMPLATES.morning); }
function setTemplateTasks(shift, tasks) { const templates = getTemplates(); templates[shift] = cloneTasks(tasks); setTemplates(templates); }

function getTasks() {
  const day = new Date().getDay();
  const base = getTemplateTasks(currentShift);
  const weekly = currentShift === "morning" ? (WEEKLY_TASKS[day] || []) : [];
  return [...base, ...getCustomTasks(), ...weekly].sort((a, b) => a.priority - b.priority);
}
function getCompleted() { return readJSON(STORAGE.completed, {})[getShiftKey()] || []; }
function setCompleted(ids) { const all = readJSON(STORAGE.completed, {}); all[getShiftKey()] = [...new Set(ids)]; writeJSON(STORAGE.completed, all); }
function getCustomTasks(key = getShiftKey()) { return readJSON(STORAGE.customTasks, {})[key] || []; }
function setCustomTasks(tasks, key = getShiftKey()) { const all = readJSON(STORAGE.customTasks, {}); all[key] = tasks; writeJSON(STORAGE.customTasks, all); }
function addCustomTask(title, detail = "Added during shift.", area = "Added", key = getShiftKey()) {
  const clean = String(title || "").trim();
  if (!clean) return false;
  const custom = task(`custom-${Date.now()}-${Math.random().toString(16).slice(2)}`, clean, area, 8, 40 + getCustomTasks(key).length, detail);
  setCustomTasks([...getCustomTasks(key), custom], key);
  return true;
}
function getTaskStates() { return readJSON(STORAGE.taskStates, {})[getShiftKey()] || {}; }
function getTaskState(taskId) { return getTaskStates()[taskId] || null; }
function setTaskState(taskId, state) { const all = readJSON(STORAGE.taskStates, {}); all[getShiftKey()] = { ...(all[getShiftKey()] || {}), [taskId]: { ...state, updatedAt: new Date().toISOString() } }; writeJSON(STORAGE.taskStates, all); }
function clearTaskState(taskId) { const all = readJSON(STORAGE.taskStates, {}); const states = { ...(all[getShiftKey()] || {}) }; delete states[taskId]; all[getShiftKey()] = states; writeJSON(STORAGE.taskStates, all); }

function isWalkTask(item) { return item?.area === "Walk" || /(^|-)walk($|-)/i.test(item?.id || "") || /\bwalk\b/i.test(item?.title || ""); }
function getNextTask() {
  const completed = new Set(getCompleted());
  const states = getTaskStates();
  const open = getTasks().filter((item) => !completed.has(item.id));
  return open.find((item) => !states[item.id]) || open[0] || null;
}
function handleCompleteNext() { const next = getNextTask(); if (!next) return; isWalkTask(next) ? openScreen("tasks") : completeTask(next.id); }
function completeTask(id) { clearTaskState(id); setCompleted([...getCompleted(), id]); setStatus("Marked done"); renderAll(); }
function reopenTask(id) { setCompleted(getCompleted().filter((taskId) => taskId !== id)); clearTaskState(id); setStatus("Task reopened"); renderAll(); }
function markDelayed(item) { const reason = prompt("Why is this delayed?", "Customer volume / register coverage / short staffing / time constraint") || "Reason noted"; setTaskState(item.id, { type: "delayed", reason }); setStatus("Marked delayed"); renderAll(); }
function carryForward(item) {
  const destination = prompt("Carry forward to next shift or tomorrow?", "Next shift") || "Next shift";
  const key = getCarryForwardKey(destination);
  addCustomTask(`Carry forward: ${item.title}`, `Carried forward from ${SHIFT_LABELS[currentShift]} shift. Destination/reason: ${destination}.`, "Carry Forward", key);
  setTaskState(item.id, { type: "carry", reason: destination });
  setStatus("Carried forward");
  renderAll();
}
function getCarryForwardKey(destination) {
  const today = new Date();
  if (destination.toLowerCase().includes("tomorrow")) { const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1); return getShiftKey("morning", tomorrow); }
  const index = SHIFT_ORDER.indexOf(currentShift);
  const nextShift = SHIFT_ORDER[index + 1] || "morning";
  const targetDate = new Date(today);
  if (!SHIFT_ORDER[index + 1]) targetDate.setDate(today.getDate() + 1);
  return getShiftKey(nextShift, targetDate);
}

function renderAll() {
  ui.shiftLabel.textContent = SHIFT_LABELS[currentShift];
  ui.shiftButtons.forEach((button) => button.classList.toggle("active", button.dataset.shift === currentShift));
  renderHero(); renderProgress(); renderScreen(); updateNav();
}
function renderHero() {
  const next = getNextTask();
  if (!next) { ui.nextTitle.textContent = "Shift core complete"; ui.nextCopy.textContent = "The main list is handled. Add a log note or do a final walk before leaving."; ui.completeNext.disabled = true; return; }
  ui.completeNext.disabled = false;
  ui.nextTitle.textContent = next.title;
  ui.nextCopy.textContent = `${next.detail} ${next.due ? `Due: ${next.due}.` : ""}`;
}
function renderProgress() {
  const tasks = getTasks();
  const completed = getCompleted();
  const percent = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;
  ui.progressText.textContent = `${percent}%`;
  ui.progressFill.style.width = `${percent}%`;
  ui.progressRingText.textContent = `${percent}%`;
  ui.progressRing.style.setProperty("--progress-angle", `${percent * 3.6}deg`);
  ui.progressSubtext.textContent = `${completed.length} of ${tasks.length} tasks complete.`;
}
function openScreen(screen) { currentScreen = screen; ui.copyOutput.hidden = true; renderAll(); }
function updateNav() { ui.navButtons.forEach((button) => button.classList.toggle("active", button.dataset.screen === currentScreen)); }
function renderScreen() {
  const labels = { next: ["Command", "Next"], tasks: ["Checklist", "Tasks"], report: ["Incident", "Report"], log: ["History", "Log"], voice: ["Capture", "Voice"], templates: ["Settings", "Templates"] };
  const [eyebrow, title] = labels[currentScreen] || labels.next;
  ui.screenEyebrow.textContent = eyebrow; ui.screenTitle.textContent = title; ui.screenContent.innerHTML = "";
  if (currentScreen === "next") renderNextScreen();
  if (currentScreen === "tasks") renderTasksScreen();
  if (currentScreen === "report") renderReportScreen();
  if (currentScreen === "log") renderLogScreen();
  if (currentScreen === "voice") renderVoiceScreen();
  if (currentScreen === "templates") renderTemplatesScreen();
}
function messageBanner() { return screenMessage ? `<div class="empty-state" style="border-color:rgba(7,63,47,.18);background:rgba(236,253,245,.82);color:#14392f;font-weight:900;">${escapeHTML(screenMessage)}</div>` : ""; }
function renderNextScreen() { const next = getNextTask(); ui.screenContent.innerHTML = next ? taskCard(next, false, true) : `<div class="empty-state"><strong>No urgent task left.</strong><p>Do a quick floor scan, then write a handoff note.</p></div>`; bindTaskActionButtons(); }
function renderTasksScreen() {
  const completed = new Set(getCompleted());
  ui.screenContent.innerHTML = `${messageBanner()}${getTasks().map((item) => isWalkTask(item) ? walkCard(item, completed.has(item.id)) : taskCard(item, completed.has(item.id), true)).join("")}`;
  bindTaskActionButtons();
  ui.screenContent.querySelectorAll("[data-walk-action='finish']").forEach((button) => button.addEventListener("click", () => finishWalk(button.dataset.walkTask)));
}
function bindTaskActionButtons() {
  ui.screenContent.querySelectorAll("button[data-task-action]").forEach((button) => button.addEventListener("click", () => {
    const item = getTasks().find((taskItem) => taskItem.id === button.dataset.task);
    if (!item) return;
    const action = button.dataset.taskAction;
    if (action === "done") isWalkTask(item) ? openScreen("tasks") : completeTask(item.id);
    if (action === "undo") { screenMessage = ""; reopenTask(item.id); }
    if (action === "delay") { screenMessage = ""; markDelayed(item); }
    if (action === "carry") { screenMessage = ""; carryForward(item); }
  }));
}
function taskCard(item, done, withButton) {
  const state = getTaskState(item.id);
  const stateClass = state?.type ? ` ${state.type}` : "";
  const stateLabel = state?.type === "delayed" ? "Delayed" : state?.type === "carry" ? "Carry Forward" : "";
  const stateNote = state ? `<div class="task-state-note"><span class="status-tag ${state.type}">${stateLabel}</span><span>${escapeHTML(state.reason || "Follow-up noted")}</span></div>` : "";
  const actions = done ? `<button class="mini-button" type="button" data-task-action="undo" data-task="${item.id}">Undo</button>` : `<div class="task-actions"><button class="mini-button" type="button" data-task-action="done" data-task="${item.id}">${isWalkTask(item) ? "Open" : "Done"}</button><button class="mini-button subtle" type="button" data-task-action="delay" data-task="${item.id}">Delay</button><button class="mini-button subtle" type="button" data-task-action="carry" data-task="${item.id}">Carry</button></div>`;
  return `<article class="task-row ${done ? "done" : ""}${stateClass}"><div class="task-check" aria-hidden="true"></div><div><div class="task-title">${escapeHTML(item.title)}</div><div class="task-meta">${escapeHTML(item.area)} · ${item.minutes} min${item.due ? ` · due ${escapeHTML(item.due)}` : ""}</div>${stateNote}</div>${withButton ? actions : `<span class="badge">${escapeHTML(item.area)}</span>`}</article>`;
}
function walkCard(item, done) {
  const state = getTaskState(item.id);
  const stateNote = state ? `<div class="task-state-note"><span class="status-tag ${state.type}">${state.type === "delayed" ? "Delayed" : "Carry Forward"}</span><span>${escapeHTML(state.reason || "Follow-up noted")}</span></div>` : "";
  const checklist = done ? `<div class="empty-state" style="margin-top:10px;"><strong>Walk saved.</strong><p>This walk is complete. Reopen it if you need to change the transfer checklist.</p></div>` : `<div class="walk-list">${WALK_ITEMS.map((label, index) => `<label class="walk-item"><input type="checkbox" data-walk-item="${index}" checked /> ${escapeHTML(label)}</label>`).join("")}</div><div class="action-row"><button class="primary-action" type="button" data-walk-action="finish" data-walk-task="${item.id}">Finish Walk + Transfer</button><button class="secondary-action" type="button" data-task-action="delay" data-task="${item.id}">Delay</button><button class="secondary-action" type="button" data-task-action="carry" data-task="${item.id}">Carry</button></div>`;
  return `<article class="walk-card ${done ? "done" : ""}"><div class="screen-header"><div><div class="task-title">${escapeHTML(item.title)} transfer checklist</div><div class="task-meta">${escapeHTML(item.detail)} Anything unchecked becomes a follow-up task.</div>${stateNote}</div><span class="badge">Walk</span></div>${checklist}${done ? `<div class="action-row"><button class="mini-button" type="button" data-task-action="undo" data-task="${item.id}">Undo</button></div>` : ""}</article>`;
}
function finishWalk(taskId) {
  const item = getTasks().find((taskItem) => taskItem.id === taskId);
  if (!item) return;
  const unchecked = [...document.querySelectorAll("[data-walk-item]")].filter((box) => !box.checked);
  unchecked.forEach((box) => addCustomTask(`Follow up: ${WALK_ITEMS[Number(box.dataset.walkItem)]}`, `Created from ${item.title} because this was not complete yet.`, "Follow-up"));
  clearTaskState(item.id);
  setCompleted([...getCompleted(), item.id]);
  screenMessage = unchecked.length ? `Walk complete. ${unchecked.length} follow-up${unchecked.length === 1 ? "" : "s"} added to Tasks.` : "Walk complete. No follow-ups needed.";
  setStatus(unchecked.length ? `${unchecked.length} follow-up added` : "Walk complete");
  renderAll();
}

function renderTemplatesScreen() {
  const items = getTemplateTasks(currentShift);
  ui.screenContent.innerHTML = `
    <article class="template-card">
      <div class="screen-header">
        <div><p class="eyebrow">EDIT ${SHIFT_LABELS[currentShift].toUpperCase()}</p><h3>Shift template</h3></div>
        <span class="badge">${items.length} tasks</span>
      </div>
      <p class="helper-text">Use the shift selector above to edit Morning, Mid, or Close. These are recurring template tasks, not today-only voice tasks.</p>
      <div class="template-list">${items.map(templateRow).join("")}</div>
      <form class="template-add-form" id="template-add-form">
        <input name="title" placeholder="New recurring task" required />
        <input name="area" placeholder="Area, like Guest or Fresh" value="General" />
        <input name="minutes" type="number" min="1" max="180" value="10" />
        <button class="primary-action" type="submit">Add</button>
      </form>
      <div class="action-row"><button class="secondary-action" type="button" id="reset-template">Reset ${SHIFT_LABELS[currentShift]}</button><button class="secondary-action" type="button" id="back-to-tasks">Back to Tasks</button></div>
    </article>`;
  ui.screenContent.querySelectorAll("[data-template-action]").forEach((button) => button.addEventListener("click", () => handleTemplateAction(button.dataset.templateAction, Number(button.dataset.index))));
  $("#template-add-form")?.addEventListener("submit", addTemplateTask);
  $("#reset-template")?.addEventListener("click", resetCurrentTemplate);
  $("#back-to-tasks")?.addEventListener("click", () => openScreen("tasks"));
}
function templateRow(item, index) {
  return `<div class="template-row"><div><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.area)} · ${item.minutes} min</span></div><div class="template-row-actions"><button class="mini-button" type="button" data-template-action="up" data-index="${index}">↑</button><button class="mini-button" type="button" data-template-action="down" data-index="${index}">↓</button><button class="mini-button subtle" type="button" data-template-action="delete" data-index="${index}">Remove</button></div></div>`;
}
function handleTemplateAction(action, index) {
  const items = getTemplateTasks(currentShift);
  if (action === "delete") items.splice(index, 1);
  if (action === "up" && index > 0) [items[index - 1], items[index]] = [items[index], items[index - 1]];
  if (action === "down" && index < items.length - 1) [items[index + 1], items[index]] = [items[index], items[index + 1]];
  setTemplateTasks(currentShift, items);
  setStatus("Template updated");
  renderAll();
}
function addTemplateTask(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const items = getTemplateTasks(currentShift);
  items.push(task(`template-${currentShift}-${Date.now()}`, data.get("title"), data.get("area") || "General", Number(data.get("minutes")) || 10, items.length + 1, `Recurring ${SHIFT_LABELS[currentShift]} task.`));
  setTemplateTasks(currentShift, items);
  setStatus("Template task added");
  renderAll();
}
function resetCurrentTemplate() {
  if (!confirm(`Reset ${SHIFT_LABELS[currentShift]} template to the default list?`)) return;
  setTemplateTasks(currentShift, DEFAULT_TEMPLATES[currentShift]);
  setStatus("Template reset");
  renderAll();
}

function renderReportScreen() {
  ui.screenContent.innerHTML = `<form class="form-grid" id="report-form"><label>Type<select name="type"><option>System outage</option><option>Short staffed</option><option>Safety issue</option><option>Customer incident</option><option>Delayed work</option><option>Other</option></select></label><label>What happened<textarea name="summary" placeholder="Power outage, water leak, short staffed, IT call, delayed bookwork..."></textarea></label><label>Who was notified<input name="notified" placeholder="Loretta, Richard, IT, maintenance..." /></label><label>What got delayed<textarea name="delayed" placeholder="Bookwork, cooler, dates, cleaning, truck, etc."></textarea></label><div class="action-row"><button class="primary-action" type="submit">Generate</button><button class="secondary-action" type="button" id="save-report">Save</button></div></form><div class="report-output" id="report-output">Generated report will appear here.</div>`;
  const form = $("#report-form");
  form.addEventListener("submit", (event) => { event.preventDefault(); generatedReport = buildReport(new FormData(form)); $("#report-output").textContent = generatedReport; ui.copyOutput.hidden = false; });
  $("#save-report").addEventListener("click", () => { generatedReport = generatedReport || buildReport(new FormData(form)); saveItem(STORAGE.reports, generatedReport); setStatus("Report saved"); openScreen("log"); });
}
function buildReport(data) { return `Update from Jamison - ${new Date().toLocaleString()}\n\nShift: ${SHIFT_LABELS[currentShift]}\n\nType: ${data.get("type") || "Incident"}\n\nWhat happened:\n${data.get("summary") || "No summary entered."}\n\nWho was notified:\n${data.get("notified") || "Not listed."}\n\nWork delayed or impacted:\n${data.get("delayed") || "Not listed."}\n\nNo reply needed unless you want me to handle this differently.`; }
function renderLogScreen() { ui.screenContent.innerHTML = `<div class="empty-state"><strong>Loading review...</strong><p>The review layer will replace this with your end-of-day summary.</p></div>`; setTimeout(() => document.dispatchEvent(new Event("click")), 0); }
function renderVoiceScreen() {
  ui.screenContent.innerHTML = `<div class="form-grid"><p class="helper-text">The fastest way is the floating + Voice button, available on every screen.</p><label>Quick task or note<textarea id="voice-note" placeholder="mark coffee done, delay cooler because short staffed, add wipe down cooler doors..."></textarea></label><div class="action-row"><button class="primary-action" type="button" id="save-note-task">Run / Save Task</button><button class="secondary-action" type="button" id="save-note">Save Note</button><button class="secondary-action" type="button" id="start-speech">Start Speech</button></div></div>`;
  const note = $("#voice-note");
  $("#save-note-task").addEventListener("click", () => saveTextAsTask(note));
  $("#save-note").addEventListener("click", () => saveTextAsNote(note));
  $("#start-speech").addEventListener("click", () => startSpeech(note));
}
function openVoiceSheet() { ui.voiceSheet.classList.add("open"); ui.voiceSheet.setAttribute("aria-hidden", "false"); ui.voiceCaptureText.focus(); }
function closeVoiceSheet() { ui.voiceSheet.classList.remove("open"); ui.voiceSheet.setAttribute("aria-hidden", "true"); }
function saveCaptureAsTask() { if (saveTextAsTask(ui.voiceCaptureText)) closeVoiceSheet(); }
function saveCaptureAsNote() { if (saveTextAsNote(ui.voiceCaptureText)) closeVoiceSheet(); }
function saveTextAsTask(textarea) { const value = textarea.value.trim(); if (!value) return setStatus("Nothing to save"), false; addCustomTask(value.replace(/^add\s+/i, "").slice(0, 90), `Added by voice/text on ${new Date().toLocaleString()}.`, "Voice"); textarea.value = ""; setStatus("Task added"); openScreen("tasks"); return true; }
function saveTextAsNote(textarea) { const value = textarea.value.trim(); if (!value) return setStatus("Nothing to save"), false; saveItem(STORAGE.notes, `${new Date().toLocaleString()} (${SHIFT_LABELS[currentShift]})\n${value}`); textarea.value = ""; setStatus("Note saved"); return true; }
function startSpeech(target) { const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SpeechRecognition) { setStatus("Use keyboard dictation"); target.focus(); return; } const recognition = new SpeechRecognition(); recognition.continuous = false; recognition.interimResults = true; recognition.onresult = (event) => { target.value = Array.from(event.results).map((result) => result[0].transcript).join(" "); }; recognition.onend = () => setStatus("Speech captured"); recognition.start(); setStatus("Listening"); }
function saveItem(key, value) { const items = readJSON(key, []); items.push(value); writeJSON(key, items.slice(-50)); }
async function copyGeneratedOutput() { if (!generatedReport) return; await copyText(generatedReport); }
async function copyText(text) { try { await navigator.clipboard?.writeText(text); } catch { const textarea = document.createElement("textarea"); textarea.value = text; document.body.appendChild(textarea); textarea.select(); document.execCommand("copy"); textarea.remove(); } setStatus("Copied"); }
function setStatus(text) { ui.status.textContent = text; clearTimeout(setStatus.timer); setStatus.timer = setTimeout(() => { ui.status.textContent = "Ready"; }, 1600); }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
