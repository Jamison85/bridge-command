const BRIEFING_RELEASE = "command-center-28";
const BRIEFING_KEYS = {
  seen: "storePilot.shiftBriefings.v1",
  shift: "storePilot.shift.v6",
  notes: "storePilot.lorettaNotes.v1",
  states: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7",
  customTasks: "storePilot.customTasks.v6",
  incidents: "storePilot.incidents.v2",
  interruptions: "storePilot.interruptions.v1"
};

const BRIEFING_VERSION = 2;
const SHIFT_LABELS = { morning: "Morning", mid: "Mid", close: "Close" };
let briefingObserver = null;
let briefingButtonQueued = false;
let autoOpenAttempts = 0;
let returnFocus = null;

function briefingRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function briefingWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function briefingEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function briefingDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function briefingShift() {
  const saved = briefingRead(BRIEFING_KEYS.shift, "morning");
  return SHIFT_LABELS[saved] ? saved : "morning";
}

function briefingShiftKey(shift = briefingShift(), date = new Date()) {
  return `${briefingDateKey(date)}:${shift}`;
}

function titleCase(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMinutes(minutes) {
  const value = Math.max(0, Math.round(Number(minutes || 0)));
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const remainder = value % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

function formatDuration(ms) {
  return formatMinutes(Math.max(1, Math.round(Number(ms || 0) / 60000)));
}

function formatDue(value) {
  return String(value || "").replace(/^due\s+/i, "");
}

function parseDue(value) {
  const match = String(value || "").match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const ampm = String(match[3] || "").toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const due = new Date();
  due.setHours(hour, minute, 0, 0);
  return due;
}

function analysisNow() {
  try {
    return window.StorePilotMorningManagerGuidance?.analyze?.()
      || window.StorePilotCommandCenter?.analyze?.()
      || null;
  } catch {
    return null;
  }
}

function todaysLorettaNotes() {
  const today = briefingDateKey();
  return briefingRead(BRIEFING_KEYS.notes, [])
    .filter((note) => note.status !== "archived" && (note.scheduledDates || []).includes(today));
}

function deadlineTasks(analysis) {
  return (analysis?.data?.active || [])
    .filter((task) => task.due)
    .map((task) => ({ task, dueAt: parseDue(task.due) }))
    .sort((left, right) => {
      if (!left.dueAt && !right.dueAt) return 0;
      if (!left.dueAt) return 1;
      if (!right.dueAt) return -1;
      return left.dueAt - right.dueAt;
    });
}

function latestActiveIncident(analysis) {
  if (analysis?.activeIncident) return analysis.activeIncident;
  const cutoff = Date.now() - 36 * 60 * 60 * 1000;
  return briefingRead(BRIEFING_KEYS.incidents, [])
    .filter((incident) => incident.status === "active" && new Date(incident.updatedAt || incident.createdAt || 0).getTime() >= cutoff)
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0))[0] || null;
}

function previousShiftRef() {
  const current = briefingShift();
  const date = new Date();
  if (current === "mid") return { shift: "morning", date, key: `${briefingDateKey(date)}:morning` };
  if (current === "close") return { shift: "mid", date, key: `${briefingDateKey(date)}:mid` };
  date.setDate(date.getDate() - 1);
  return { shift: "close", date, key: `${briefingDateKey(date)}:close` };
}

function previousUnfinished() {
  const previous = previousShiftRef();
  const states = briefingRead(BRIEFING_KEYS.states, {})[previous.key] || {};
  const templates = briefingRead(BRIEFING_KEYS.templates, {})[previous.shift] || [];
  const custom = briefingRead(BRIEFING_KEYS.customTasks, {})[previous.key] || [];
  const catalog = new Map([...templates, ...custom].map((task) => [task.id, task]));
  return Object.entries(states)
    .filter(([, state]) => state?.type === "carry" || state?.type === "delayed")
    .map(([id, state]) => ({
      id,
      title: catalog.get(id)?.title || titleCase(id.replace(/^custom-\d+-\d+-?/, "Task ")),
      type: state.type,
      reason: state.reason || "Documented by the previous shift."
    }))
    .slice(0, 4);
}

