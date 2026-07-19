(() => {
  "use strict";

  const RELEASE = "command-center-25";
  const EXPECTED_CACHE = `store-pilot-${RELEASE}`;
  const PREFIX = "storePilot.";
  const KEYS = {
    shift: "storePilot.shift.v6",
    context: "storePilot.shiftContext.v2",
    completed: "storePilot.completed.v6",
    customTasks: "storePilot.customTasks.v6",
    states: "storePilot.taskStates.v6",
    templates: "storePilot.templates.v7",
    incidents: "storePilot.incidents.v2",
    scratchpad: "storePilot.dailyScratchpad.v1",
    lastBackup: "storePilot.lastBackupAt.v1",
    lastRestore: "storePilot.lastRestoreAt.v1"
  };
  const CORE_JSON_KEYS = Object.values(KEYS);
  const SHIFT_LABELS = { morning: "Morning", mid: "Mid", close: "Close" };

  let observer = null;
  let renderQueued = false;
  let renderSequence = 0;
  let latestSnapshot = null;

  function safeParse(raw, fallback = null) {
    try { return JSON.parse(raw); }
    catch { return fallback; }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[character]));
  }

  function dateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function currentShift() {
    const shift = safeParse(localStorage.getItem(KEYS.shift), "morning");
    return SHIFT_LABELS[shift] ? shift : "morning";
  }

  function currentShiftKey() {
    return `${dateKey()}:${currentShift()}`;
  }

  function currentRole() {
    const contexts = safeParse(localStorage.getItem(KEYS.context), {}) || {};
    return String(contexts[currentShiftKey()]?.role || "manager").replace(/-/g, " ");
  }

  function storedDate(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = safeParse(raw, raw);
    const date = new Date(parsed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function relativeDate(date, emptyLabel) {
    if (!date) return emptyLabel;
    const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  }

  function formatDateTime(date) {
    if (!date) return "Never";
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  function byteSize(value) {
    try { return new TextEncoder().encode(value).length; }
    catch { return value.length * 2; }
  }

  function storageSummary() {
    const keys = [];
    let bytes = 0;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(PREFIX)) continue;
      const value = localStorage.getItem(key) ?? "";
      keys.push(key);
      bytes += byteSize(key) + byteSize(value);
    }

    const invalid = Symbol("invalid");
    const parseErrors = CORE_JSON_KEYS.filter((key) => {
      const raw = localStorage.getItem(key);
      return raw !== null && safeParse(raw, invalid) === invalid;
    });
    const key = currentShiftKey();
    const completed = safeParse(localStorage.getItem(KEYS.completed), {}) || {};
    const customTasks = safeParse(localStorage.getItem(KEYS.customTasks), {}) || {};
    const states = safeParse(localStorage.getItem(KEYS.states), {}) || {};
    const incidents = safeParse(localStorage.getItem(KEYS.incidents), []) || [];
    const scratchpad = safeParse(localStorage.getItem(KEYS.scratchpad), {}) || {};

    return {
      groups: keys.length,
      bytes,
      parseErrors,
      shiftCompleted: Array.isArray(completed[key]) ? completed[key].length : 0,
      shiftAdded: Array.isArray(customTasks[key]) ? customTasks[key].length : 0,
      shiftDocumented: states[key] && typeof states[key] === "object" ? Object.keys(states[key]).length : 0,
      incidents: Array.isArray(incidents) ? incidents.length : 0,
      scratchpadPages: scratchpad && typeof scratchpad === "object" ? Object.keys(scratchpad).length : 0
    };
  }

  async function pwaSummary() {
    const supported = "serviceWorker" in navigator;
    let registration = null;
    let cacheNames = [];
    try { registration = supported ? await navigator.serviceWorker.getRegistration() : null; }
    catch { registration = null; }
    try { cacheNames = "caches" in window ? await caches.keys() : []; }
    catch { cacheNames = []; }

    return {
      supported,
      controlled: Boolean(navigator.serviceWorker?.controller),
      workerState: registration?.waiting
        ? "waiting"
        : registration?.installing
          ? "installing"
          : registration?.active
            ? "active"
            : "none",
      cacheReady: cacheNames.includes(EXPECTED_CACHE),
      standalone: window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true,
      online: navigator.onLine
    };
  }

  async function collectSnapshot() {
    const storage = storageSummary();
    const pwa = await pwaSummary();
    const runtimeVersion = window.StorePilotRuntime?.version || "unknown";
    const runtimeLoadedAt = window.StorePilotRuntime?.loadedAt ? new Date(window.StorePilotRuntime.loadedAt) : null;
    const lastBackup = storedDate(KEYS.lastBackup);
    const lastRestore = storedDate(KEYS.lastRestore);
    const hardFailure = runtimeVersion !== RELEASE || storage.parseErrors.length > 0;
    const updatePending = pwa.supported && (
      !pwa.controlled
      || !pwa.cacheReady
      || pwa.workerState === "waiting"
      || pwa.workerState === "installing"
    );

    return {
      release: RELEASE,
      runtimeVersion,
      runtimeLoadedAt,
      shift: currentShift(),
      role: currentRole(),
      shiftKey: currentShiftKey(),
      storage,
      pwa,
      lastBackup,
      lastRestore,
      health: hardFailure ? "check" : updatePending ? "pending" : "healthy"
    };
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function healthLabel(snapshot) {
    if (snapshot.health === "healthy") return "Healthy";
    if (snapshot.health === "pending") return "Update pending";
    return "Check needed";
  }

  function offlineLabel(snapshot) {
    if (!snapshot.pwa.supported) return "Unavailable";
    if (snapshot.pwa.cacheReady && snapshot.pwa.controlled) return "Ready";
    if (["waiting", "installing"].includes(snapshot.pwa.workerState)) return "Updating";
    return "Pending";
  }

  function panelHTML(snapshot) {
    const backupShort = relativeDate(snapshot.lastBackup, "None");
    const coreStorage = snapshot.storage.parseErrors.length
      ? `${snapshot.storage.parseErrors.length} parse error${snapshot.storage.parseErrors.length === 1 ? "" : "s"}`
      : "Valid";

    return `
      <div class="diagnostics-head">
        <div><p>APP HEALTH</p><h3>Diagnostics</h3><span>Technical status only. No note or incident contents are shown.</span></div>
        <strong data-diagnostics-health="${escapeHTML(snapshot.health)}">${escapeHTML(healthLabel(snapshot))}</strong>
      </div>
      <div class="diagnostics-metrics">
        <div><span>Runtime</span><b>${escapeHTML(snapshot.runtimeVersion.replace("command-center-", "v"))}</b></div>
        <div><span>Offline</span><b>${escapeHTML(offlineLabel(snapshot))}</b></div>
        <div><span>Data</span><b>${snapshot.storage.groups} groups</b></div>
        <div><span>Backup</span><b>${escapeHTML(backupShort)}</b></div>
      </div>
      <details class="diagnostics-details">
        <summary>Technical details</summary>
        <dl>
          <div><dt>Selected shift</dt><dd>${escapeHTML(SHIFT_LABELS[snapshot.shift])} · ${escapeHTML(snapshot.role)}</dd></div>
          <div><dt>Shift record</dt><dd>${snapshot.storage.shiftCompleted} done · ${snapshot.storage.shiftDocumented} documented · ${snapshot.storage.shiftAdded} added</dd></div>
          <div><dt>Core storage</dt><dd>${escapeHTML(coreStorage)} · ${escapeHTML(formatBytes(snapshot.storage.bytes))}</dd></div>
          <div><dt>Service worker</dt><dd>${escapeHTML(snapshot.pwa.workerState)} · ${snapshot.pwa.controlled ? "controlling app" : "not controlling app"}</dd></div>
          <div><dt>Offline cache</dt><dd>${snapshot.pwa.cacheReady ? escapeHTML(EXPECTED_CACHE) : "Current release cache not found"}</dd></div>
          <div><dt>Installed mode</dt><dd>${snapshot.pwa.standalone ? "Standalone PWA" : "Browser tab"} · ${snapshot.pwa.online ? "online" : "offline"}</dd></div>
          <div><dt>Last backup</dt><dd>${escapeHTML(formatDateTime(snapshot.lastBackup))}</dd></div>
          <div><dt>Last restore</dt><dd>${escapeHTML(formatDateTime(snapshot.lastRestore))}</dd></div>
          <div><dt>Runtime loaded</dt><dd>${escapeHTML(formatDateTime(snapshot.runtimeLoadedAt))}</dd></div>
        </dl>
      </details>
      <div class="diagnostics-actions">
        <button type="button" data-diagnostics-refresh>Refresh</button>
        <button type="button" data-diagnostics-copy>Copy diagnostics</button>
      </div>`;
  }

  function isSettingsScreen() {
    return document.querySelector("#screen-title")?.textContent?.trim().toLowerCase() === "templates";
  }

  function positionPanel(panel, content) {
    const backup = content.querySelector("[data-backup-restore-panel]");
    const production = content.querySelector(".production-tools-card");
    if (backup && backup.nextElementSibling !== panel) backup.insertAdjacentElement("afterend", panel);
    else if (!backup && production && production.previousElementSibling !== panel) production.insertAdjacentElement("beforebegin", panel);
    else if (!backup && !production && content.firstElementChild !== panel) content.prepend(panel);
  }

  async function renderDiagnostics(force = false) {
    if (!isSettingsScreen()) return;
    const content = document.querySelector("#screen-content");
    if (!content) return;
    let panel = content.querySelector("[data-store-pilot-diagnostics]");
    if (panel?.dataset.ready === "true" && !force) return;
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "store-pilot-diagnostics";
      panel.dataset.storePilotDiagnostics = "true";
      panel.innerHTML = `<div class="diagnostics-loading">Checking Store Pilot…</div>`;
      content.prepend(panel);
    }
    positionPanel(panel, content);
    const sequence = ++renderSequence;
    const snapshot = await collectSnapshot();
    if (sequence !== renderSequence || !panel.isConnected) return;
    latestSnapshot = snapshot;
    panel.innerHTML = panelHTML(snapshot);
    panel.dataset.ready = "true";
    panel.dataset.health = snapshot.health;
  }

  function diagnosticsText(snapshot) {
    return [
      "Store Pilot diagnostics",
      `Expected release: ${snapshot.release}`,
      `Runtime release: ${snapshot.runtimeVersion}`,
      `Selected shift: ${SHIFT_LABELS[snapshot.shift]} / ${snapshot.role}`,
      `Shift key: ${snapshot.shiftKey}`,
      `Standalone: ${snapshot.pwa.standalone ? "yes" : "no"}`,
      `Online: ${snapshot.pwa.online ? "yes" : "no"}`,
      `Service worker: ${snapshot.pwa.workerState}; controlled=${snapshot.pwa.controlled}`,
      `Expected cache ready: ${snapshot.pwa.cacheReady}`,
      `Data groups: ${snapshot.storage.groups}`,
      `Storage size: ${formatBytes(snapshot.storage.bytes)}`,
      `Core storage errors: ${snapshot.storage.parseErrors.length}`,
      `Current shift: ${snapshot.storage.shiftCompleted} done, ${snapshot.storage.shiftDocumented} documented, ${snapshot.storage.shiftAdded} added`,
      `Incidents stored: ${snapshot.storage.incidents}`,
      `Scratchpad pages: ${snapshot.storage.scratchpadPages}`,
      `Last backup: ${formatDateTime(snapshot.lastBackup)}`,
      `Last restore: ${formatDateTime(snapshot.lastRestore)}`,
      `Health: ${healthLabel(snapshot)}`
    ].join("\n");
  }

  function setStatus(text) {
    const status = document.querySelector("#system-status");
    if (!status) return;
    status.textContent = text;
    clearTimeout(setStatus.timer);
    setStatus.timer = setTimeout(() => { status.textContent = "Ready"; }, 2200);
  }

  async function copyDiagnostics() {
    const snapshot = latestSnapshot || await collectSnapshot();
    const text = diagnosticsText(snapshot);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setStatus("Diagnostics copied");
  }

  function queueRender(force = false) {
    if (renderQueued && !force) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      renderDiagnostics(force);
    });
  }

  function start() {
    const content = document.querySelector("#screen-content");
    if (content) {
      observer = new MutationObserver(() => queueRender(false));
      observer.observe(content, { childList: true, subtree: true });
    }

    document.addEventListener("click", (event) => {
      if (event.target.closest?.("[data-diagnostics-refresh]")) {
        event.preventDefault();
        const panel = document.querySelector("[data-store-pilot-diagnostics]");
        if (panel) panel.dataset.ready = "false";
        renderDiagnostics(true).then(() => setStatus("Diagnostics refreshed"));
        return;
      }
      if (event.target.closest?.("[data-diagnostics-copy]")) {
        event.preventDefault();
        copyDiagnostics();
        return;
      }
      if (event.target.closest?.("[data-screen], .icon-button")) setTimeout(() => queueRender(false), 40);
      if (event.target.closest?.("[data-download-store-backup], [data-confirm-store-restore]")) {
        setTimeout(() => renderDiagnostics(true), 500);
      }
    });

    window.addEventListener("storage", () => renderDiagnostics(true));
    window.addEventListener("online", () => renderDiagnostics(true));
    window.addEventListener("offline", () => renderDiagnostics(true));
    navigator.serviceWorker?.addEventListener?.("controllerchange", () => renderDiagnostics(true));
    window.addEventListener("storepilot:tasks-changed", () => renderDiagnostics(true));
    window.addEventListener("storepilot:incident-saved", () => renderDiagnostics(true));
    queueRender(false);
  }

  window.StorePilotDiagnostics = {
    collect: collectSnapshot,
    render: () => renderDiagnostics(true),
    copy: copyDiagnostics,
    release: RELEASE
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
