const SCRATCHPAD_KEYS = {
  pages: "storePilot.dailyScratchpad.v1",
  shift: "storePilot.shift.v6",
  customTasks: "storePilot.customTasks.v6"
};

const SCRATCHPAD_SHIFT_LABELS = { morning: "Morning", mid: "Mid", close: "Close" };
let scratchpadRenderQueued = false;
let scratchpadObserver = null;

function scratchpadRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function scratchpadWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function scratchpadEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function scratchpadDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function scratchpadShift() {
  const shift = scratchpadRead(SCRATCHPAD_KEYS.shift, "morning");
  return SCRATCHPAD_SHIFT_LABELS[shift] ? shift : "morning";
}

function scratchpadPageKey() {
  return `${scratchpadDateKey()}:${scratchpadShift()}`;
}

function scratchpadPage() {
  return scratchpadRead(SCRATCHPAD_KEYS.pages, {})[scratchpadPageKey()] || { text: "", updatedAt: "" };
}

function formatScratchpadDate() {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date());
}

function formatSavedTime(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "Ready";
  return `Saved ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function setScratchpadStatus(text) {
  const indicator = document.querySelector("[data-scratchpad-status]");
  if (indicator) indicator.textContent = text;
  const appStatus = document.querySelector("#system-status");
  if (appStatus) {
    appStatus.textContent = text;
    clearTimeout(setScratchpadStatus.timer);
    setScratchpadStatus.timer = setTimeout(() => { appStatus.textContent = "Ready"; }, 1800);
  }
}

function saveScratchpad(text) {
  const all = scratchpadRead(SCRATCHPAD_KEYS.pages, {});
  const updatedAt = new Date().toISOString();
  all[scratchpadPageKey()] = { text, updatedAt };
  scratchpadWrite(SCRATCHPAD_KEYS.pages, all);
  const indicator = document.querySelector("[data-scratchpad-status]");
  if (indicator) indicator.textContent = formatSavedTime(updatedAt);
}

function scratchpadHTML() {
  const page = scratchpadPage();
  const shift = scratchpadShift();
  return `
    <section class="daily-scratchpad" id="daily-scratchpad" data-scratchpad-key="${scratchpadEscape(scratchpadPageKey())}">
      <div class="scratchpad-head">
        <div>
          <p>DAILY SCRATCHPAD</p>
          <h3>Dump notes here</h3>
          <span>${scratchpadEscape(formatScratchpadDate())} · ${scratchpadEscape(SCRATCHPAD_SHIFT_LABELS[shift])}</span>
        </div>
        <strong data-scratchpad-status>${scratchpadEscape(formatSavedTime(page.updatedAt))}</strong>
      </div>
      <textarea id="daily-scratchpad-text" spellcheck="true" placeholder="Random notes, lists, names, numbers, things to check, things somebody said...">${scratchpadEscape(page.text)}</textarea>
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

function isScratchpadScreen() {
  return document.querySelector('[data-screen="voice"]')?.classList.contains("active") === true;
}

function resizeScratchpad(textarea) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(480, Math.max(210, textarea.scrollHeight))}px`;
}

function ensureScratchpad() {
  if (!isScratchpadScreen()) return;
  const screen = document.querySelector("#loretta-notes-screen");
  if (!screen) return;

  const title = document.querySelector("#screen-title");
  const eyebrow = document.querySelector("#screen-eyebrow");
  if (title) title.textContent = "Notes";
  if (eyebrow) eyebrow.textContent = "CAPTURE";

  const key = scratchpadPageKey();
  const existing = screen.querySelector("#daily-scratchpad");
  if (!existing || existing.dataset.scratchpadKey !== key) {
    existing?.remove();
    screen.insertAdjacentHTML("afterbegin", scratchpadHTML());
  }
  resizeScratchpad(screen.querySelector("#daily-scratchpad-text"));
}

function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  const before = textarea.value.slice(0, start);
  const prefix = text === "• " && before && !before.endsWith("\n") ? "\n" : "";
  textarea.setRangeText(`${prefix}${text}`, start, end, "end");
  saveScratchpad(textarea.value);
  resizeScratchpad(textarea);
  textarea.focus();
}

function currentScratchpadLine(textarea) {
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? start;
  const selected = textarea.value.slice(start, end).trim();
  if (selected) return selected;
  const lineStart = textarea.value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineEndIndex = textarea.value.indexOf("\n", start);
  const lineEnd = lineEndIndex === -1 ? textarea.value.length : lineEndIndex;
  return textarea.value.slice(lineStart, lineEnd).trim();
}

function cleanTaskText(value) {
  return String(value || "")
    .replace(/^\s*[•*\-]\s*/, "")
    .replace(/^\s*\[[^\]]+\]\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function addScratchpadTask(textarea) {
  const title = cleanTaskText(currentScratchpadLine(textarea));
  if (!title) {
    setScratchpadStatus("Select text or use a line");
    textarea.focus();
    return;
  }
  const key = scratchpadPageKey();
  const all = scratchpadRead(SCRATCHPAD_KEYS.customTasks, {});
  const tasks = all[key] || [];
  tasks.push({
    id: `scratchpad-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    area: "Scratchpad",
    minutes: 8,
    priority: 45 + tasks.length,
    detail: `Created from the Daily Scratchpad on ${new Date().toLocaleString()}.`
  });
  all[key] = tasks;
  scratchpadWrite(SCRATCHPAD_KEYS.customTasks, all);
  setScratchpadStatus("Task added");
  window.dispatchEvent(new CustomEvent("storepilot:tasks-changed", { detail: { shiftKey: key } }));
  window.StorePilotCommandCenter?.render?.();
}

