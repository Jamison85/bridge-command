const NOTES_SCREEN_RELEASE = "command-center-27";
const NOTES_KEYS = {
  notes: "storePilot.lorettaNotes.v1",
  scratchpad: "storePilot.dailyScratchpad.v1",
  shift: "storePilot.shift.v6"
};
const NOTES_SHIFT_LABELS = { morning: "Morning", mid: "Mid", close: "Close" };

let notesScreenObserver = null;
let notesRenderQueued = false;
let renderingNotesOwner = false;

function notesRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function notesWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function notesEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function notesDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function notesShift() {
  const shift = notesRead(NOTES_KEYS.shift, "morning");
  return NOTES_SHIFT_LABELS[shift] ? shift : "morning";
}

function notesShiftKey() {
  return `${notesDateKey()}:${notesShift()}`;
}

function notesScreenActive() {
  return document.querySelector('[data-screen="voice"]')?.classList.contains("active") === true;
}

function openLorettaNotes() {
  window.StorePilotLorettaInbox?.open?.();
}

function openTaskCapture() {
  const quickTask = document.querySelector('[data-open-capture="task"]');
  if (quickTask) quickTask.click();
  else document.querySelector("#voice-fab")?.click();
}

function formatNoteDate(key) {
  const [year, month, day] = String(key || "").split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day, 12, 0, 0, 0) : null;
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(date)
    : "No date";
}

function openLorettaNotesList() {
  const notes = notesRead(NOTES_KEYS.notes, []);
  return Array.isArray(notes) ? notes.filter((note) => note?.status !== "archived") : [];
}

function lorettaNotesHTML(notes) {
  if (!notes.length) {
    return `<div class="loretta-empty"><strong>No Loretta notes yet.</strong><span>Anything she gives you later will land here with its scheduled task.</span></div>`;
  }
  return notes.slice(0, 40).map((note) => `
    <article class="loretta-note-card" data-loretta-note="${notesEscape(note.id)}">
      <div class="loretta-note-head">
        <strong>${notesEscape(note.text)}</strong>
        <button type="button" data-notes-archive="${notesEscape(note.id)}">Done</button>
      </div>
      <div class="loretta-note-dates">${(note.scheduledDates || []).map((date) => `<span>${notesEscape(formatNoteDate(date))}</span>`).join("")}</div>
      <p>${(note.taskRefs || []).length} task${(note.taskRefs || []).length === 1 ? "" : "s"} automatically added.</p>
    </article>`).join("");
}

function scratchpadPage() {
  const pages = notesRead(NOTES_KEYS.scratchpad, {});
  return pages?.[notesShiftKey()] || { text: "", updatedAt: "" };
}

