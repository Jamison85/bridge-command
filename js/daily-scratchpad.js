const SCRATCHPAD_KEYS = {
  pages: "storePilot.dailyScratchpad.v1",
  shift: "storePilot.shift.v6",
  customTasks: "storePilot.customTasks.v6"
};
const SCRATCHPAD_SHIFTS = { morning: "Morning", mid: "Mid", close: "Close" };

function readScratchpad(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function writeScratchpad(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function currentShift() {
  const shift = readScratchpad(SCRATCHPAD_KEYS.shift, "morning");
  return SCRATCHPAD_SHIFTS[shift] ? shift : "morning";
}
function pageKey() { return `${dateKey()}:${currentShift()}`; }
function getCurrentPage() {
  return readScratchpad(SCRATCHPAD_KEYS.pages, {})[pageKey()] || { text: "", updatedAt: "" };
}
function savedLabel(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? "Ready" : `Saved ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}
function setStatus(text) {
  const indicator = document.querySelector("[data-scratchpad-status]");
  if (indicator) indicator.textContent = text;
  const appStatus = document.querySelector("#system-status");
  if (appStatus) {
    appStatus.textContent = text;
    clearTimeout(setStatus.timer);
    setStatus.timer = setTimeout(() => { appStatus.textContent = "Ready"; }, 1800);
  }
}
function save(text) {
  const pages = readScratchpad(SCRATCHPAD_KEYS.pages, {});
  const updatedAt = new Date().toISOString();
  pages[pageKey()] = { text, updatedAt };
  writeScratchpad(SCRATCHPAD_KEYS.pages, pages);
  const indicator = document.querySelector("[data-scratchpad-status]");
  if (indicator) indicator.textContent = savedLabel(updatedAt);
  window.dispatchEvent(new CustomEvent("storepilot:notes-changed", { detail: { source: "scratchpad", shiftKey: pageKey() } }));
}
function resize(textarea) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(480, Math.max(210, textarea.scrollHeight))}px`;
}
function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  const before = textarea.value.slice(0, start);
  const prefix = text === "• " && before && !before.endsWith("\n") ? "\n" : "";
  textarea.setRangeText(`${prefix}${text}`, start, end, "end");
  save(textarea.value);
  resize(textarea);
  textarea.focus();
}
function currentLine(textarea) {
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
  return String(value || "").replace(/^\s*[•*\-]\s*/, "").replace(/^\s*\[[^\]]+\]\s*/, "").replace(/\s+/g, " ").trim().slice(0, 120);
}
function addTask(textarea) {
  const title = cleanTaskText(currentLine(textarea));
  if (!title) { setStatus("Select text or use a line"); textarea.focus(); return; }
  const key = pageKey();
  const all = readScratchpad(SCRATCHPAD_KEYS.customTasks, {});
  const tasks = Array.isArray(all[key]) ? all[key] : [];
  tasks.push({
    id: `scratchpad-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    area: "Scratchpad",
    minutes: 8,
    priority: 45 + tasks.length,
    detail: `Created from the Daily Scratchpad on ${new Date().toLocaleString()}.`
  });
  all[key] = tasks;
  writeScratchpad(SCRATCHPAD_KEYS.customTasks, all);
  setStatus("Task added");
  window.dispatchEvent(new CustomEvent("storepilot:tasks-changed", { detail: { shiftKey: key } }));
  window.StorePilotCommandCenter?.render?.();
}
async function copyAll(textarea) {
  const text = textarea.value.trim();
  if (!text) return setStatus("Scratchpad is empty");
  try { await navigator.clipboard.writeText(text); }
  catch {
    textarea.select();
    document.execCommand("copy");
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }
  setStatus("Scratchpad copied");
}
function clear(textarea) {
  if (!textarea.value.trim()) return;
  if (!confirm("Clear this shift's Daily Scratchpad? This cannot be undone unless it is in a backup.")) return;
  textarea.value = "";
  save("");
  resize(textarea);
  setStatus("Scratchpad cleared");
  textarea.focus();
}
function handleInput(event) {
  const textarea = event.target.closest?.("#daily-scratchpad-text");
  if (!textarea) return;
  save(textarea.value);
  resize(textarea);
}
function handleClick(event) {
  const button = event.target.closest?.("[data-scratchpad-action]");
  if (!button) return;
  const textarea = document.querySelector("#daily-scratchpad-text");
  if (!textarea) return;
  event.preventDefault();
  const action = button.dataset.scratchpadAction;
  if (action === "bullet") insertAtCursor(textarea, "• ");
  if (action === "timestamp") insertAtCursor(textarea, `[${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}] `);
  if (action === "task") addTask(textarea);
  if (action === "copy") copyAll(textarea);
  if (action === "clear") clear(textarea);
}
function handleNotesRendered() {
  const textarea = document.querySelector("#daily-scratchpad-text");
  resize(textarea);
}
function start() {
  document.addEventListener("input", handleInput);
  document.addEventListener("click", handleClick);
  window.addEventListener("storepilot:notes-rendered", handleNotesRendered);
  document.documentElement.dataset.scratchpadService = "command-center-28";
}
window.StorePilotScratchpad = {
  version: "command-center-28",
  getCurrent: getCurrentPage,
  save,
  resize,
  open: () => document.querySelector('[data-screen="voice"]')?.click()
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
