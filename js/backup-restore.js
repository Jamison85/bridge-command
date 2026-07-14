const BACKUP_PREFIX = "storePilot.";
const BACKUP_FORMAT = "store-pilot-backup";
const BACKUP_SCHEMA_VERSION = 1;
const LAST_BACKUP_KEY = "storePilot.lastBackupAt.v1";
const LAST_RESTORE_KEY = "storePilot.lastRestoreAt.v1";
const MAX_BACKUP_BYTES = 8 * 1024 * 1024;
const BLOCKED_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);

let backupObserver = null;
let panelRenderQueued = false;
let selectedBackup = null;
let selectedFileName = "";

function backupEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function safeParse(value, fallback = null) {
  try { return JSON.parse(value); }
  catch { return fallback; }
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function appStorageSnapshot() {
  const storage = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(BACKUP_PREFIX)) continue;
    storage[key] = localStorage.getItem(key) ?? "";
  }
  return Object.fromEntries(Object.entries(storage).sort(([left], [right]) => left.localeCompare(right)));
}

function simpleChecksum(storage) {
  const text = JSON.stringify(storage);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function readStored(storage, key, fallback) {
  if (!(key in storage)) return fallback;
  const parsed = safeParse(storage[key], undefined);
  return parsed === undefined ? fallback : parsed;
}

function nestedArrayCount(value) {
  if (Array.isArray(value)) return value.length;
  if (!isPlainObject(value)) return 0;
  return Object.values(value).reduce((total, item) => total + (Array.isArray(item) ? item.length : 0), 0);
}

function nestedObjectCount(value) {
  if (!isPlainObject(value)) return 0;
  return Object.values(value).reduce((total, item) => total + (isPlainObject(item) ? Object.keys(item).length : 0), 0);
}

function backupSummary(storage) {
  const completed = nestedArrayCount(readStored(storage, "storePilot.completed.v6", {}));
  const customTasks = nestedArrayCount(readStored(storage, "storePilot.customTasks.v6", {}));
  const taskStates = nestedObjectCount(readStored(storage, "storePilot.taskStates.v6", {}));
  const templates = nestedArrayCount(readStored(storage, "storePilot.templates.v7", {}));
  const notes = (readStored(storage, "storePilot.notes.v6", [])?.length || 0)
    + (readStored(storage, "storePilot.lorettaNotes.v1", [])?.length || 0);
  const incidents = readStored(storage, "storePilot.incidents.v2", [])?.length || 0;
  const incidentDrafts = Object.keys(readStored(storage, "storePilot.incidentDrafts.v1", {}) || {}).length;
  const interruptions = readStored(storage, "storePilot.interruptions.v1", [])?.length || 0;
  const reports = readStored(storage, "storePilot.reports.v6", [])?.length || 0;
  const proofPacks = readStored(storage, "storePilot.proofPacks.v1", [])?.length || 0;
  const awayPeriods = readStored(storage, "storePilot.lorettaAway.v1", { periods: [] })?.periods?.length || 0;
  const records = completed + customTasks + taskStates + notes + incidents + incidentDrafts + interruptions + reports + proofPacks + awayPeriods;
  return {
    keys: Object.keys(storage).length,
    records,
    completed,
    customTasks,
    taskStates,
    templates,
    notes,
    incidents,
    incidentDrafts,
    interruptions,
    reports,
    proofPacks,
    awayPeriods
  };
}

function buildBackup(storage = appStorageSnapshot(), kind = "manual") {
  const createdAt = new Date().toISOString();
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: window.StorePilotRuntime?.version || "unknown",
    createdAt,
    kind,
    source: "Store Pilot PWA",
    summary: backupSummary(storage),
    checksum: simpleChecksum(storage),
    storage
  };
}

function fileStamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

function downloadPayload(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function setBackupStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  clearTimeout(setBackupStatus.timer);
  setBackupStatus.timer = setTimeout(() => { status.textContent = "Ready"; }, 2600);
}

function formatDateTime(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
  }).format(date);
}

