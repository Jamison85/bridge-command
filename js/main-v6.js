const STORAGE = {
  completed: "storePilot.completed.v6",
  notes: "storePilot.notes.v6",
  reports: "storePilot.reports.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6"
};

const SHIFT_LABELS = { morning: "Morning", mid: "Mid", close: "Close" };
const SHIFT_ORDER = ["morning", "mid", "close"];

const TASKS_BY_SHIFT = {
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
  navButtons: $$(".nav-button"), shiftButtons: $$(".shift-button"), voiceFab: $("#voice-fab"), voiceSheet: $("#voice-sheet"),
  closeVoiceSheet: $("#close-voice-sheet"), voiceCaptureText: $("#voice-capture-text"), startGlobalSpeech: $("#start-global-speech"), saveCaptureTask: $("#save-capture-task"), saveCaptureNote: $("#save-capture-note")
};

let currentScreen = "next";
let generatedReport = "";
let currentShift = readJSON(STORAGE.shift, getDefaultShift());

init();

function task(id, title, area, minutes, priority, detail, due = "") { return { id, title, area, minutes, priority, detail, due }; }
function $(selector) { return document.querySelector(selector); }
function $$(selector) { return document.querySelectorAll(selector); }

function init() {
  ui.dateLabel.textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date());
  ui.navButtons.forEach((button) => button.addEventListener("click", () => openScreen(button.dataset.screen)));
  ui.shiftButtons.forEach((button) => button.addEventListener("click", () => setShift(button.dataset.shift)));
  ui.completeNext.addEventListener("click", () => handleCompleteNext());
  ui.openReport.addEventListener("click", () => openScreen("report"));
  ui.copyOutput.addEventListener("click", copyGeneratedOutput);
  ui.voiceFab.addEventListener("click", openVoiceSheet);
  ui.closeVoiceSheet.addEventListener("click", closeVoiceSheet);
  ui.startGlobalSpeech.addEventListener("click", () => startSpeech(ui.voiceCaptureText));
  ui.saveCaptureTask.addEventListener("click", saveCaptureAsTask);
  ui.saveCaptureNote.addEventListener("click", saveCaptureAsNote);
  renderAll();
}

function getDefaultShift() { const hour = new Date().getHours(); return hour < 10 ? "morning" : hour < 16 ? "mid" : "close"; }
function setShift(shift) { currentShift = shift; writeJSON(STORAGE.shift, shift); setStatus(`${SHIFT_LABELS[shift]} shift`); renderAll(); }
function getDateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function getShiftKey(shift = currentShift, date = new Date()) { return `${getDateKey(date)}:${shift}`; }
function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function getTasks() {
  const day = new Date().getDay();
  const base = TASKS_BY_SHIFT[currentShift] || TASKS_BY_SHIFT.morning;
  const weekly = currentShift === "morning" ? (WEEKLY_TASKS[day] || []) : [];
  return [...base, ...getCustomTasks()].sort((a, b) => a.priority - b.priority).concat(weekly.filter((weeklyTask) => !base.some((item) => item.id === weeklyTask.id)));
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

function getNextTask() {
  const completed = new Set(getCompleted());
  const states = getTaskStates();
  const open = getTasks().filter((item) => !completed.has(item.id));
  return open.find((item) => !states[item.id]) || open[0] || null;
}

function handleCompleteNext() { const next = getNextTask(); if (!next) return; next.id === "morning-walk" ? openScreen("tasks") : completeTask(next.id); }
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
  const labels = { next: ["Command", "Next"], tasks: ["Checklist", "Tasks"], report: ["Incident", "Report"], log: ["History", "Log"], voice: ["Capture", "Voice"] };
  const [eyebrow, title] = labels[currentScreen] || labels.next;
  ui.screenEyebrow.textContent = eyebrow; ui.screenTitle.textContent = title; ui.screenContent.innerHTML = "";
  if (currentScreen === "next") renderNextScreen();
  if (currentScreen === "tasks") renderTasksScreen();
  if (currentScreen === "report") renderReportScreen();
  if (currentScreen === "log") renderLogScreen();
  if (currentScreen === "voice") renderVoiceScreen();
}