async function copyScratchpad(textarea) {
  const text = textarea.value.trim();
  if (!text) return setScratchpadStatus("Scratchpad is empty");
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    textarea.select();
    document.execCommand("copy");
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }
  setScratchpadStatus("Scratchpad copied");
}

function clearScratchpad(textarea) {
  if (!textarea.value.trim()) return;
  if (!confirm("Clear this shift's Daily Scratchpad? This cannot be undone unless it is in a backup.")) return;
  textarea.value = "";
  saveScratchpad("");
  resizeScratchpad(textarea);
  setScratchpadStatus("Scratchpad cleared");
  textarea.focus();
}

function handleScratchpadInput(event) {
  const textarea = event.target.closest?.("#daily-scratchpad-text");
  if (!textarea) return;
  saveScratchpad(textarea.value);
  resizeScratchpad(textarea);
}

function handleScratchpadClick(event) {
  const button = event.target.closest?.("[data-scratchpad-action]");
  if (!button) return;
  const textarea = document.querySelector("#daily-scratchpad-text");
  if (!textarea) return;
  const action = button.dataset.scratchpadAction;
  if (action === "bullet") insertAtCursor(textarea, "• ");
  if (action === "timestamp") insertAtCursor(textarea, `[${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}] `);
  if (action === "task") addScratchpadTask(textarea);
  if (action === "copy") copyScratchpad(textarea);
  if (action === "clear") clearScratchpad(textarea);
}

function queueScratchpadRender() {
  if (scratchpadRenderQueued) return;
  scratchpadRenderQueued = true;
  requestAnimationFrame(() => {
    scratchpadRenderQueued = false;
    ensureScratchpad();
  });
}

function startScratchpad() {
  document.addEventListener("input", handleScratchpadInput);
  document.addEventListener("click", handleScratchpadClick);
  scratchpadObserver = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.type === "childList")) queueScratchpadRender();
  });
  scratchpadObserver.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", () => setTimeout(queueScratchpadRender, 20));
  window.addEventListener("storage", queueScratchpadRender);
  queueScratchpadRender();
}

window.StorePilotScratchpad = {
  getCurrent: scratchpadPage,
  save: saveScratchpad,
  open: () => document.querySelector('[data-screen="voice"]')?.click()
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startScratchpad, { once: true });
else startScratchpad();
