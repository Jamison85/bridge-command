const STORAGE = {
  completed: "storePilot.completed.v5",
  notes: "storePilot.notes.v5",
  reports: "storePilot.reports.v5",
  customTasks: "storePilot.customTasks.v5",
  shift: "storePilot.shift.v5"
};

const SHIFT_LABELS = { morning: "Morning", mid: "Mid", close: "Close" };

const TASKS_BY_SHIFT = {
  morning: [
    { id: "bookwork", title: "Bookwork / SmartSafe match", area: "Opening", minutes: 18, priority: 1, detail: "Verify SmartSafe, deposits, lottery, and starting cash before the floor starts throwing chairs." },
    { id: "smart-counts", title: "Smart Counts", area: "Inventory", minutes: 14, priority: 2, detail: "Do Smart Counts early while your attention still has some dignity." },
    { id: "lto", title: "LTO screenshot to Loretta", area: "Admin", minutes: 6, priority: 3, due: "10:00 AM", detail: "Send the daily LTO screenshot before Richard becomes a weather system." },
    { id: "morning-walk", title: "Morning walk", area: "Walk", minutes: 12, priority: 4, detail: "Check the store once, then transfer anything unfinished into real follow-up tasks." },
    { id: "coffee-fountain", title: "Coffee and fountain reset", area: "Guest", minutes: 12, priority: 5, detail: "Cups, lids, straws, coffee area, fountain area, and BIBs if something is dramatic." },
    { id: "open-air", title: "Open-air cooler dates", area: "Fresh", minutes: 12, priority: 6, detail: "Check dates, face product, and rotate anything trying to become archaeology." },
    { id: "food-warmers", title: "Food warmers check", area: "Fresh", minutes: 8, priority: 7, detail: "Check quality, holding, labels, and presentation." },
    { id: "shift-note", title: "Morning handoff note", area: "Closeout", minutes: 7, priority: 9, detail: "Capture what happened, what moved, what got delayed, and who was notified." }
  ],
  mid: [
    { id: "mid-walk", title: "Mid-shift floor reset walk", area: "Walk", minutes: 10, priority: 1, detail: "Check customer-facing areas and catch anything morning could not finish. No bookwork cosplay required." },
    { id: "coffee-fountain-mid", title: "Coffee / fountain recovery", area: "Guest", minutes: 10, priority: 2, detail: "Refill cups, lids, straws, clean counters, check ice and fountain issues." },
    { id: "cooler-fresh-mid", title: "Cooler and fresh food check", area: "Fresh", minutes: 14, priority: 3, detail: "Face open-air, check dates, rotate obvious issues, and fix empty spots." },
    { id: "restrooms-mid", title: "Restrooms and trash pass", area: "Guest", minutes: 10, priority: 4, detail: "Supplies, trash, quick wipe, smell check. Humanity remains a mystery." },
    { id: "backstock-mid", title: "Backstock / back room quick reset", area: "Stock", minutes: 20, priority: 5, detail: "Put out what matters, clear paths, and leave the back room less haunted." },
    { id: "handoff-mid", title: "Mid-shift handoff note", area: "Closeout", minutes: 7, priority: 8, detail: "Log what was done, what still needs done, and anything leadership should know." }
  ],
  close: [
    { id: "close-walk", title: "Closing walk and recovery", area: "Walk", minutes: 12, priority: 1, detail: "Check the floor, restrooms, trash, cooler, coffee, fountain, and obvious disasters." },
    { id: "dates-close", title: "Fresh food / cooler date pass", area: "Fresh", minutes: 14, priority: 2, detail: "Check open-air and obvious fresh items so tomorrow does not inherit a tiny crime scene." },
    { id: "coffee-fountain-close", title: "Coffee and fountain close reset", area: "Guest", minutes: 10, priority: 3, detail: "Clean and stock enough that morning does not curse your name." },
    { id: "restrooms-close", title: "Restrooms, trash, and floor", area: "Guest", minutes: 16, priority: 4, detail: "Restrooms stocked, trash handled, wet floors checked, and floor presentable." },
    { id: "lock-doors", title: "Lock doors / closing timing", area: "Close", minutes: 5, priority: 5, detail: "Use the store process for closing timing. Do not wing policy because capitalism has paperwork." },
    { id: "handoff-close", title: "Closing handoff note", area: "Closeout", minutes: 8, priority: 8, detail: "Log what is complete, what carried over, and any incident or delay." }
  ]
};