function interruptionSummary() {
  const key = briefingShiftKey();
  const items = briefingRead(BRIEFING_KEYS.interruptions, []).filter((item) => item.shiftKey === key);
  const totalMs = items.reduce((sum, item) => {
    if (item.status === "active") return sum + Math.max(0, Date.now() - new Date(item.startedAt).getTime());
    return sum + Number(item.durationMs || Math.max(0, new Date(item.endedAt || 0) - new Date(item.startedAt || 0)));
  }, 0);
  return { count: items.length, totalMs, active: items.find((item) => item.status === "active") || null };
}

function buildBriefing() {
  const analysis = analysisNow();
  if (!analysis) return null;
  const notes = todaysLorettaNotes();
  const deadlines = deadlineTasks(analysis);
  const incident = latestActiveIncident(analysis);
  const previous = previousUnfinished();
  const interruptions = interruptionSummary();
  const priorities = [analysis.next, ...(analysis.coming || [])]
    .filter(Boolean)
    .filter((task, index, list) => list.findIndex((item) => item.id === task.id) === index)
    .slice(0, 3);
  const context = analysis.context || {};
  const headsUp = [];

  if (incident) headsUp.push({
    tone: "critical",
    label: "Active incident",
    detail: `${incident.type}${incident.summary ? `: ${incident.summary}` : ""}`
  });
  if (deadlines[0]) headsUp.push({
    tone: deadlines[0].dueAt && deadlines[0].dueAt < new Date() ? "critical" : "watch",
    label: deadlines[0].dueAt && deadlines[0].dueAt < new Date() ? "Deadline overdue" : "Next deadline",
    detail: `${deadlines[0].task.title} · ${formatDue(deadlines[0].task.due)}`
  });
  if (notes.length) headsUp.push({
    tone: "normal",
    label: `${notes.length} Loretta note${notes.length === 1 ? "" : "s"} today`,
    detail: notes.slice(0, 2).map((note) => note.text).join(" · ")
  });
  if (previous.length) headsUp.push({
    tone: "watch",
    label: `${previous.length} item${previous.length === 1 ? "" : "s"} from the last shift`,
    detail: previous.slice(0, 2).map((item) => item.title).join(" · ")
  });
  if (context.constraint) headsUp.push({ tone: "watch", label: "Known constraint", detail: context.constraint });
  if (interruptions.count) headsUp.push({
    tone: interruptions.active ? "watch" : "normal",
    label: `${interruptions.count} interruption${interruptions.count === 1 ? "" : "s"} logged`,
    detail: `${formatDuration(interruptions.totalMs)} total${interruptions.active ? " · one still active" : ""}`
  });

  let lead = priorities[0]
    ? `Start with ${priorities[0].title}.`
    : "The active list is clear. Review the shift and protect the handoff.";
  if (incident) lead = `${incident.type} is still active. Stabilize operations before normal task flow.`;

  return {
    analysis,
    shift: briefingShift(),
    shiftKey: briefingShiftKey(),
    priorities,
    headsUp: headsUp.slice(0, 4),
    notes,
    deadlines,
    previous,
    interruptions,
    context,
    lead
  };
}

function riskLabel(risk) {
  return risk === "critical" ? "Needs attention" : risk === "watch" ? "Watch" : "Controlled";
}

function riskKey(risk) {
  return risk === "critical" ? "critical" : risk === "watch" ? "watch" : "controlled";
}

function priorityRowsHTML(briefing) {
  if (!briefing.priorities.length) {
    return `<div class="command-empty"><strong>No active priorities.</strong><span>Review documented items and protect the handoff.</span></div>`;
  }
  return briefing.priorities.map((task, index) => `
    <article class="command-coming-row briefing-native-row${index === 0 ? " active" : ""}">
      <span>${index + 1}</span>
      <div>
        <strong>${briefingEscape(task.title)}</strong>
        <small>${briefingEscape(task.area || "Shift")} · ${Number(task.minutes || 10)} min${task.due ? ` · due ${briefingEscape(task.due)}` : ""}</small>
      </div>
    </article>`).join("");
}

