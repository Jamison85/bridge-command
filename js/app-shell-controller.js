import { normalizeShellScreen, shellPolicy, screenFromTitle } from "./app-shell-state-model.js?v=command-center-28";

const SHELL_RELEASE = "command-center-28";
const SHELL_KEYS = {
  shift: "storePilot.shift.v6",
  context: "storePilot.shiftContext.v2",
  incidents: "storePilot.incidents.v2"
};
const SHIFT_LABELS = { morning: "Morning", mid: "Mid", close: "Close" };
const MODE_LABELS = {
  normal: "Normal",
  "short-staffed": "Short staffed",
  "truck-day": "Truck day",
  "busy-rush": "Busy rush",
  "leadership-visit": "Leadership visit",
  "manager-coverage": "Manager coverage",
  "incident-recovery": "Incident recovery",
  "kitchen-prep": "Kitchen / prep"
};
const ROLE_LABELS = {
  manager: "Manager",
  register: "Register",
  floor: "Center store",
  kitchen: "Kitchen / prep"
};

let shellObserver = null;
let shellUpdateQueued = false;
let currentScreen = "next";

function shellRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function shellEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function shellDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shellShift() {
  const shift = shellRead(SHELL_KEYS.shift, "morning");
  return SHIFT_LABELS[shift] ? shift : "morning";
}

function shellShiftKey() {
  return `${shellDateKey()}:${shellShift()}`;
}

function shellContext() {
  const contexts = shellRead(SHELL_KEYS.context, {});
  return contexts?.[shellShiftKey()] || {};
}

function shellActiveIncident(context = shellContext()) {
  const incidents = shellRead(SHELL_KEYS.incidents, []);
  if (!Array.isArray(incidents)) return null;
  if (context.activeIncidentId) {
    const match = incidents.find((item) => item?.id === context.activeIncidentId && item?.status === "active");
    if (match) return match;
  }
  return incidents.find((item) => item?.shiftKey === shellShiftKey() && item?.status === "active") || null;
}

function shellDateLabel() {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date());
}

function screenFromDOM() {
  const active = document.querySelector(".nav-button.active[data-screen]")?.dataset.screen;
  if (active) return normalizeShellScreen(active);
  const title = document.querySelector("#screen-title")?.textContent || "";
  return screenFromTitle(title);
}

function ensureSecondaryStrip() {
  let strip = document.querySelector("#secondary-shell-strip");
  if (strip) return strip;
  const dashboard = document.querySelector(".dashboard-grid");
  if (!dashboard?.parentElement) return null;
  strip = document.createElement("section");
  strip.id = "secondary-shell-strip";
  strip.className = "secondary-shell-strip";
  strip.hidden = true;
  strip.setAttribute("aria-label", "Selected shift and context");
  strip.innerHTML = `
    <div class="secondary-shell-copy">
      <p>SHIFT VIEW</p>
      <strong><span data-shell-shift-label>Morning</span><span aria-hidden="true"> · </span><span data-shell-date></span></strong>
      <span data-shell-context>Normal · Manager</span>
      <span class="secondary-shell-alert" data-shell-alert hidden></span>
    </div>
    <div class="secondary-shell-controls">
      <div class="secondary-shell-shifts" role="group" aria-label="Change selected shift">
        ${Object.entries(SHIFT_LABELS).map(([shift, label]) => `<button type="button" data-shell-shift="${shift}">${label}</button>`).join("")}
      </div>
      <button type="button" class="secondary-shell-context-button" data-shell-context-edit>Edit context</button>
    </div>`;
  dashboard.parentElement.insertBefore(strip, dashboard);
  return strip;
}

function contextSummary(context) {
  const parts = [MODE_LABELS[context.mode] || MODE_LABELS.normal, ROLE_LABELS[context.role] || ROLE_LABELS.manager];
  if (context.staffing === "short" && context.mode !== "short-staffed") parts.push("Short staffed");
  return parts.join(" · ");
}

function syncCaptureAccess(policy) {
  const stack = document.querySelector("#quick-capture-stack");
  if (!stack) return;
  stack.setAttribute("aria-hidden", String(!policy.showQuickCapture));
  stack.querySelectorAll("button").forEach((button) => {
    button.tabIndex = policy.showQuickCapture ? 0 : -1;
  });
}

function syncPrimaryRegions(policy) {
  document.querySelector(".shift-card")?.setAttribute("aria-hidden", String(!policy.showPrimaryShiftControls));
  document.querySelector(".dashboard-grid")?.setAttribute("aria-hidden", String(!policy.showDashboard));
}