const WEEKLY_TASKS = {
  0: [{ id: "outs", title: "Sunday outs check", area: "Weekly", minutes: 20, priority: 2, detail: "Get outs done today so Monday does not arrive wearing brass knuckles." }],
  1: [{ id: "store-order", title: "Store order by 2 PM", area: "Weekly", minutes: 35, priority: 1, due: "2:00 PM", detail: "Main Monday deadline. Protect time for this." }],
  2: [
    { id: "cig-audit", title: "Cigarette audits", area: "Weekly", minutes: 120, priority: 1, detail: "Tuesday audit block. Do this separately and do not let the store eat the whole window." },
    { id: "backstock", title: "Backstock and back room reset", area: "Weekly", minutes: 35, priority: 4, detail: "Put backstock out, clear obvious clutter, and make the back room less haunted." }
  ],
  3: [
    { id: "truck-prep", title: "Truck prep and walkway clear", area: "Truck", minutes: 20, priority: 2, detail: "Carts/dollies ready, back walkway clear, receiving area sane." },
    { id: "truck-triage", title: "Truck triage", area: "Truck", minutes: 35, priority: 3, detail: "Prioritize what affects customers first, then back room organization." }
  ]
};

const WALK_ITEMS = [
  { id: "front-doors", label: "Front doors / entry" },
  { id: "restrooms", label: "Restrooms" },
  { id: "cooler", label: "Cooler / open-air" },
  { id: "coffee", label: "Coffee area" },
  { id: "fountain", label: "Fountain / BIBs" },
  { id: "trash", label: "Trash" },
  { id: "floors", label: "Wet floors / safety" },
  { id: "customer-issues", label: "Obvious customer-facing fires" }
];

const ui = {
  status: document.querySelector("#system-status"),
  shiftLabel: document.querySelector("#shift-label"),
  dateLabel: document.querySelector("#date-label"),
  nextTitle: document.querySelector("#next-title"),
  nextCopy: document.querySelector("#next-copy"),
  completeNext: document.querySelector("#complete-next"),
  openReport: document.querySelector("#open-report"),
  progressText: document.querySelector("#progress-text"),
  progressFill: document.querySelector("#progress-fill"),
  progressRingText: document.querySelector("#progress-ring-text"),
  progressRing: document.querySelector(".progress-ring"),
  progressSubtext: document.querySelector("#progress-subtext"),
  screenEyebrow: document.querySelector("#screen-eyebrow"),
  screenTitle: document.querySelector("#screen-title"),
  screenContent: document.querySelector("#screen-content"),
  copyOutput: document.querySelector("#copy-output"),
  navButtons: document.querySelectorAll(".nav-button"),
  shiftButtons: document.querySelectorAll(".shift-button"),
  voiceFab: document.querySelector("#voice-fab"),
  voiceSheet: document.querySelector("#voice-sheet"),
  closeVoiceSheet: document.querySelector("#close-voice-sheet"),
  voiceCaptureText: document.querySelector("#voice-capture-text"),
  startGlobalSpeech: document.querySelector("#start-global-speech"),
  saveCaptureTask: document.querySelector("#save-capture-task"),
  saveCaptureNote: document.querySelector("#save-capture-note")
};

let currentScreen = "next";
let generatedReport = "";
let currentShift = readJSON(STORAGE.shift, getDefaultShift());

init();

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