function headsUpHTML(briefing) {
  if (!briefing.headsUp.length) {
    return `<div class="command-empty"><strong>No major warnings.</strong><span>No active incidents, deadlines, dated notes, or carryover found.</span></div>`;
  }
  return briefing.headsUp.map((item) => `
    <article class="briefing-native-alert" data-tone="${briefingEscape(item.tone)}">
      <strong>${briefingEscape(item.label)}</strong>
      ${item.detail ? `<span>${briefingEscape(item.detail)}</span>` : ""}
    </article>`).join("");
}

function wisdomLabel(category) {
  return ({
    normal: "Opening judgment",
    short: "Short-staffed judgment",
    "truck-day": "Truck-day judgment",
    "busy-rush": "Rush judgment",
    "manager-coverage": "Coverage judgment",
    "leadership-visit": "Walkthrough judgment",
    "incident-recovery": "Recovery judgment",
    "kitchen-prep": "Prep judgment"
  })[category] || "Manager judgment";
}

function managerWisdomHTML(briefing) {
  if (briefing.shift !== "morning") return "";
  let wisdom = null;
  try { wisdom = window.StorePilotMorningManagerGuidance?.wisdom?.() || null; }
  catch { wisdom = null; }
  if (!wisdom?.text) return "";
  const key = `${briefingDateKey()}:${wisdom.category || "normal"}`;
  return `
    <section class="briefing-manager-wisdom" data-manager-wisdom="${briefingEscape(key)}">
      <div class="briefing-manager-wisdom-head">
        <div><p>YEARS ON THE FLOOR</p><h3>Manager note for today</h3></div>
        <span>${briefingEscape(wisdomLabel(wisdom.category))}</span>
      </div>
      <p>${briefingEscape(wisdom.text)}</p>
    </section>`;
}

function lorettaWinCategoryLabel(category) {
  return ({
    normal: "Extra-mile judgment",
    short: "Short-staffed win",
    "truck-day": "Truck-day win",
    "busy-rush": "Rush win",
    "manager-coverage": "Coverage win",
    "leadership-visit": "Walkthrough win",
    "incident-recovery": "Recovery win",
    "kitchen-prep": "Prep win",
    away: "Loretta-away win"
  })[category] || "Leadership win";
}