function lastBackupLabel() {
  const value = safeParse(localStorage.getItem(LAST_BACKUP_KEY), "");
  if (!value) return "No backup downloaded yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Backup date unavailable";
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return `Last backup today at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  if (days === 1) return "Last backup yesterday";
  return `Last backup ${days} days ago`;
}

function panelHTML() {
  const summary = backupSummary(appStorageSnapshot());
  return `
    <section class="backup-restore-panel" data-backup-restore-panel>
      <div class="backup-panel-head">
        <div>
          <p>YOUR DATA</p>
          <h3>Backup & Restore</h3>
          <span>${backupEscape(lastBackupLabel())}</span>
        </div>
        <div class="backup-panel-count"><b>${summary.keys}</b><span>data groups</span></div>
      </div>
      <p class="backup-panel-copy">Store Pilot saves its records on this phone. Download a backup before clearing browser data, reinstalling the PWA, or moving to another device.</p>
      <div class="backup-panel-actions">
        <button class="primary-action" type="button" data-download-store-backup>Download backup</button>
        <button class="secondary-action backup-light-button" type="button" data-choose-store-backup>Restore from file</button>
      </div>
      <p class="backup-panel-privacy">The file can contain work notes and incident details. Store it somewhere private.</p>
    </section>`;
}

function ensureBackupPanel() {
  const templateCard = document.querySelector(".template-card");
  const title = document.querySelector("#screen-title")?.textContent?.trim();
  if (!templateCard || title !== "Templates") return;
  if (templateCard.querySelector("[data-backup-restore-panel]")) return;
  templateCard.insertAdjacentHTML("afterbegin", panelHTML());
}

function ensureFileInput() {
  let input = document.querySelector("#store-pilot-backup-file");
  if (input) return input;
  input = document.createElement("input");
  input.id = "store-pilot-backup-file";
  input.type = "file";
  input.accept = ".json,application/json";
  input.hidden = true;
  input.addEventListener("change", handleBackupFile);
  document.body.appendChild(input);
  return input;
}

function ensureBackupSheet() {
  let sheet = document.querySelector("#backup-restore-sheet");
  if (sheet) return sheet;
  sheet = document.createElement("section");
  sheet.id = "backup-restore-sheet";
  sheet.className = "backup-restore-sheet";
  sheet.setAttribute("aria-hidden", "true");
  sheet.innerHTML = `<div class="backup-restore-card" role="dialog" aria-modal="true" aria-labelledby="backup-restore-title"></div>`;
  sheet.addEventListener("click", handleSheetClick);
  sheet.addEventListener("input", handleSheetInput);
  document.body.appendChild(sheet);
  return sheet;
}

function closeBackupSheet() {
  const sheet = document.querySelector("#backup-restore-sheet");
  sheet?.classList.remove("open");
  sheet?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("backup-restore-open");
}

function summaryRows(summary) {
  const entries = [
    ["Completed task records", summary.completed],
    ["Added tasks", summary.customTasks],
    ["Delayed / carried records", summary.taskStates],
    ["Notes", summary.notes],
    ["Incidents and drafts", summary.incidents + summary.incidentDrafts],
    ["Interruptions", summary.interruptions],
    ["Saved reports", summary.reports],
    ["Proof snapshots", summary.proofPacks],
    ["Loretta away periods", summary.awayPeriods],
    ["Recurring template tasks", summary.templates]
  ].filter(([, count]) => count > 0);
  if (!entries.length) return `<div class="backup-empty-summary">No record counts were found, but ${summary.keys} Store Pilot data group${summary.keys === 1 ? " is" : "s are"} present.</div>`;
  return entries.map(([label, count]) => `<div><span>${backupEscape(label)}</span><b>${count}</b></div>`).join("");
}

function previewHTML(payload, fileName) {
  const summary = payload.summary || backupSummary(payload.storage);
  return `
    <header class="backup-sheet-head">
      <div><p>RESTORE PREVIEW</p><h2 id="backup-restore-title">Review this backup</h2></div>
      <button type="button" data-backup-close>Close</button>
    </header>
    <section class="backup-file-card">
      <div class="backup-file-icon">JSON</div>
      <div><strong>${backupEscape(fileName || "Store Pilot backup")}</strong><span>Created ${backupEscape(formatDateTime(payload.createdAt))}</span><small>App ${backupEscape(payload.appVersion || "unknown")} · ${summary.keys} data groups</small></div>
      <span class="backup-valid-badge">Valid</span>
    </section>
    <section class="backup-preview-summary">${summaryRows(summary)}</section>
    <section class="backup-restore-choice recommended">
      <div><span>RECOMMENDED</span><h3>Merge with this phone</h3><p>Add missing history from the backup while keeping newer records and preferences already on this phone.</p></div>
      <button class="primary-action" type="button" data-restore-mode="merge">Merge backup</button>
    </section>
    <details class="backup-restore-choice danger">
      <summary>Replace all Store Pilot data</summary>
      <div class="backup-danger-body">
        <p>This removes the current Store Pilot records on this phone and replaces them with the file. A safety backup downloads first.</p>
        <label>Type <b>REPLACE</b> to continue<input data-replace-confirm autocomplete="off" spellcheck="false" placeholder="REPLACE"></label>
        <button type="button" data-restore-mode="replace" disabled>Replace all data</button>
      </div>
    </details>
    <p class="backup-restore-note">Nothing changes until you choose a restore method. Only keys beginning with <code>storePilot.</code> are affected.</p>`;
}

function openPreview(payload, fileName) {
  selectedBackup = payload;
  selectedFileName = fileName;
  const sheet = ensureBackupSheet();
  sheet.querySelector(".backup-restore-card").innerHTML = previewHTML(payload, fileName);
  sheet.classList.add("open");
  sheet.setAttribute("aria-hidden", "false");
  document.body.classList.add("backup-restore-open");
}

function errorHTML(message) {
  return `
    <header class="backup-sheet-head"><div><p>RESTORE FAILED</p><h2 id="backup-restore-title">That file cannot be used</h2></div><button type="button" data-backup-close>Close</button></header>
    <section class="backup-error-card"><strong>Backup not accepted</strong><p>${backupEscape(message)}</p><button class="primary-action" type="button" data-choose-store-backup>Choose another file</button></section>`;
}

function openBackupError(message) {
  selectedBackup = null;
  const sheet = ensureBackupSheet();
  sheet.querySelector(".backup-restore-card").innerHTML = errorHTML(message);
  sheet.classList.add("open");
  sheet.setAttribute("aria-hidden", "false");
  document.body.classList.add("backup-restore-open");
}

function validateBackup(parsed) {
  if (!isPlainObject(parsed)) throw new Error("The file is not a Store Pilot backup object.");
  if (parsed.format !== BACKUP_FORMAT) throw new Error("This JSON file was not created by Store Pilot Backup & Restore.");
  if (parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) throw new Error(`Backup version ${parsed.schemaVersion ?? "unknown"} is not supported by this app version.`);
  if (!isPlainObject(parsed.storage)) throw new Error("The backup does not contain a valid storage section.");
  const entries = Object.entries(parsed.storage);
  if (entries.length > 500) throw new Error("The backup contains too many data groups to restore safely.");
  for (const [key, value] of entries) {
    if (!key.startsWith(BACKUP_PREFIX)) throw new Error("The backup contains data that does not belong to Store Pilot.");
    if (typeof value !== "string") throw new Error(`The data group ${key} is not in the expected format.`);
  }
  if (parsed.checksum && parsed.checksum !== simpleChecksum(parsed.storage)) throw new Error("The backup checksum does not match. The file may be incomplete or edited.");
  return {
    ...parsed,
    summary: backupSummary(parsed.storage)
  };
}

async function handleBackupFile(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (file.size > MAX_BACKUP_BYTES) return openBackupError("The selected file is larger than 8 MB.");
  try {
    const text = await file.text();
    const payload = validateBackup(JSON.parse(text));
    openPreview(payload, file.name);
  } catch (error) {
    openBackupError(error instanceof Error ? error.message : "The file could not be read.");
  }
}

function safeObjectKeys(value) {
  return Object.keys(value).filter((key) => !BLOCKED_OBJECT_KEYS.has(key));
}

function itemIdentity(item) {
  if (isPlainObject(item) && (item.id || item.shiftKey || item.createdAt)) return `object:${item.id || ""}:${item.shiftKey || ""}:${item.createdAt || ""}`;
  return `value:${JSON.stringify(item)}`;
}

function mergeArrays(incoming, current) {
  const result = [];
  const positions = new Map();
  [...current, ...incoming].forEach((item) => {
    const identity = itemIdentity(item);
    if (!positions.has(identity)) {
      positions.set(identity, result.length);
      result.push(item);
      return;
    }
    const position = positions.get(identity);
    if (isPlainObject(result[position]) && isPlainObject(item)) {
      result[position] = deepMerge(item, result[position]);
    }
  });
  return result;
}

function deepMerge(incoming, current) {
  if (Array.isArray(incoming) && Array.isArray(current)) return mergeArrays(incoming, current);
  if (isPlainObject(incoming) && isPlainObject(current)) {
    const result = Object.create(null);
    const keys = new Set([...safeObjectKeys(incoming), ...safeObjectKeys(current)]);
    keys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(current, key)) {
        result[key] = Object.prototype.hasOwnProperty.call(incoming, key)
          ? deepMerge(incoming[key], current[key])
          : current[key];
      } else {
        result[key] = incoming[key];
      }
    });
    return result;
  }
  return current === undefined ? incoming : current;
}

function mergedRawValue(incomingRaw, currentRaw) {
  if (currentRaw === null || currentRaw === undefined) return incomingRaw;
  const incoming = safeParse(incomingRaw, undefined);
  const current = safeParse(currentRaw, undefined);
  if (incoming === undefined || current === undefined) return currentRaw;
  return JSON.stringify(deepMerge(incoming, current));
}

function restorePlan(mode, incomingStorage, currentStorage) {
  if (mode === "replace") return { ...incomingStorage };
  const plan = { ...currentStorage };
  Object.entries(incomingStorage).forEach(([key, incomingRaw]) => {
    plan[key] = mergedRawValue(incomingRaw, currentStorage[key]);
  });
  return plan;
}

function clearStorePilotStorage() {
  Object.keys(localStorage).filter((key) => key.startsWith(BACKUP_PREFIX)).forEach((key) => localStorage.removeItem(key));
}

function restoreStorageExactly(storage) {
  clearStorePilotStorage();
  Object.entries(storage).forEach(([key, value]) => localStorage.setItem(key, value));
}

function successHTML(mode, changedKeys) {
  return `
    <section class="backup-success-card">
      <div class="backup-success-check">✓</div>
      <p>RESTORE COMPLETE</p>
      <h2 id="backup-restore-title">${mode === "merge" ? "Backup merged" : "Data replaced"}</h2>
      <span>${changedKeys} Store Pilot data group${changedKeys === 1 ? " was" : "s were"} processed. The app will reload with the restored records.</span>
      <button class="primary-action" type="button" data-reload-after-restore>Reload Store Pilot</button>
    </section>`;
}

function performRestore(mode) {
  if (!selectedBackup) return;
  const before = appStorageSnapshot();
  const safety = buildBackup(before, "pre-restore-safety");
  downloadPayload(safety, `store-pilot-safety-before-restore-${fileStamp()}.json`);
  const plan = restorePlan(mode, selectedBackup.storage, before);
  try {
    restoreStorageExactly(plan);
    localStorage.setItem(LAST_RESTORE_KEY, JSON.stringify({
      restoredAt: new Date().toISOString(),
      mode,
      fileName: selectedFileName,
      backupCreatedAt: selectedBackup.createdAt,
      keys: Object.keys(selectedBackup.storage).length
    }));
  } catch (error) {
    try { restoreStorageExactly(before); } catch {}
    openBackupError("The restore could not be written to this phone. Your original data was put back.");
    return;
  }
  const sheet = ensureBackupSheet();
  sheet.querySelector(".backup-restore-card").innerHTML = successHTML(mode, Object.keys(selectedBackup.storage).length);
  setBackupStatus("Restore complete");
  setTimeout(() => location.reload(), 1800);
}

function handleSheetClick(event) {
  if (event.target === event.currentTarget || event.target.closest("[data-backup-close]")) {
    closeBackupSheet();
    return;
  }
  if (event.target.closest("[data-choose-store-backup]")) {
    ensureFileInput().click();
    return;
  }
  const restoreButton = event.target.closest("[data-restore-mode]");
  if (restoreButton && !restoreButton.disabled) performRestore(restoreButton.dataset.restoreMode);
  if (event.target.closest("[data-reload-after-restore]")) location.reload();
}

function handleSheetInput(event) {
  const input = event.target.closest("[data-replace-confirm]");
  if (!input) return;
  const button = document.querySelector('[data-restore-mode="replace"]');
  if (button) button.disabled = input.value.trim() !== "REPLACE";
}

function downloadManualBackup() {
  const payload = buildBackup();
  downloadPayload(payload, `store-pilot-backup-${fileStamp()}.json`);
  localStorage.setItem(LAST_BACKUP_KEY, JSON.stringify(payload.createdAt));
  setBackupStatus("Backup downloaded");
  const panel = document.querySelector("[data-backup-restore-panel]");
  if (panel) panel.outerHTML = panelHTML();
}

function handleDocumentClick(event) {
  if (event.target.closest("#backup-restore-sheet")) return;
  if (event.target.closest("[data-download-store-backup]")) downloadManualBackup();
  if (event.target.closest("[data-choose-store-backup]")) ensureFileInput().click();
}

function queuePanelRender() {
  if (panelRenderQueued) return;
  panelRenderQueued = true;
  requestAnimationFrame(() => {
    panelRenderQueued = false;
    ensureBackupPanel();
  });
}

function startBackupRestore() {
  ensureFileInput();
  ensureBackupSheet();
  document.addEventListener("click", handleDocumentClick);
  backupObserver = new MutationObserver((mutations) => {
    const relevant = mutations.some((mutation) => mutation.type === "childList" && !mutation.target.closest?.("#backup-restore-sheet"));
    if (relevant) queuePanelRender();
  });
  backupObserver.observe(document.body, { childList: true, subtree: true });
  queuePanelRender();
}

window.StorePilotBackupRestore = {
  createBackup: () => buildBackup(),
  download: downloadManualBackup,
  preview: (payload, fileName = "Backup") => openPreview(validateBackup(payload), fileName),
  summary: () => backupSummary(appStorageSnapshot())
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startBackupRestore, { once: true });
else startBackupRestore();