function getDefaultShift() {
  const hour = new Date().getHours();
  if (hour < 10) return "morning";
  if (hour < 16) return "mid";
  return "close";
}

function setShift(shift) {
  currentShift = shift;
  writeJSON(STORAGE.shift, shift);
  setStatus(`${SHIFT_LABELS[shift]} shift`);
  renderAll();
}

function getDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getShiftKey() {
  return `${getDateKey()}:${currentShift}`;
}

function getTasks() {
  const day = new Date().getDay();
  const base = TASKS_BY_SHIFT[currentShift] || TASKS_BY_SHIFT.morning;
  const weekly = currentShift === "morning" ? (WEEKLY_TASKS[day] || []) : [];
  const custom = getCustomTasks();
  return [...base, ...weekly, ...custom].sort((a, b) => a.priority - b.priority);
}

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getCompleted() {
  return readJSON(STORAGE.completed, {})[getShiftKey()] || [];
}

function setCompleted(ids) {
  const all = readJSON(STORAGE.completed, {});
  all[getShiftKey()] = [...new Set(ids)];
  writeJSON(STORAGE.completed, all);
}

function getCustomTasks() {
  return readJSON(STORAGE.customTasks, {})[getShiftKey()] || [];
}

function setCustomTasks(tasks) {
  const all = readJSON(STORAGE.customTasks, {});
  all[getShiftKey()] = tasks;
  writeJSON(STORAGE.customTasks, all);
}

function addCustomTask(title, detail = "Added during shift.", area = "Added") {
  const clean = String(title || "").trim();
  if (!clean) return false;
  const task = {
    id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: clean,
    area,
    minutes: 8,
    priority: 40 + getCustomTasks().length,
    detail
  };
  setCustomTasks([...getCustomTasks(), task]);
  return true;
}

function getNextTask() {
  const completed = new Set(getCompleted());
  return getTasks().find((task) => !completed.has(task.id)) || null;
}

function handleCompleteNext() {
  const task = getNextTask();
  if (!task) return;
  if (task.id === "morning-walk") {
    openScreen("tasks");
    setStatus("Finish walk checklist");
    return;
  }
  completeTask(task.id);
}

function completeTask(id) {
  if (!id) return;
  setCompleted([...getCompleted(), id]);
  setStatus("Marked done");
  renderAll();
}

function reopenTask(id) {
  setCompleted(getCompleted().filter((taskId) => taskId !== id));
  setStatus("Task reopened");
  renderAll();
}

function renderAll() {
  ui.shiftLabel.textContent = SHIFT_LABELS[currentShift];
  ui.shiftButtons.forEach((button) => button.classList.toggle("active", button.dataset.shift === currentShift));
  renderHero();
  renderProgress();
  renderScreen();
  updateNav();
}