function scratchpadSavedLabel(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? "Ready" : `Saved ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function scratchpadHTML() {
  const page = scratchpadPage();
  const shift = notesShift();
  return `
    <section class="daily-scratchpad" id="daily-scratchpad" data-scratchpad-key="${notesEscape(notesShiftKey())}">
      <div class="scratchpad-head">
        <div><p>DAILY SCRATCHPAD</p><h3>Dump notes here</h3><span>${notesEscape(new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date()))} · ${notesEscape(NOTES_SHIFT_LABELS[shift])}</span></div>
        <strong data-scratchpad-status>${notesEscape(scratchpadSavedLabel(page.updatedAt))}</strong>
      </div>
      <textarea id="daily-scratchpad-text" spellcheck="true" placeholder="Random notes, lists, names, numbers, things to check, things somebody said...">${notesEscape(page.text)}</textarea>
      <div class="scratchpad-tools" aria-label="Scratchpad tools">
        <button type="button" data-scratchpad-action="bullet">+ Bullet</button>
        <button type="button" data-scratchpad-action="timestamp">+ Time</button>
        <button type="button" data-scratchpad-action="task">Selected → Task</button>
        <button type="button" data-scratchpad-action="copy">Copy all</button>
        <button type="button" class="scratchpad-clear" data-scratchpad-action="clear">Clear</button>
      </div>
      <p class="scratchpad-help">Autosaves to this date and selected shift. Select words or place the cursor on a line to turn that line into a task.</p>
    </section>`;
}

function renderNotesScreen(force = false) {
  if (renderingNotesOwner || !notesScreenActive()) return false;
  const content = document.querySelector("#screen-content");
  if (!content) return false;
  const existing = content.querySelector("#loretta-notes-screen[data-notes-owner]");
  if (existing && !force && existing.dataset.shiftKey === notesShiftKey()) return true;

  const notes = openLorettaNotesList();
  const currentText = content.querySelector("#daily-scratchpad-text")?.value;
  renderingNotesOwner = true;
  try {
    const eyebrow = document.querySelector("#screen-eyebrow");
    const title = document.querySelector("#screen-title");
    if (eyebrow) eyebrow.textContent = "CAPTURE";
    if (title) title.textContent = "Notes";
    content.innerHTML = `
      <section id="loretta-notes-screen" class="loretta-notes-screen notes-owner-screen" data-notes-owner="${NOTES_SCREEN_RELEASE}" data-shift-key="${notesEscape(notesShiftKey())}">
        ${scratchpadHTML()}
        <section class="notes-capture-panel" aria-label="Quick capture">
          <div class="notes-capture-copy"><p>QUICK CAPTURE</p><h3>Turn words into action</h3><span>Add a normal task or capture Loretta's instructions with automatic dates.</span></div>
          <div class="loretta-screen-actions">
            <button type="button" data-notes-add="task">+ Add Task</button>
            <button type="button" class="notes-loretta-action" data-notes-add="note">Mic Loretta Notes</button>
          </div>
        </section>
        <section class="notes-inbox-panel">
          <div class="loretta-screen-head"><div><p>LORETTA INBOX</p><h3>Notes and scheduled tasks</h3></div><span>${notes.length} open</span></div>
          <div class="loretta-note-list">${lorettaNotesHTML(notes)}</div>
        </section>
      </section>`;
    if (typeof currentText === "string") {
      const textarea = content.querySelector("#daily-scratchpad-text");
      if (textarea) textarea.value = currentText;
    }
    window.dispatchEvent(new CustomEvent("storepilot:notes-rendered", { detail: { shiftKey: notesShiftKey() } }));
    return true;
  } finally {
    renderingNotesOwner = false;
  }
}

function archiveLorettaNote(noteId) {
  const notes = notesRead(NOTES_KEYS.notes, []);
  const index = Array.isArray(notes) ? notes.findIndex((note) => String(note?.id || "") === String(noteId || "")) : -1;
  if (index < 0) return;
  notes[index] = { ...notes[index], status: "archived", updatedAt: new Date().toISOString() };
  notesWrite(NOTES_KEYS.notes, notes);
  const status = document.querySelector("#system-status");
  if (status) status.textContent = "Loretta note marked done";
  renderNotesScreen(true);
}

function handleNotesClick(event) {
  const add = event.target.closest?.("[data-notes-add]");
  if (add) {
    event.preventDefault();
    if (add.dataset.notesAdd === "note") openLorettaNotes();
    else openTaskCapture();
    return;
  }
  const archive = event.target.closest?.("[data-notes-archive]");
  if (archive) {
    event.preventDefault();
    archiveLorettaNote(archive.dataset.notesArchive);
    return;
  }
  if (event.target.closest?.('[data-screen="voice"], .shift-button')) setTimeout(() => queueNotesRender(true), 40);
}

function queueNotesRender(force = false) {
  if (notesRenderQueued && !force) return;
  notesRenderQueued = true;
  requestAnimationFrame(() => {
    notesRenderQueued = false;
    renderNotesScreen(force);
  });
}

function startNotesOwner() {
  document.documentElement.dataset.notesOwner = NOTES_SCREEN_RELEASE;
  document.addEventListener("click", handleNotesClick, true);
  const content = document.querySelector("#screen-content");
  if (content) {
    notesScreenObserver = new MutationObserver(() => {
      if (!renderingNotesOwner && notesScreenActive() && !content.querySelector("#loretta-notes-screen[data-notes-owner]")) queueNotesRender(true);
    });
    notesScreenObserver.observe(content, { childList: true, subtree: false });
  }
  window.addEventListener("storage", (event) => {
    if (!event.key || Object.values(NOTES_KEYS).includes(event.key)) queueNotesRender(true);
  });
  window.addEventListener("storepilot:notes-changed", () => queueNotesRender(true));
  queueNotesRender(true);
}

window.StorePilotNotesScreen = {
  version: NOTES_SCREEN_RELEASE,
  render: () => renderNotesScreen(true),
  openTask: openTaskCapture,
  openLoretta: openLorettaNotes
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startNotesOwner, { once: true });
else startNotesOwner();
