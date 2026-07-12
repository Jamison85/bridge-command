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

const BRIEFING_VERSION = 1;
const SHIFT_LABELS = { morning: "Morning", mid: "Mid", close: "Close" };
let briefingObserver = null;
let briefingButtonQueued = false;
let autoOpenAttempts = 0;

function briefingRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function briefingWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function briefingEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
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
  const minutes = Math.max(1, Math.round(Number(ms || 0) / 60000));
  return formatMinutes(minutes);
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
  try { return window.StorePilotCommandCenter?.analyze?.() || null; }
  catch { return null; }
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
    .sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return a.dueAt - b.dueAt;
    });
}

function latestActiveIncident(analysis) {
  if (analysis?.activeIncident) return analysis.activeIncident;
  const cutoff = Date.now() - 36 * 60 * 60 * 1000;
  return briefingRead(BRIEFING_KEYS.incidents, [])
    .filter((incident) => incident.status === "active" && new Date(incident.updatedAt || incident.createdAt || 0).getTime() >= cutoff)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0] || null;
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
  else if (context.staffing === "short") lead = `You are short staffed. Protect coverage, deadlines, and the quickest visible wins.`;
  else if (deadlines[0]) lead = `Protect ${deadlines[0].task.title} by ${formatDue(deadlines[0].task.due)}.`;
  else if (notes.length) lead = `Loretta left ${notes.length} dated instruction${notes.length === 1 ? "" : "s"} for this shift.`;

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

function priorityRowsHTML(briefing) {
  if (!briefing.priorities.length) {
    return `<div class="briefing-empty"><strong>No active priorities.</strong><span>Review documented items and prepare the handoff.</span></div>`;
  }
  return briefing.priorities.map((task, index) => `
    <article class="briefing-priority-row ${index === 0 ? "first" : ""}">
      <span>${index + 1}</span>
      <div>
        <strong>${briefingEscape(task.title)}</strong>
        <small>${briefingEscape(task.area || "Shift")} · ${Number(task.minutes || 10)} min${task.due ? ` · due ${briefingEscape(task.due)}` : ""}</small>
      </div>
    </article>`).join("");
}

function headsUpHTML(briefing) {
  if (!briefing.headsUp.length) {
    return `<div class="briefing-clear"><strong>No major warnings.</strong><span>No active incidents, deadlines, dated Loretta notes, or carryover found.</span></div>`;
  }
  return briefing.headsUp.map((item) => `
    <article class="briefing-alert" data-tone="${briefingEscape(item.tone)}">
      <strong>${briefingEscape(item.label)}</strong>
      <span>${briefingEscape(item.detail)}</span>
    </article>`).join("");
}

function ensureBriefingSheet() {
  let sheet = document.querySelector("#shift-briefing-sheet");
  if (sheet) return sheet;
  sheet = document.createElement("section");
  sheet.id = "shift-briefing-sheet";
  sheet.className = "shift-briefing-sheet";
  sheet.setAttribute("aria-hidden", "true");
  sheet.innerHTML = `<div class="shift-briefing-card" role="dialog" aria-modal="true" aria-labelledby="shift-briefing-title"></div>`;
  sheet.addEventListener("click", (event) => {
    if (event.target === sheet || event.target.closest("[data-briefing-close]")) closeBriefing(true);
  });
  document.body.appendChild(sheet);
  return sheet;
}

function renderBriefing() {
  const briefing = buildBriefing();
  if (!briefing) return false;
  const sheet = ensureBriefingSheet();
  const card = sheet.querySelector(".shift-briefing-card");
  const mode = titleCase(briefing.context.mode || "normal");
  const role = titleCase(briefing.context.role || "manager");
  const staffing = briefing.context.staffing === "short" ? "Short staffed" : "Normal staffing";
  card.innerHTML = `
    <header class="shift-briefing-head">
      <div><p>START SHIFT</p><h2 id="shift-briefing-title">${briefingEscape(SHIFT_LABELS[briefing.shift])} briefing</h2></div>
      <div class="shift-briefing-head-actions">
        <span data-risk="${briefingEscape(briefing.analysis.risk)}">${briefingEscape(riskLabel(briefing.analysis.risk))}</span>
        <button type="button" data-briefing-close aria-label="Close briefing">Close</button>
      </div>
    </header>
    <p class="shift-briefing-lead">${briefingEscape(briefing.lead)}</p>
    <div class="shift-briefing-facts">
      <span>${briefing.analysis.data.active.length} open</span>
      <span>${briefing.deadlines.length} deadline${briefing.deadlines.length === 1 ? "" : "s"}</span>
      <span>${briefing.notes.length} Loretta</span>
      <span>${formatMinutes(briefing.analysis.minutesLeft)} left</span>
    </div>
    <section class="shift-briefing-section">
      <div class="shift-briefing-section-head"><p>PRIORITIES</p><h3>First three moves</h3></div>
      <div class="briefing-priority-list">${priorityRowsHTML(briefing)}</div>
    </section>
    <section class="shift-briefing-section heads-up">
      <div class="shift-briefing-section-head"><p>HEADS UP</p><h3>What can change the plan</h3></div>
      <div class="briefing-alert-list">${headsUpHTML(briefing)}</div>
    </section>
    <div class="shift-briefing-context-line"><strong>${briefingEscape(mode)} · ${briefingEscape(role)}</strong><span>${briefingEscape(staffing)}</span></div>
    <div class="shift-briefing-actions">
      <button type="button" class="briefing-start-button" data-briefing-start>Start shift</button>
      <button type="button" class="briefing-tasks-button" data-briefing-tasks>View tasks</button>
    </div>`;

  card.querySelector("[data-briefing-start]")?.addEventListener("click", () => closeBriefing(true));
  card.querySelector("[data-briefing-tasks]")?.addEventListener("click", () => {
    closeBriefing(true);
    document.querySelector('[data-screen="tasks"]')?.click();
  });
  return true;
}

function openBriefing() {
  if (window.StorePilotInterruptions?.getActive?.()) return window.StorePilotInterruptions.open();
  if (!renderBriefing()) return;
  const sheet = ensureBriefingSheet();
  sheet.classList.add("open");
  sheet.setAttribute("aria-hidden", "false");
  document.body.classList.add("shift-briefing-open");
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

function observeBriefingButton() {
  if (briefingObserver) return;
  briefingObserver = new MutationObserver(queueBriefingButton);
  briefingObserver.observe(document.body, { childList: true, subtree: true });
}

function initShiftBriefing() {
  ensureBriefingSheet();
  ensureBriefingButton();
  observeBriefingButton();
  setTimeout(maybeAutoOpen, 550);
}

window.StorePilotShiftBriefing = {
  open: openBriefing,
  close: closeBriefing,
  build: buildBriefing,
  resetCurrent: () => {
    const seen = briefingRead(BRIEFING_KEYS.seen, {});
    delete seen[briefingShiftKey()];
    briefingWrite(BRIEFING_KEYS.seen, seen);
  }
};

document.addEventListener("click", (event) => {
  if (!event.target.closest(".shift-button")) return;
  autoOpenAttempts = 0;
  setTimeout(maybeAutoOpen, 360);
});
window.addEventListener("storage", () => {
  if (document.querySelector(".shift-briefing-sheet.open")) renderBriefing();
});
window.addEventListener("storepilot:interruptions-changed", () => {
  if (document.querySelector(".shift-briefing-sheet.open")) renderBriefing();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) setTimeout(maybeAutoOpen, 180);
});

setTimeout(initShiftBriefing, 320);