function renderNextScreen() { const next = getNextTask(); ui.screenContent.innerHTML = next ? taskCard(next, false, true) : `<div class="empty-state"><strong>No urgent task left.</strong><p>Do a quick floor scan, then write a handoff note.</p></div>`; bindTaskActionButtons(); }
function renderTasksScreen() {
  const completed = new Set(getCompleted());
  ui.screenContent.innerHTML = getTasks().map((item) => item.id === "morning-walk" ? walkCard(completed.has(item.id)) : taskCard(item, completed.has(item.id), true)).join("");
  bindTaskActionButtons();
  ui.screenContent.querySelector("#finish-walk")?.addEventListener("click", finishMorningWalk);
}
function bindTaskActionButtons() {
  ui.screenContent.querySelectorAll("button[data-task-action]").forEach((button) => button.addEventListener("click", () => {
    const item = getTasks().find((taskItem) => taskItem.id === button.dataset.task);
    if (!item) return;
    const action = button.dataset.taskAction;
    if (action === "done") item.id === "morning-walk" ? openScreen("tasks") : completeTask(item.id);
    if (action === "undo") reopenTask(item.id);
    if (action === "delay") markDelayed(item);
    if (action === "carry") carryForward(item);
  }));
}
function taskCard(item, done, withButton) {
  const state = getTaskState(item.id);
  const stateClass = state?.type ? ` ${state.type}` : "";
  const stateLabel = state?.type === "delayed" ? "Delayed" : state?.type === "carry" ? "Carry Forward" : "";
  const stateNote = state ? `<div class="task-state-note"><span class="status-tag ${state.type}">${stateLabel}</span><span>${escapeHTML(state.reason || "Follow-up noted")}</span></div>` : "";
  const actions = done ? `<button class="mini-button" type="button" data-task-action="undo" data-task="${item.id}">Undo</button>` : `<div class="task-actions"><button class="mini-button" type="button" data-task-action="done" data-task="${item.id}">${item.id === "morning-walk" ? "Open" : "Done"}</button><button class="mini-button subtle" type="button" data-task-action="delay" data-task="${item.id}">Delay</button><button class="mini-button subtle" type="button" data-task-action="carry" data-task="${item.id}">Carry</button></div>`;
  return `<article class="task-row ${done ? "done" : ""}${stateClass}"><div class="task-check" aria-hidden="true"></div><div><div class="task-title">${escapeHTML(item.title)}</div><div class="task-meta">${escapeHTML(item.area)} · ${item.minutes} min${item.due ? ` · due ${escapeHTML(item.due)}` : ""}</div>${stateNote}</div>${withButton ? actions : `<span class="badge">${escapeHTML(item.area)}</span>`}</article>`;
}

function walkCard(done) {
  return `<article class="walk-card ${done ? "done" : ""}"><div class="screen-header"><div><div class="task-title">Morning walk transfer checklist</div><div class="task-meta">Check what is complete. Anything unchecked becomes a follow-up task.</div></div><span class="badge">Walk</span></div><div class="walk-list">${WALK_ITEMS.map((label, index) => `<label class="walk-item"><input type="checkbox" data-walk-item="${index}" checked /> ${escapeHTML(label)}</label>`).join("")}</div><div class="action-row"><button class="primary-action" type="button" id="finish-walk">Finish Walk + Transfer</button></div></article>`;
}
function finishMorningWalk() {
  const unchecked = [...document.querySelectorAll("[data-walk-item]")].filter((box) => !box.checked);
  unchecked.forEach((box) => addCustomTask(`Follow up: ${WALK_ITEMS[Number(box.dataset.walkItem)]}`, "Created from the morning walk because this was not complete yet.", "Follow-up"));
  completeTask("morning-walk");
  setStatus(unchecked.length ? `${unchecked.length} follow-up added` : "Walk complete");
}

function renderReportScreen() {
  ui.screenContent.innerHTML = `<form class="form-grid" id="report-form"><label>Type<select name="type"><option>System outage</option><option>Short staffed</option><option>Safety issue</option><option>Customer incident</option><option>Delayed work</option><option>Other</option></select></label><label>What happened<textarea name="summary" placeholder="Power outage, water leak, short staffed, IT call, delayed bookwork..."></textarea></label><label>Who was notified<input name="notified" placeholder="Loretta, Richard, IT, maintenance..." /></label><label>What got delayed<textarea name="delayed" placeholder="Bookwork, cooler, dates, cleaning, truck, etc."></textarea></label><div class="action-row"><button class="primary-action" type="submit">Generate</button><button class="secondary-action" type="button" id="save-report">Save</button></div></form><div class="report-output" id="report-output">Generated report will appear here.</div>`;
  const form = $("#report-form");
  form.addEventListener("submit", (event) => { event.preventDefault(); generatedReport = buildReport(new FormData(form)); $("#report-output").textContent = generatedReport; ui.copyOutput.hidden = false; });
  $("#save-report").addEventListener("click", () => { generatedReport = generatedReport || buildReport(new FormData(form)); saveItem(STORAGE.reports, generatedReport); setStatus("Report saved"); openScreen("log"); });
}
function buildReport(data) { return `Update from Jamison - ${new Date().toLocaleString()}\n\nShift: ${SHIFT_LABELS[currentShift]}\n\nType: ${data.get("type") || "Incident"}\n\nWhat happened:\n${data.get("summary") || "No summary entered."}\n\nWho was notified:\n${data.get("notified") || "Not listed."}\n\nWork delayed or impacted:\n${data.get("delayed") || "Not listed."}\n\nNo reply needed unless you want me to handle this differently.`; }