function lorettaWinTime(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "this shift";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function lorettaWinHTML() {
  let record = null;
  try { record = window.StorePilotLorettaWin?.current?.() || null; }
  catch { record = null; }
  if (!record?.suggestion) return "";
  const done = record.status === "done";
  const suggestion = record.suggestion;
  return `
    <section class="loretta-win-card${done ? " done" : ""} compact" data-loretta-win-card data-loretta-win-key="${briefingEscape(record.shiftKey)}">
      <div class="loretta-win-head">
        <div><p>OPTIONAL LEADERSHIP WIN</p><h3>Make Loretta's day easier</h3></div>
        <span>${done ? "Completed" : briefingEscape(lorettaWinCategoryLabel(record.category))}</span>
      </div>
      <div class="loretta-win-task">
        <strong>${briefingEscape(suggestion.title)}</strong>
        <p>${briefingEscape(suggestion.action)}</p>
      </div>
      ${done ? `
        <div class="loretta-win-complete"><span>✓</span><div><b>Leadership win recorded</b><small>Completed at ${briefingEscape(lorettaWinTime(record.completedAt))}. This does not change required shift progress.</small></div></div>
        <div class="loretta-win-actions"><button type="button" data-loretta-win-undo>Undo</button></div>` : `
        <div class="loretta-win-actions">
          <button type="button" class="loretta-win-done" data-loretta-win-done>Mark done</button>
          <button type="button" data-loretta-win-swap>Swap idea</button>
        </div>`}
    </section>`;
}

function factsHTML(briefing) {
  const facts = [`${briefing.analysis.data.active.length} open`];
  if (briefing.deadlines.length) facts.push(`${briefing.deadlines.length} deadline${briefing.deadlines.length === 1 ? "" : "s"}`);
  if (briefing.notes.length) facts.push(`${briefing.notes.length} Loretta`);
  facts.push(`${formatMinutes(briefing.analysis.minutesLeft)} left`);
  return facts.map((fact) => `<span>${briefingEscape(fact)}</span>`).join("");
}

function ensureBriefingSheet() {
  let sheet = document.querySelector("#shift-briefing-sheet");
  if (sheet) return sheet;
  sheet = document.createElement("section");
  sheet.id = "shift-briefing-sheet";
  sheet.className = "shift-briefing-sheet";
  sheet.setAttribute("aria-hidden", "true");
  sheet.innerHTML = `<div class="shift-briefing-card screen-card briefing-native-card" role="dialog" aria-modal="true" aria-labelledby="shift-briefing-title"></div>`;
  sheet.addEventListener("click", handleBriefingClick);
  document.body.appendChild(sheet);
  return sheet;
}

function handleBriefingClick(event) {
  const sheet = event.currentTarget;
  if (event.target === sheet || event.target.closest("[data-native-briefing-close]")) {
    closeBriefing(true);
    return;
  }
  if (event.target.closest("[data-native-briefing-start]")) {
    closeBriefing(true);
    return;
  }
  if (event.target.closest("[data-native-briefing-tasks]")) {
    closeBriefing(true);
    document.querySelector('[data-screen="tasks"]')?.click();
  }
}

function renderBriefing() {
  const briefing = buildBriefing();
  if (!briefing) return false;
  const sheet = ensureBriefingSheet();
  const card = sheet.querySelector(".shift-briefing-card");
  const mode = titleCase(briefing.context.mode || "normal");
  const role = titleCase(briefing.context.role || "manager");
  const staffing = briefing.context.staffing === "short" ? "Short staffed" : "Normal staffing";
  const currentRisk = riskKey(briefing.analysis.risk);

  card.className = "shift-briefing-card screen-card briefing-native-card";
  card.innerHTML = `
    <div class="briefing-native-shell" data-briefing-owner="${BRIEFING_RELEASE}">
      <header class="screen-header briefing-native-header">
        <div><p class="eyebrow">SHIFT BRIEFING</p><h2 id="shift-briefing-title">${briefingEscape(SHIFT_LABELS[briefing.shift])} briefing</h2></div>
        <button class="text-button" type="button" data-native-briefing-close>Close</button>
      </header>

      <section class="hero-card briefing-native-hero" data-risk="${currentRisk}">
        <div class="hero-meta"><span>START HERE</span><span>${briefingEscape(riskLabel(briefing.analysis.risk))}</span></div>
        <h2>${briefingEscape(briefing.lead)}</h2>
        <div class="command-metrics briefing-native-facts">${factsHTML(briefing)}</div>
      </section>

      <section class="command-coming-card briefing-native-priorities">
        <div class="command-section-head">
          <div><p>PRIORITIES</p><h3>First three moves</h3></div>
          <button type="button" data-native-briefing-tasks>All tasks</button>
        </div>
        <div class="command-coming-list">${priorityRowsHTML(briefing)}</div>
      </section>

      <details class="command-rescue briefing-native-heads-up" ${currentRisk === "critical" ? "open" : ""}>
        <summary><span>HEADS UP</span><strong>${briefing.headsUp.length ? `${briefing.headsUp.length} item${briefing.headsUp.length === 1 ? "" : "s"} can change the plan` : "Nothing major waiting"}</strong></summary>
        <div class="briefing-native-alert-list">${headsUpHTML(briefing)}</div>
      </details>

      ${managerWisdomHTML(briefing)}
      ${lorettaWinHTML()}

      <div class="command-context-summary briefing-native-context">
        <div><p>SHIFT CONTEXT</p><strong>${briefingEscape(mode)} · ${briefingEscape(role)}</strong><span>${briefingEscape(staffing)}</span></div>
      </div>

      <div class="command-inline-actions briefing-native-actions">
        <button class="primary-action" type="button" data-native-briefing-start>Start shift</button>
        <button class="secondary-action command-light-button" type="button" data-native-briefing-tasks>View tasks</button>
      </div>
    </div>`;
  return true;
}

function openBriefing() {
  if (window.StorePilotInterruptions?.getActive?.()) return window.StorePilotInterruptions.open();
  if (!renderBriefing()) return;
  const sheet = ensureBriefingSheet();
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  sheet.classList.add("open");
  sheet.setAttribute("aria-hidden", "false");
  document.body.classList.add("shift-briefing-open");
  requestAnimationFrame(() => sheet.querySelector("[data-native-briefing-close]")?.focus());
}

function markBriefingSeen() {
  const seen = briefingRead(BRIEFING_KEYS.seen, {});
  seen[briefingShiftKey()] = { version: BRIEFING_VERSION, seenAt: new Date().toISOString() };
  briefingWrite(BRIEFING_KEYS.seen, seen);
}

function closeBriefing(markSeen = true) {
  const sheet = document.querySelector("#shift-briefing-sheet");
  sheet?.classList.remove("open");
  sheet?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("shift-briefing-open");
  if (markSeen) markBriefingSeen();
  if (returnFocus?.isConnected) returnFocus.focus();
  returnFocus = null;
}

function hasSeenCurrentBriefing() {
  const record = briefingRead(BRIEFING_KEYS.seen, {})[briefingShiftKey()];
  return Boolean(record && Number(record.version || 0) >= BRIEFING_VERSION);
}

function maybeAutoOpen() {
  if (document.hidden || hasSeenCurrentBriefing() || document.querySelector(".shift-briefing-sheet.open")) return;
  if (window.StorePilotInterruptions?.getActive?.()) return;
  if (!analysisNow()) {
    if (autoOpenAttempts < 6) {
      autoOpenAttempts += 1;
      setTimeout(maybeAutoOpen, 300);
    }
    return;
  }
  autoOpenAttempts = 0;
  openBriefing();
}

function ensureBriefingButton() {
  const summary = document.querySelector(".command-context-summary");
  const edit = summary?.querySelector(".command-context-edit");
  if (!summary || !edit) return;
  let actions = summary.querySelector(".command-context-actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.className = "command-context-actions";
    edit.replaceWith(actions);
    actions.appendChild(edit);
  }
  if (actions.querySelector("[data-open-shift-briefing]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "shift-briefing-context-button";
  button.dataset.openShiftBriefing = "true";
  button.textContent = "Brief";
  button.setAttribute("aria-label", "Open shift briefing");
  button.addEventListener("click", openBriefing);
  actions.insertBefore(button, actions.firstChild);
}

function queueBriefingButton() {
  if (briefingButtonQueued) return;
  briefingButtonQueued = true;
  requestAnimationFrame(() => {
    briefingButtonQueued = false;
    ensureBriefingButton();
  });
}

function rerenderOpenBriefing() {
  if (document.querySelector(".shift-briefing-sheet.open")) renderBriefing();
}

function observeBriefingButton() {
  if (briefingObserver) return;
  const root = document.querySelector(".app-shell") || document.body;
  briefingObserver = new MutationObserver(queueBriefingButton);
  briefingObserver.observe(root, { childList: true, subtree: true });
}

function initShiftBriefing() {
  ensureBriefingSheet();
  ensureBriefingButton();
  observeBriefingButton();
  setTimeout(maybeAutoOpen, 550);
}

window.StorePilotShiftBriefing = {
  version: BRIEFING_RELEASE,
  open: openBriefing,
  close: closeBriefing,
  render: renderBriefing,
  build: buildBriefing,
  resetCurrent: () => {
    const seen = briefingRead(BRIEFING_KEYS.seen, {});
    delete seen[briefingShiftKey()];
    briefingWrite(BRIEFING_KEYS.seen, seen);
  }
};

document.documentElement.dataset.shiftBriefingOwner = BRIEFING_RELEASE;
document.addEventListener("click", (event) => {
  if (!event.target.closest(".shift-button")) return;
  autoOpenAttempts = 0;
  setTimeout(maybeAutoOpen, 360);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.querySelector(".shift-briefing-sheet.open")) closeBriefing(true);
});
window.addEventListener("storage", rerenderOpenBriefing);
window.addEventListener("storepilot:interruptions-changed", rerenderOpenBriefing);
window.addEventListener("storepilot:tasks-changed", rerenderOpenBriefing);
window.addEventListener("storepilot:incident-saved", rerenderOpenBriefing);
window.addEventListener("storepilot:leadership-win-changed", rerenderOpenBriefing);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) setTimeout(maybeAutoOpen, 180);
});

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initShiftBriefing, { once: true });
else initShiftBriefing();