function updateShell(forceScreen = "") {
  currentScreen = forceScreen ? normalizeShellScreen(forceScreen) : screenFromDOM();
  const policy = shellPolicy(currentScreen);
  const shift = shellShift();
  const context = shellContext();
  const incident = shellActiveIncident(context);
  const strip = ensureSecondaryStrip();

  document.documentElement.dataset.storePilotScreen = policy.screen;
  document.documentElement.dataset.shellSafeArea = policy.safeAreaMode;
  document.documentElement.dataset.shellQuickCapture = policy.showQuickCapture ? "visible" : "hidden";

  if (strip) {
    strip.hidden = !policy.showSecondaryStrip;
    strip.dataset.screen = policy.screen;
    strip.querySelector("[data-shell-shift-label]").textContent = SHIFT_LABELS[shift];
    strip.querySelector("[data-shell-date]").textContent = shellDateLabel();
    strip.querySelector("[data-shell-context]").textContent = contextSummary(context);
    const alert = strip.querySelector("[data-shell-alert]");
    alert.hidden = !incident;
    alert.textContent = incident ? `Incident active: ${incident.type || "Incident"}` : "";
    strip.querySelectorAll("[data-shell-shift]").forEach((button) => {
      const active = button.dataset.shellShift === shift;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  syncPrimaryRegions(policy);
  syncCaptureAccess(policy);
  window.dispatchEvent(new CustomEvent("storepilot:shell-updated", { detail: policy }));
}

function queueShellUpdate(forceScreen = "") {
  if (shellUpdateQueued && !forceScreen) return;
  shellUpdateQueued = true;
  requestAnimationFrame(() => {
    shellUpdateQueued = false;
    updateShell(forceScreen);
  });
}

function openContextEditor(retry = true) {
  const card = document.querySelector("#shift-command-context");
  if (!card) {
    if (retry) {
      window.StorePilotCommandCenter?.render?.();
      setTimeout(() => openContextEditor(false), 120);
    }
    return;
  }
  card.classList.add("shell-context-open");
  card.setAttribute("aria-hidden", "false");
  const edit = card.querySelector(".command-context-edit");
  if (edit?.getAttribute("aria-expanded") !== "true") edit?.click();
  setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
}

function handleShellClick(event) {
  const proxyShift = event.target.closest?.("[data-shell-shift]");
  if (proxyShift) {
    event.preventDefault();
    document.querySelector(`.shift-button[data-shift="${proxyShift.dataset.shellShift}"]`)?.click();
    setTimeout(() => queueShellUpdate(), 40);
    return;
  }

  if (event.target.closest?.("[data-shell-context-edit]")) {
    event.preventDefault();
    openContextEditor();
    return;
  }

  const contextToggle = event.target.closest?.(".command-context-edit");
  if (contextToggle) {
    setTimeout(() => {
      const card = contextToggle.closest("#shift-command-context");
      if (contextToggle.getAttribute("aria-expanded") !== "true") card?.classList.remove("shell-context-open");
      queueShellUpdate();
    }, 30);
  }

  if (event.target.closest?.(".nav-button[data-screen], .icon-button, .shift-button, #shift-context-form button, [data-context-reset]")) {
    setTimeout(() => queueShellUpdate(), 50);
    setTimeout(() => queueShellUpdate(), 180);
  }
}

function startScreenObserver() {
  if (shellObserver) return;
  shellObserver = new MutationObserver(() => queueShellUpdate());
  document.querySelectorAll(".nav-button[data-screen]").forEach((button) => {
    shellObserver.observe(button, { attributes: true, attributeFilter: ["class"] });
  });
  const title = document.querySelector("#screen-title");
  if (title) shellObserver.observe(title, { childList: true, characterData: true, subtree: true });
}

function startShellOwner() {
  document.documentElement.dataset.appShellOwner = SHELL_RELEASE;
  ensureSecondaryStrip();
  document.addEventListener("click", handleShellClick, true);
  window.addEventListener("storage", (event) => {
    if (!event.key || Object.values(SHELL_KEYS).includes(event.key)) queueShellUpdate();
  });
  ["storepilot:tasks-changed", "storepilot:incident-saved", "storepilot:notes-changed", "storepilot:loretta-away-changed"].forEach((name) => {
    window.addEventListener(name, () => queueShellUpdate());
  });
  window.addEventListener("focus", () => queueShellUpdate());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) queueShellUpdate(); });
  startScreenObserver();
  queueShellUpdate();
}

window.StorePilotAppShell = {
  version: SHELL_RELEASE,
  screen: () => currentScreen,
  update: () => updateShell(),
  openContext: openContextEditor
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startShellOwner, { once: true });
else startShellOwner();