function renderLogScreen() {
  const notes = readJSON(STORAGE.notes, []);
  const reports = readJSON(STORAGE.reports, []);
  const items = [...reports.map((text) => ({ type: "Report", text })), ...notes.map((text) => ({ type: "Note", text }))].slice(-8).reverse();
  const handoff = buildHandoffMessage();
  ui.screenContent.innerHTML = `<article class="handoff-card"><div class="screen-header"><div><p class="eyebrow">END OF SHIFT</p><h3>Positive handoff</h3></div><span class="badge">Text ready</span></div><p class="helper-text">Completed work comes first. Delayed and carried items are framed as follow-ups identified.</p><div class="handoff-preview">${escapeHTML(handoff).replace(/\n/g, "<br>")}</div><div class="action-row"><button class="primary-action" type="button" id="share-handoff">Text / Share</button><button class="secondary-action" type="button" id="copy-handoff">Copy</button></div></article>${items.length ? items.map((item) => `<article class="note-row"><span class="badge">${item.type}</span><p>${escapeHTML(item.text).replace(/\n/g, "<br>")}</p></article>`).join("") : `<div class="empty-state"><strong>No saved notes yet.</strong><p>Voice notes and saved reports will show here below the handoff.</p></div>`}`;
  $("#share-handoff")?.addEventListener("click", () => shareHandoffText(handoff));
  $("#copy-handoff")?.addEventListener("click", () => copyText(handoff));
}
function buildHandoffMessage() {
  const tasks = getTasks();
  const completedIds = new Set(getCompleted());
  const states = getTaskStates();
  const completed = tasks.filter((item) => completedIds.has(item.id));
  const delayed = tasks.filter((item) => !completedIds.has(item.id) && states[item.id]?.type === "delayed");
  const carried = tasks.filter((item) => !completedIds.has(item.id) && states[item.id]?.type === "carry");
  const open = tasks.filter((item) => !completedIds.has(item.id) && !states[item.id]);
  const completedLines = completed.length ? completed.slice(0, 12).map((item) => `• ${item.title}`).join("\n") : "• Started the shift priorities and kept the store moving while identifying what needed attention.";
  const followUps = [...delayed.map((item) => `• ${item.title} - delayed: ${states[item.id].reason || "reason noted"}`), ...carried.map((item) => `• ${item.title} - carried forward: ${states[item.id].reason || "next shift"}`), ...open.map((item) => `• ${item.title} - still watching`)];
  const followUpLines = followUps.length ? followUps.slice(0, 10).join("\n") : "• No major follow-ups from the planned list at this time.";
  return `Good ${getDayPart()}, quick ${SHIFT_LABELS[currentShift].toLowerCase()} shift update from Jamison.\n\nI was able to complete ${completed.length} of ${tasks.length} planned items for this shift, including:\n${completedLines}\n\nFollow-ups identified / carry forward:\n${followUpLines}\n\nI prioritized the highest-impact customer-facing and operational items first, documented delays as they came up, and carried forward anything that needs the next best window. No reply needed unless you want anything handled differently.`;
}
function getDayPart() { const hour = new Date().getHours(); return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"; }
async function shareHandoffText(text) { if (navigator.share) { try { await navigator.share({ title: "Shift handoff", text }); setStatus("Share opened"); return; } catch (error) { if (error?.name === "AbortError") return; } } window.location.href = `sms:?&body=${encodeURIComponent(text)}`; setStatus("Opening messages"); }

function renderVoiceScreen() {
  ui.screenContent.innerHTML = `<div class="form-grid"><p class="helper-text">The fastest way is the floating + Voice button, available on every screen.</p><label>Quick task or note<textarea id="voice-note" placeholder="Add cooler doors need cleaned, restrooms need paper, coffee area needs cups..."></textarea></label><div class="action-row"><button class="primary-action" type="button" id="save-note-task">Save as Task</button><button class="secondary-action" type="button" id="save-note">Save Note</button><button class="secondary-action" type="button" id="start-speech">Start Speech</button></div></div>`;
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
