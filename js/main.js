const STORAGE = {
  completed: "storePilot.completed.v4",
  notes: "storePilot.notes.v4",
  reports: "storePilot.reports.v4"
};

const BASE_TASKS = [
  { id: "bookwork", title: "Bookwork / SmartSafe match", area: "Opening", minutes: 18, priority: 1, detail: "Verify SmartSafe, deposits, lottery, and starting cash before the floor steals your soul." },
  { id: "smart-counts", title: "Smart Counts", area: "Inventory", minutes: 14, priority: 2, detail: "Do Smart Counts early while your attention still has some dignity." },
  { id: "lto", title: "LTO screenshot to Loretta", area: "Admin", minutes: 6, priority: 3, due: "10:00 AM", detail: "Send the daily LTO screenshot before Richard becomes a weather system." },
  { id: "daily-walk", title: "Daily walk and obvious fires check", area: "Floor", minutes: 10, priority: 4, detail: "Front doors, restrooms, cooler, coffee, fountain, trash, wet floors, and anything customers can weaponize emotionally." },
  { id: "coffee-fountain", title: "Coffee and fountain reset", area: "Guest", minutes: 12, priority: 5, detail: "Cups, lids, straws, coffee area, fountain area, and BIBs if something is dramatic." },
  { id: "open-air", title: "Open-air cooler dates", area: "Fresh", minutes: 12, priority: 6, detail: "Check dates, face product, rotate anything trying to become archaeology." },
  { id: "food-warmers", title: "Food warmers check", area: "Fresh", minutes: 8, priority: 7, detail: "Check quality, holding, labels, and presentation." },
  { id: "restrooms", title: "Restroom rescue pass", area: "Guest", minutes: 9, priority: 8, detail: "Quick clean, supplies, trash, smell check. Glamorous leadership, naturally." },
  { id: "shift-note", title: "Shift note / handoff", area: "Closeout", minutes: 7, priority: 9, detail: "Capture what happened, what moved, what got delayed, and who was notified." }
];

const WEEKLY_TASKS = {
  0: [
    { id: "outs", title: "Sunday outs check", area: "Weekly", minutes: 20, priority: 2, detail: "Get outs done today so Monday does not arrive wearing brass knuckles." }
  ],
  1: [
    { id: "store-order", title: "Store order by 2 PM", area: "Weekly", minutes: 35, priority: 1, due: "2:00 PM", detail: "Main Monday deadline. Protect time for this." }
  ],
  2: [
    { id: "cig-audit", title: "Cigarette audits", area: "Weekly", minutes: 120, priority: 1, detail: "Tuesday audit block. Do this separately and do not let the store eat the whole window." },
    { id: "backstock", title: "Backstock and back room reset", area: "Weekly", minutes: 35, priority: 4, detail: "Put backstock out, clear obvious clutter, and make the back room less haunted." }
  ],
  3: [
    { id: "truck-prep", title: "Truck prep and walkway clear", area: "Truck", minutes: 20, priority: 2, detail: "Carts/dollies ready, back walkway clear, receiving area sane." },
    { id: "truck-triage", title: "Truck triage", area: "Truck", minutes: 35, priority: 3, detail: "Prioritize what affects customers first, then back room organization." }
  ]
};

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
  progressSubtext: document.querySelector("#progress-subtext"),
  screenEyebrow: document.querySelector("#screen-eyebrow"),
  screenTitle: document.querySelector("#screen-title"),
  screenContent: document.querySelector("#screen-content"),
  copyOutput: document.querySelector("#copy-output"),
  navButtons: document.querySelectorAll(".nav-button")
};

let currentScreen = "next";
let generatedReport = "";

init();

function init() {
  ui.dateLabel.textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date());
  ui.shiftLabel.textContent = getShiftLabel();
  ui.navButtons.forEach((button) => button.addEventListener("click", () => openScreen(button.dataset.screen)));
  ui.completeNext.addEventListener("click", () => completeTask(getNextTask()?.id));
  ui.openReport.addEventListener("click", () => openScreen("report"));
  ui.copyOutput.addEventListener("click", copyGeneratedOutput);
  renderAll();
}

function getDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getShiftLabel() {
  const hour = new Date().getHours();
  if (hour < 10) return "Opening";
  if (hour < 16) return "Mid Shift";
  return "Evening";
}

function getTasks() {
  const day = new Date().getDay();
  return [...BASE_TASKS, ...(WEEKLY_TASKS[day] || [])].sort((a, b) => a.priority - b.priority);
}

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getCompleted() {
  return readJSON(STORAGE.completed, {})[getDateKey()] || [];
}

function setCompleted(ids) {
  const all = readJSON(STORAGE.completed, {});
  all[getDateKey()] = [...new Set(ids)];
  writeJSON(STORAGE.completed, all);
}

function getNextTask() {
  const completed = new Set(getCompleted());
  return getTasks().find((task) => !completed.has(task.id)) || null;
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
  ui.progressSubtext.textContent = `${completed.length} of ${tasks.length} planned tasks complete.`;
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
  ui.screenContent.querySelector("button")?.addEventListener("click", () => completeTask(task.id));
}

function renderTasksScreen() {
  const completed = new Set(getCompleted());
  ui.screenContent.innerHTML = getTasks().map((task) => taskCard(task, completed.has(task.id), true)).join("");
  ui.screenContent.querySelectorAll("button[data-task]").forEach((button) => {
    button.addEventListener("click", () => completed.has(button.dataset.task) ? reopenTask(button.dataset.task) : completeTask(button.dataset.task));
  });
}

function taskCard(task, done, withButton) {
  return `
    <article class="task-row ${done ? "done" : ""}">
      <div class="task-check" aria-hidden="true"></div>
      <div>
        <div class="task-title">${escapeHTML(task.title)}</div>
        <div class="task-meta">${escapeHTML(task.area)} · ${task.minutes} min${task.due ? ` · due ${escapeHTML(task.due)}` : ""}</div>
      </div>
      ${withButton ? `<button class="mini-button" type="button" data-task="${task.id}">${done ? "Undo" : "Done"}</button>` : `<span class="badge">${escapeHTML(task.area)}</span>`}
    </article>`;
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
  return `Update from Jamison - ${new Date().toLocaleString()}\n\nType: ${data.get("type") || "Incident"}\n\nWhat happened:\n${data.get("summary") || "No summary entered."}\n\nWho was notified:\n${data.get("notified") || "Not listed."}\n\nWork delayed or impacted:\n${data.get("delayed") || "Not listed."}\n\nNo reply needed unless you want me to handle this differently.`;
}

function renderLogScreen() {
  const notes = readJSON(STORAGE.notes, []);
  const reports = readJSON(STORAGE.reports, []);
  const items = [
    ...reports.map((text) => ({ type: "Report", text })),
    ...notes.map((text) => ({ type: "Note", text }))
  ].slice(-8).reverse();
  if (!items.length) {
    ui.screenContent.innerHTML = `<div class="empty-state"><strong>No log entries yet.</strong><p>Voice notes and saved reports will show here.</p></div>`;
    return;
  }
  ui.screenContent.innerHTML = items.map((item) => `<article class="note-row"><span class="badge">${item.type}</span><p>${escapeHTML(item.text).replace(/\n/g, "<br>")}</p></article>`).join("");
}

function renderVoiceScreen() {
  ui.screenContent.innerHTML = `
    <div class="form-grid">
      <label>Quick note
        <textarea id="voice-note" placeholder="Type a note, or use dictation on your keyboard."></textarea>
      </label>
      <div class="action-row"><button class="primary-action" type="button" id="save-note">Save Note</button><button class="secondary-action" type="button" id="start-speech">Start Speech</button></div>
    </div>`;
  const note = document.querySelector("#voice-note");
  document.querySelector("#save-note").addEventListener("click", () => {
    if (!note.value.trim()) return setStatus("Nothing to save");
    saveItem(STORAGE.notes, `${new Date().toLocaleString()}\n${note.value.trim()}`);
    note.value = "";
    setStatus("Note saved");
  });
  document.querySelector("#start-speech").addEventListener("click", () => startSpeech(note));
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
  await navigator.clipboard?.writeText(generatedReport);
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