function renderHero() {
  const task = getNextTask();
  if (!task) {
    ui.nextTitle.textContent = "Shift core complete";
    ui.nextCopy.textContent = "The main list is handled. Add a log note or do a final walk before the universe invents another problem.";
    ui.completeNext.disabled = true;
    return;
  }
  ui.completeNext.disabled = false;
  ui.nextTitle.textContent = task.title;
  ui.nextCopy.textContent = `${task.detail} ${task.due ? `Due: ${task.due}.` : ""}`;
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

function openScreen(screen) {
  currentScreen = screen;
  ui.copyOutput.hidden = true;
  renderAll();
}

function updateNav() {
  ui.navButtons.forEach((button) => button.classList.toggle("active", button.dataset.screen === currentScreen));
}

function renderScreen() {
  const labels = {
    next: ["Command", "Next"],
    tasks: ["Checklist", "Tasks"],
    report: ["Incident", "Report"],
    log: ["History", "Log"],
    voice: ["Capture", "Voice"]
  };
  const [eyebrow, title] = labels[currentScreen] || labels.next;
  ui.screenEyebrow.textContent = eyebrow;
  ui.screenTitle.textContent = title;
  ui.screenContent.innerHTML = "";
  if (currentScreen === "next") renderNextScreen();
  if (currentScreen === "tasks") renderTasksScreen();
  if (currentScreen === "report") renderReportScreen();
  if (currentScreen === "log") renderLogScreen();
  if (currentScreen === "voice") renderVoiceScreen();
}

function renderNextScreen() {
  const task = getNextTask();
  if (!task) {
    ui.screenContent.innerHTML = `<div class="empty-state"><strong>No urgent task left.</strong><p>Do a quick floor scan, then write a handoff note. Try not to look too victorious. The store can sense it.</p></div>`;
    return;
  }
  ui.screenContent.innerHTML = taskCard(task, false, true);
  ui.screenContent.querySelector("button")?.addEventListener("click", () => handleTaskButton(task));
}

function renderTasksScreen() {
  const completed = new Set(getCompleted());
  const tasks = getTasks();
  ui.screenContent.innerHTML = tasks.map((task) => task.id === "morning-walk" ? walkCard(completed.has(task.id)) : taskCard(task, completed.has(task.id), true)).join("");
  ui.screenContent.querySelectorAll("button[data-task]").forEach((button) => {
    button.addEventListener("click", () => {
      const task = tasks.find((item) => item.id === button.dataset.task);
      if (!task) return;
      completed.has(task.id) ? reopenTask(task.id) : handleTaskButton(task);
    });
  });
  ui.screenContent.querySelector("#finish-walk")?.addEventListener("click", finishMorningWalk);
}

function handleTaskButton(task) {
  if (task.id === "morning-walk") {
    openScreen("tasks");
    return;
  }
  completeTask(task.id);
}

function taskCard(task, done, withButton) {
  return `
    <article class="task-row ${done ? "done" : ""}">
      <div class="task-check" aria-hidden="true"></div>
      <div>
        <div class="task-title">${escapeHTML(task.title)}</div>
        <div class="task-meta">${escapeHTML(task.area)} · ${task.minutes} min${task.due ? ` · due ${escapeHTML(task.due)}` : ""}</div>
      </div>
      ${withButton ? `<button class="mini-button" type="button" data-task="${task.id}">${done ? "Undo" : task.id === "morning-walk" ? "Open" : "Done"}</button>` : `<span class="badge">${escapeHTML(task.area)}</span>`}
    </article>`;
}

function walkCard(done) {
  return `
    <article class="walk-card ${done ? "done" : ""}">
      <div class="screen-header">
        <div>
          <div class="task-title">Morning walk transfer checklist</div>
          <div class="task-meta">Check what is complete. Anything unchecked becomes a follow-up task.</div>
        </div>
        <span class="badge">Walk</span>
      </div>
      <div class="walk-list">
        ${WALK_ITEMS.map((item) => `<label class="walk-item"><input type="checkbox" data-walk-item="${item.id}" checked /> ${escapeHTML(item.label)}</label>`).join("")}
      </div>
      <div class="action-row"><button class="primary-action" type="button" id="finish-walk">Finish Walk + Transfer</button></div>
    </article>`;
}

function finishMorningWalk() {
  const unchecked = [...document.querySelectorAll("[data-walk-item]")].filter((box) => !box.checked);
  unchecked.forEach((box) => {
    const item = WALK_ITEMS.find((walkItem) => walkItem.id === box.dataset.walkItem);
    if (item) addCustomTask(`Follow up: ${item.label}`, "Created from the morning walk because this was not complete yet.", "Follow-up");
  });
  completeTask("morning-walk");
  setStatus(unchecked.length ? `${unchecked.length} follow-up added` : "Walk complete");
}

function renderReportScreen() {
  ui.screenContent.innerHTML = `
    <form class="form-grid" id="report-form">
      <label>Type
        <select name="type"><option>System outage</option><option>Short staffed</option><option>Safety issue</option><option>Customer incident</option><option>Delayed work</option><option>Other</option></select>
      </label>
      <label>What happened
        <textarea name="summary" placeholder="Power outage, water leak, short staffed, IT call, delayed bookwork..."></textarea>
      </label>
      <label>Who was notified
        <input name="notified" placeholder="Loretta, Richard, IT, maintenance..." />
      </label>
      <label>What got delayed
        <textarea name="delayed" placeholder="Bookwork, cooler, dates, cleaning, truck, etc."></textarea>
      </label>
      <div class="action-row"><button class="primary-action" type="submit">Generate</button><button class="secondary-action" type="button" id="save-report">Save</button></div>
    </form>
    <div class="report-output" id="report-output">Generated report will appear here.</div>`;
  const form = document.querySelector("#report-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    generatedReport = buildReport(new FormData(form));
    document.querySelector("#report-output").textContent = generatedReport;
    ui.copyOutput.hidden = false;
  });
  document.querySelector("#save-report").addEventListener("click", () => {
    generatedReport = generatedReport || buildReport(new FormData(form));
    saveItem(STORAGE.reports, generatedReport);
    setStatus("Report saved");
    openScreen("log");
  });
}

