const LORETTA_KEYS = {
  notes: "storePilot.lorettaNotes.v1",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6"
};
const SHIFT_LABELS = { morning: "Morning", mid: "Mid", close: "Close" };
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
  may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7,
  september: 8, sept: 8, sep: 8, october: 9, oct: 9, november: 10, nov: 10,
  december: 11, dec: 11
};
let captureMode = "task";
let speechRecognition = null;
let lastFocused = null;

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}
function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  result.setHours(12, 0, 0, 0);
  return result;
}
function uniqueDateKeys(dates) { return [...new Set(dates.filter(Boolean).map(dateKey))].sort(); }
function weekendDates(base, nextWeekend = false) {
  const day = base.getDay();
  let saturday;
  if (day === 6) saturday = new Date(base);
  else if (day === 0) {
    if (nextWeekend) saturday = addDays(base, 6);
    else return [new Date(base)];
  } else saturday = addDays(base, 6 - day);
  if (nextWeekend && day !== 0) saturday = addDays(saturday, 7);
  return [saturday, addDays(saturday, 1)];
}
function nextWeekday(base, weekdayIndex, allowToday = false) {
  let delta = (weekdayIndex - base.getDay() + 7) % 7;
  if (delta === 0 && !allowToday) delta = 7;
  return addDays(base, delta);
}
function parseExplicitDate(text, base) {
  const numeric = text.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
  if (numeric) {
    let year = numeric[3] ? Number(numeric[3]) : base.getFullYear();
    if (year < 100) year += 2000;
    const result = new Date(year, Number(numeric[1]) - 1, Number(numeric[2]), 12, 0, 0, 0);
    if (!numeric[3] && result < addDays(base, -1)) result.setFullYear(result.getFullYear() + 1);
    return result;
  }
  const monthNames = Object.keys(MONTHS).join("|");
  const named = text.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, "i"));
  if (!named) return null;
  const result = new Date(named[3] ? Number(named[3]) : base.getFullYear(), MONTHS[named[1].toLowerCase()], Number(named[2]), 12, 0, 0, 0);
  if (!named[3] && result < addDays(base, -1)) result.setFullYear(result.getFullYear() + 1);
  return result;
}
function resolveDates(text, baseDate = new Date()) {
  const value = String(text || "").toLowerCase();
  const base = new Date(baseDate);
  base.setHours(12, 0, 0, 0);
  const dates = [];
  const explicit = parseExplicitDate(value, base);
  if (explicit) dates.push(explicit);
  const inDays = value.match(/\bin\s+(\d+)\s+days?\b/);
  if (inDays) dates.push(addDays(base, Number(inDays[1])));
  if (/\bday after tomorrow\b/.test(value)) dates.push(addDays(base, 2));
  else if (/\btomorrow\b/.test(value)) dates.push(addDays(base, 1));
  else if (/\btoday\b/.test(value)) dates.push(base);
  if (/\bnext weekend\b/.test(value)) dates.push(...weekendDates(base, true));
  else if (/\bthis weekend\b|\bthe weekend\b|\bweekend\b|\bsaturday\s+(?:and|&)\s+sunday\b/.test(value)) dates.push(...weekendDates(base, false));
  WEEKDAYS.forEach((weekday, index) => {
    const nextPattern = new RegExp(`\\bnext\\s+${weekday}\\b`, "i");
    const thisPattern = new RegExp(`\\bthis\\s+${weekday}\\b`, "i");
    const barePattern = new RegExp(`\\b${weekday}\\b`, "i");
    if (nextPattern.test(value)) dates.push(nextWeekday(base, index));
    else if (thisPattern.test(value)) dates.push(nextWeekday(base, index, true));
    else if (barePattern.test(value) && !/saturday\s+(?:and|&)\s+sunday/.test(value)) dates.push(nextWeekday(base, index));
  });
  return uniqueDateKeys(dates);
}
function splitInstructions(raw) {
  return String(raw || "")
    .replace(/\b(?:next note|another note|new note)\b/gi, "\n")
    .replace(/([.!?])\s+/g, "$1\n")
    .replace(/\s+(?:and then|also)\s+(?=(?:take|bring|check|do|order|send|call|make|put|print|count|clean|stock|email|text|ask|follow|move|finish|work)\b)/gi, "\n")
    .split(/\n+|;/)
    .map((item) => item.trim().replace(/^[,.-]+|[,.-]+$/g, "").trim())
    .filter(Boolean);
}
function cleanTaskTitle(text) {
  return String(text || "")
    .replace(/\b(?:today|tomorrow|day after tomorrow|this weekend|next weekend|the weekend|weekend)\b/gi, "")
    .replace(/\b(?:this|next)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, "")
    .replace(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, "")
    .replace(/\bin\s+\d+\s+days?\b/gi, "")
    .replace(/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b/gi, "")
    .replace(/\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b/g, "")
    .replace(/\s+/g, " ").trim().replace(/\b(?:on|for|in)\s*$/i, "").replace(/^[,.-]+|[,.-]+$/g, "").trim();
}
function currentShift() {
  const shift = readJSON(LORETTA_KEYS.shift, "morning");
  return SHIFT_LABELS[shift] ? shift : "morning";
}
function createTasks(text, scheduledDates, source = "Quick Add") {
  const title = cleanTaskTitle(text) || String(text || "").trim();
  if (!title) return [];
  const targets = scheduledDates.length ? scheduledDates : [dateKey()];
  const allTasks = readJSON(LORETTA_KEYS.customTasks, {});
  const refs = [];
  targets.forEach((targetDate, index) => {
    const shift = targetDate === dateKey() ? currentShift() : "morning";
    const key = `${targetDate}:${shift}`;
    const list = Array.isArray(allTasks[key]) ? allTasks[key] : [];
    const id = `custom-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;
    list.push({ id, title, area: source === "Loretta Note" ? "Loretta" : "Added", minutes: 10, priority: 35 + list.length, detail: `${source} scheduled for ${targetDate}.` });
    allTasks[key] = list;
    refs.push({ id, date: targetDate, shift, key });
  });
  writeJSON(LORETTA_KEYS.customTasks, allTasks);
  window.dispatchEvent(new CustomEvent("storepilot:tasks-changed", { detail: { source: "loretta-capture" } }));
  return refs;
}
function saveLorettaNotes(raw) {
  const instructions = splitInstructions(raw);
  const notes = readJSON(LORETTA_KEYS.notes, []);
  const createdAt = new Date().toISOString();
  let taskCount = 0;
  instructions.forEach((text, index) => {
    const scheduledDates = resolveDates(text);
    const targetDates = scheduledDates.length ? scheduledDates : [dateKey()];
    const taskRefs = createTasks(text, targetDates, "Loretta Note");
    taskCount += taskRefs.length;
    notes.unshift({
      id: `loretta-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
      text,
      scheduledDates: targetDates,
      taskRefs,
      source: "Loretta",
      status: "open",
      createdAt,
      updatedAt: createdAt
    });
  });
  writeJSON(LORETTA_KEYS.notes, notes.slice(0, 200));
  window.dispatchEvent(new CustomEvent("storepilot:notes-changed", { detail: { source: "loretta" } }));
  return { noteCount: instructions.length, taskCount };
}
function formatDate(key) {
  const [year, month, day] = String(key || "").split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day, 12, 0, 0, 0) : null;
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(date)
    : "No date";
}
function previewHTML(raw) {
  const instructions = splitInstructions(raw);
  if (!instructions.length) return `<p>No instructions captured yet.</p>`;
  return instructions.map((instruction) => {
    const dates = resolveDates(instruction);
    const targets = dates.length ? dates : [dateKey()];
    return `<div><strong>${escapeHTML(instruction)}</strong><span>Task: ${targets.map(formatDate).join(" + ")}</span></div>`;
  }).join("");
}
function setStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => { status.textContent = "Ready"; }, 2200);
}
function ensureQuickButtons() {
  document.querySelector(".voice-fab")?.classList.add("legacy-voice-hidden");
  let stack = document.querySelector("#quick-capture-stack");
  if (stack) return stack;
  stack = document.createElement("div");
  stack.id = "quick-capture-stack";
  stack.className = "quick-capture-stack";
  stack.innerHTML = `<button type="button" data-open-capture="task">+ Add Task</button><button type="button" class="loretta-button" data-open-capture="note">Mic Loretta Notes</button>`;
  document.body.appendChild(stack);
  return stack;
}
function ensureCaptureSheet() {
  let sheet = document.querySelector("#loretta-capture-sheet");
  if (sheet) return sheet;
  sheet = document.createElement("section");
  sheet.id = "loretta-capture-sheet";
  sheet.className = "loretta-capture-sheet";
  sheet.setAttribute("aria-hidden", "true");
  sheet.innerHTML = `
    <div class="loretta-capture-card" role="dialog" aria-modal="true" aria-labelledby="loretta-capture-title">
      <div class="loretta-capture-head"><div><p>QUICK CAPTURE</p><h2 id="loretta-capture-title">Add Task</h2></div><button type="button" data-capture-close>Close</button></div>
      <div class="loretta-capture-tabs"><button type="button" data-capture-mode="task">Task</button><button type="button" data-capture-mode="note">Loretta Notes</button></div>
      <p class="loretta-helper" id="capture-helper"></p>
      <textarea id="loretta-capture-text" placeholder="Example: Take water in tomorrow"></textarea>
      <div id="loretta-date-preview" class="loretta-date-preview"></div>
      <div class="loretta-capture-actions"><button type="button" class="loretta-mic-button" data-capture-mic>Start Mic</button><button type="button" class="loretta-save-button" data-capture-save>Save</button></div>
      <p class="loretta-tip">For several instructions, pause between sentences or say “next note.” Dates like tomorrow and this weekend are understood automatically.</p>
    </div>`;
  document.body.appendChild(sheet);
  return sheet;
}
function setCaptureMode(mode) {
  captureMode = mode === "note" ? "note" : "task";
  const sheet = ensureCaptureSheet();
  sheet.querySelectorAll("[data-capture-mode]").forEach((button) => button.classList.toggle("active", button.dataset.captureMode === captureMode));
  sheet.querySelector("#loretta-capture-title").textContent = captureMode === "note" ? "Loretta Notes" : "Add Task";
  sheet.querySelector("#capture-helper").textContent = captureMode === "note"
    ? "Speak her instructions once. Each note stays in Notes and its dated task is created automatically."
    : "Type or speak a task. It will be added to the date you mention.";
  sheet.querySelector("[data-capture-save]").textContent = captureMode === "note" ? "Save Notes + Tasks" : "Add Task";
  renderPreview();
}
function openCapture(mode = "task") {
  lastFocused = document.activeElement;
  const sheet = ensureCaptureSheet();
  setCaptureMode(mode);
  sheet.classList.add("open");
  sheet.setAttribute("aria-hidden", "false");
  setTimeout(() => sheet.querySelector("#loretta-capture-text")?.focus(), 80);
}
function closeCapture() {
  speechRecognition?.stop?.();
  speechRecognition = null;
  const sheet = document.querySelector("#loretta-capture-sheet");
  sheet?.classList.remove("open");
  sheet?.setAttribute("aria-hidden", "true");
  lastFocused?.focus?.();
}
function renderPreview() {
  const sheet = ensureCaptureSheet();
  const text = sheet.querySelector("#loretta-capture-text")?.value || "";
  sheet.querySelector("#loretta-date-preview").innerHTML = previewHTML(text);
}
function toggleMic() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const textarea = document.querySelector("#loretta-capture-text");
  const button = document.querySelector("[data-capture-mic]");
  if (!SpeechRecognition) { setStatus("Use keyboard microphone"); textarea?.focus(); return; }
  if (speechRecognition) { speechRecognition.stop(); return; }
  const baseText = textarea?.value.trim() || "";
  speechRecognition = new SpeechRecognition();
  speechRecognition.continuous = true;
  speechRecognition.interimResults = true;
  speechRecognition.lang = "en-US";
  speechRecognition.onstart = () => { if (button) button.textContent = "Stop Mic"; setStatus("Listening"); };
  speechRecognition.onresult = (event) => {
    const finalParts = [];
    const interimParts = [];
    for (let index = 0; index < event.results.length; index += 1) {
      const transcript = event.results[index][0].transcript.trim();
      if (event.results[index].isFinal) finalParts.push(transcript);
      else interimParts.push(transcript);
    }
    if (textarea) textarea.value = [baseText, ...finalParts, interimParts.join(" ")].filter(Boolean).join("\n");
    renderPreview();
  };
  speechRecognition.onerror = () => setStatus("Mic stopped");
  speechRecognition.onend = () => {
    speechRecognition = null;
    if (button) button.textContent = "Start Mic";
    setStatus("Speech captured");
  };
  speechRecognition.start();
}
function saveCapture() {
  const textarea = document.querySelector("#loretta-capture-text");
  const raw = textarea?.value.trim() || "";
  if (!raw) return setStatus("Nothing to save");
  if (captureMode === "note") {
    const result = saveLorettaNotes(raw);
    setStatus(`${result.noteCount} note${result.noteCount === 1 ? "" : "s"}, ${result.taskCount} task${result.taskCount === 1 ? "" : "s"} added`);
  } else {
    const instructions = splitInstructions(raw);
    let taskCount = 0;
    instructions.forEach((instruction) => {
      const dates = resolveDates(instruction);
      taskCount += createTasks(instruction, dates.length ? dates : [dateKey()], "Quick Add").length;
    });
    setStatus(`${taskCount} task${taskCount === 1 ? "" : "s"} added`);
  }
  if (textarea) textarea.value = "";
  renderPreview();
  window.StorePilotNotesScreen?.render?.();
  window.StorePilotCommandCenter?.render?.();
  if (captureMode === "task") closeCapture();
}
function handleClick(event) {
  const open = event.target.closest?.("[data-open-capture]");
  if (open) { event.preventDefault(); openCapture(open.dataset.openCapture); return; }
  if (event.target.closest?.("[data-capture-close]")) { event.preventDefault(); closeCapture(); return; }
  const mode = event.target.closest?.("[data-capture-mode]");
  if (mode) { event.preventDefault(); setCaptureMode(mode.dataset.captureMode); return; }
  if (event.target.closest?.("[data-capture-mic]")) { event.preventDefault(); toggleMic(); return; }
  if (event.target.closest?.("[data-capture-save]")) { event.preventDefault(); saveCapture(); }
}
function start() {
  ensureQuickButtons();
  ensureCaptureSheet();
  document.addEventListener("click", handleClick);
  document.addEventListener("input", (event) => { if (event.target.matches?.("#loretta-capture-text")) renderPreview(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && document.querySelector("#loretta-capture-sheet.open")) closeCapture(); });
  document.documentElement.dataset.lorettaInboxService = "command-center-28";
}
window.StorePilotLorettaInbox = {
  version: "command-center-28",
  resolveDates,
  saveNotes: saveLorettaNotes,
  createTasks,
  open: () => openCapture("note"),
  openTask: () => openCapture("task")
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