function buildReport(data) {
  return `Update from Jamison - ${new Date().toLocaleString()}\n\nShift: ${SHIFT_LABELS[currentShift]}\n\nType: ${data.get("type") || "Incident"}\n\nWhat happened:\n${data.get("summary") || "No summary entered."}\n\nWho was notified:\n${data.get("notified") || "Not listed."}\n\nWork delayed or impacted:\n${data.get("delayed") || "Not listed."}\n\nNo reply needed unless you want me to handle this differently.`;
}

function renderLogScreen() {
  const notes = readJSON(STORAGE.notes, []);
  const reports = readJSON(STORAGE.reports, []);
  const items = [...reports.map((text) => ({ type: "Report", text })), ...notes.map((text) => ({ type: "Note", text }))].slice(-8).reverse();
  const handoff = buildHandoffMessage();

  ui.screenContent.innerHTML = `
    <article class="handoff-card">
      <div class="screen-header">
        <div>
          <p class="eyebrow">END OF SHIFT</p>
          <h3>Positive handoff</h3>
        </div>
        <span class="badge">Text ready</span>
      </div>
      <p class="helper-text">A polished wrap-up you can send to Loretta and/or Richard. Completed work comes first; follow-ups are framed as priorities identified.</p>
      <div class="handoff-preview">${escapeHTML(handoff).replace(/\n/g, "<br>")}</div>
      <div class="action-row">
        <button class="primary-action" type="button" id="share-handoff">Text / Share</button>
        <button class="secondary-action" type="button" id="copy-handoff">Copy</button>
      </div>
    </article>
    ${items.length ? items.map((item) => `<article class="note-row"><span class="badge">${item.type}</span><p>${escapeHTML(item.text).replace(/\n/g, "<br>")}</p></article>`).join("") : `<div class="empty-state"><strong>No saved notes yet.</strong><p>Voice notes and saved reports will show here below the handoff.</p></div>`}`;

  document.querySelector("#share-handoff")?.addEventListener("click", () => shareHandoffText(handoff));
  document.querySelector("#copy-handoff")?.addEventListener("click", () => copyText(handoff));
}

function buildHandoffMessage() {
  const tasks = getTasks();
  const completedIds = new Set(getCompleted());
  const completedTasks = tasks.filter((task) => completedIds.has(task.id));
  const openTasks = tasks.filter((task) => !completedIds.has(task.id));
  const completedLines = completedTasks.length
    ? completedTasks.slice(0, 12).map((task) => `• ${task.title}`).join("\n")
    : "• Started the shift priorities and kept the store moving while identifying what needed attention.";
  const followUpLines = openTasks.length
    ? openTasks.slice(0, 8).map((task) => `• ${task.title}`).join("\n")
    : "• No major follow-ups from the planned list at this time.";

  return `Good ${getDayPart()}, quick ${SHIFT_LABELS[currentShift].toLowerCase()} shift update from Jamison.\n\nI was able to complete ${completedTasks.length} of ${tasks.length} planned items for this shift, including:\n${completedLines}\n\nFollow-ups identified / still watching:\n${followUpLines}\n\nI prioritized the highest-impact customer-facing and operational items first and kept notes in Store Pilot as things came up. No reply needed unless you want anything handled differently.`;
}

function getDayPart() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

async function shareHandoffText(text) {
  if (navigator.share) {
    try {
      await navigator.share({ title: "Shift handoff", text });
      setStatus("Share opened");
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }
  window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
  setStatus("Opening messages");
}

function renderVoiceScreen() {
  ui.screenContent.innerHTML = `
    <div class="form-grid">
      <p class="helper-text">The fastest way is the floating + Voice button, available on every screen. This page is here when you want a bigger note box.</p>
      <label>Quick task or note
        <textarea id="voice-note" placeholder="Add cooler doors need cleaned, restrooms need paper, coffee area needs cups..."></textarea>
      </label>
      <div class="action-row"><button class="primary-action" type="button" id="save-note-task">Save as Task</button><button class="secondary-action" type="button" id="save-note">Save Note</button><button class="secondary-action" type="button" id="start-speech">Start Speech</button></div>
    </div>`;
  const note = document.querySelector("#voice-note");
  document.querySelector("#save-note-task").addEventListener("click", () => saveTextAsTask(note));
  document.querySelector("#save-note").addEventListener("click", () => saveTextAsNote(note));
  document.querySelector("#start-speech").addEventListener("click", () => startSpeech(note));
}

function openVoiceSheet() {
  ui.voiceSheet.classList.add("open");
  ui.voiceSheet.setAttribute("aria-hidden", "false");
  ui.voiceCaptureText.focus();
}

function closeVoiceSheet() {
  ui.voiceSheet.classList.remove("open");
  ui.voiceSheet.setAttribute("aria-hidden", "true");
}

function saveCaptureAsTask() {
  if (saveTextAsTask(ui.voiceCaptureText)) closeVoiceSheet();
}

function saveCaptureAsNote() {
  if (saveTextAsNote(ui.voiceCaptureText)) closeVoiceSheet();
}

function saveTextAsTask(textarea) {
  const value = textarea.value.trim();
  if (!value) return setStatus("Nothing to save"), false;
  const title = value.replace(/^add\s+/i, "").slice(0, 90);
  addCustomTask(title, `Added by voice/text on ${new Date().toLocaleString()}.`, "Voice");
  textarea.value = "";
  setStatus("Task added");
  openScreen("tasks");
  return true;
}

function saveTextAsNote(textarea) {
  const value = textarea.value.trim();
  if (!value) return setStatus("Nothing to save"), false;
  saveItem(STORAGE.notes, `${new Date().toLocaleString()} (${SHIFT_LABELS[currentShift]})\n${value}`);
  textarea.value = "";
  setStatus("Note saved");
  return true;
}

function startSpeech(target) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setStatus("Use keyboard dictation");
    target.focus();
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.onresult = (event) => {
    target.value = Array.from(event.results).map((result) => result[0].transcript).join(" ");
  };
  recognition.onend = () => setStatus("Speech captured");
  recognition.start();
  setStatus("Listening");
}

function saveItem(key, value) {
  const items = readJSON(key, []);
  items.push(value);
  writeJSON(key, items.slice(-50));
}

async function copyGeneratedOutput() {
  if (!generatedReport) return;
  await copyText(generatedReport);
}

async function copyText(text) {
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  setStatus("Copied");
}

function setStatus(text) {
  ui.status.textContent = text;
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => { ui.status.textContent = "Ready"; }, 1600);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}
