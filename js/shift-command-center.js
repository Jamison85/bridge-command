const COMMAND_KEYS = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  states: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7",
  reports: "storePilot.reports.v6",
  context: "storePilot.shiftContext.v2",
  incidents: "storePilot.incidents.v2"
};

const SHIFT_LABELS = { morning: "Morning", mid: "Mid", close: "Close" };
const SHIFT_DEFAULTS = {
  morning: { start: "06:00", end: "14:00" },
  mid: { start: "14:00", end: "22:00" },
  close: { start: "16:00", end: "23:59" }
};

const CONTEXT_MODES = {
  normal: { label: "Normal", hint: "Standard shift flow.", boost: null },
  "short-staffed": { label: "Short staffed", hint: "Protect coverage, quick wins, and documentation.", boost: /register|customer|coffee|fountain|restroom|trash|walk|safety|handoff/i },
  "truck-day": { label: "Truck day", hint: "Protect receiving space, freight flow, and recovery.", boost: /truck|receiving|backstock|cooler|open-air|walk|trash|floor/i },
  "busy-rush": { label: "Busy rush", hint: "Customer-facing resets and short tasks move up.", boost: /customer|coffee|fountain|restroom|trash|warmer|food|floor|walk/i },
  "leadership-visit": { label: "Leadership visit", hint: "Visible standards, audits, and admin deadlines move up.", boost: /bookwork|smartsafe|lto|audit|walk|restroom|cooler|fresh|report|handoff/i },
  "manager-coverage": { label: "Manager coverage", hint: "Admin, staffing, and handoff risks need a clear status.", boost: /bookwork|smartsafe|deposit|audit|order|labor|report|handoff|register/i },
  "incident-recovery": { label: "Incident recovery", hint: "Must-do work first. Lower-priority work gets documented.", boost: /safety|outage|system|register|customer|fresh|report|handoff/i },
  "kitchen-prep": { label: "Kitchen / prep", hint: "Food safety, prep deadlines, and customer demand lead.", boost: /food|fresh|warmer|prep|sandwich|wrap|salad|dough|temperature|kitchen/i }
};

const WEEKLY_TASKS = {
  0: [{ id: "outs", title: "Sunday outs check", area: "Weekly", minutes: 20, priority: 2, detail: "Complete outs check." }],
  1: [{ id: "store-order", title: "Store order by 2 PM", area: "Weekly", minutes: 35, priority: 1, detail: "Protect time for the Monday store order.", due: "2:00 PM" }],
  2: [
    { id: "cig-audit", title: "Cigarette audits", area: "Weekly", minutes: 120, priority: 1, detail: "Tuesday audit block." },
    { id: "backstock", title: "Backstock and back room reset", area: "Weekly", minutes: 35, priority: 4, detail: "Put backstock out and organize priority areas." }
  ],
  3: [
    { id: "truck-prep", title: "Truck prep and walkway clear", area: "Truck", minutes: 20, priority: 2, detail: "Carts and receiving area ready." },
    { id: "truck-triage", title: "Truck triage", area: "Truck", minutes: 35, priority: 3, detail: "Prioritize customer-impacting freight first." }
  ]
};

const URGENT_PATTERN = /safety|unsafe|injury|accident|spill|wet floor|power outage|outage|system down|register down|pos down|food safety|temperature|spoiled|cooler down|freezer down|staffing crisis|call out|alone|security|police|medical/i;
const LEADERSHIP_PATTERN = /bookwork|smartsafe|deposit|lto|audit|order|labor|report|handoff|loretta|richard/i;
const CUSTOMER_PATTERN = /customer|register|coffee|fountain|restroom|trash|floor|walk|warmer|food|cooler|fresh|safety/i;
const DELEGATABLE_PATTERN = /coffee|fountain|restroom|trash|floor|walk|stock|backstock|cooler|facing|clean|recovery/i;

let commandRendering = false;
let commandObserver = null;
let lastAnalysis = null;

function commandRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function commandWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function commandEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function commandDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function commandShift() {
  const saved = commandRead(COMMAND_KEYS.shift, "morning");
  return SHIFT_LABELS[saved] ? saved : "morning";
}

function commandShiftKey(shift = commandShift(), date = new Date()) {
  return `${commandDateKey(date)}:${shift}`;
}

function defaultContext(shift = commandShift()) {
  const defaults = SHIFT_DEFAULTS[shift] || SHIFT_DEFAULTS.morning;
  return {
    mode: "normal",
    role: "manager",
    staffing: "normal",
    shiftStart: defaults.start,
    shiftEnd: defaults.end,
    coverageUntil: "",
    constraint: "",
    activeIncidentId: ""
  };
}

function getContext() {
  const key = commandShiftKey();
  const all = commandRead(COMMAND_KEYS.context, {});
  return { ...defaultContext(), ...(all[key] || {}) };
}

function saveContext(nextContext) {
  const all = commandRead(COMMAND_KEYS.context, {});
  all[commandShiftKey()] = { ...defaultContext(), ...nextContext };
  commandWrite(COMMAND_KEYS.context, all);
}

function parseClock(value, date = new Date()) {
  if (!/^\d{2}:\d{2}$/.test(value || "")) return null;
  const [hour, minute] = value.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function parseDue(value, date = new Date()) {
  if (!value) return null;
  const match = String(value).match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const ampm = String(match[3] || "").toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const due = new Date(date);
  due.setHours(hour, minute, 0, 0);
  return due;
}

function minutesBetween(later, earlier = new Date()) {
  return later ? Math.round((later - earlier) / 60000) : null;
}

function taskText(task, state = null) {
  return `${task?.title || ""} ${task?.area || ""} ${task?.detail || ""} ${state?.reason || ""}`.toLowerCase();
}

function allTasks() {
  const shift = commandShift();
  const templates = commandRead(COMMAND_KEYS.templates, {});
  const custom = commandRead(COMMAND_KEYS.customTasks, {})[commandShiftKey()] || [];
  const weekly = shift === "morning" ? (WEEKLY_TASKS[new Date().getDay()] || []) : [];
  return [...(templates[shift] || []), ...custom, ...weekly]
    .map((task, index) => ({ ...task, priority: Number(task.priority || index + 1), minutes: Number(task.minutes || 10) }))
    .sort((a, b) => a.priority - b.priority);
}

function getShiftData() {
  const key = commandShiftKey();
  const tasks = allTasks();
  const completedIds = new Set(commandRead(COMMAND_KEYS.completed, {})[key] || []);
  const states = commandRead(COMMAND_KEYS.states, {})[key] || {};
  const completed = tasks.filter((task) => completedIds.has(task.id));
  const unfinished = tasks.filter((task) => !completedIds.has(task.id));
  const active = unfinished.filter((task) => !states[task.id]);
  const delayed = unfinished.filter((task) => states[task.id]?.type === "delayed");
  const carried = unfinished.filter((task) => states[task.id]?.type === "carry");
  return { key, tasks, completedIds, states, completed, unfinished, active, delayed, carried };
}

function dueSignal(task) {
  const due = parseDue(task.due);
  const away = minutesBetween(due);
  if (away === null) return { score: 0, label: "", overdue: false };
  if (away < 0) return { score: 650, label: `${Math.abs(away)} min overdue`, overdue: true };
  if (away <= 30) return { score: 520, label: `due in ${away} min`, overdue: false };
  if (away <= 90) return { score: 360, label: `due in ${away} min`, overdue: false };
  if (away <= 180) return { score: 190, label: `due in ${away} min`, overdue: false };
  return { score: 55, label: `due ${task.due}`, overdue: false };
}

function scoreTask(task, data, context) {
  const state = data.states[task.id];
  const text = taskText(task, state);
  const due = dueSignal(task);
  const end = parseClock(context.shiftEnd);
  const remaining = Math.max(0, minutesBetween(end) ?? 999);
  const coverageEnd = parseClock(context.coverageUntil);
  const covering = coverageEnd && minutesBetween(coverageEnd) > 0;
  const mode = CONTEXT_MODES[context.mode] || CONTEXT_MODES.normal;
  let score = Math.max(0, 420 - Number(task.priority || 12) * 22) + due.score;

  if (URGENT_PATTERN.test(text)) score += 800;
  if (LEADERSHIP_PATTERN.test(text)) score += 170;
  if (CUSTOMER_PATTERN.test(text)) score += 85;
  if (mode.boost?.test(text)) score += 165;
  if (Number(task.minutes || 10) <= 10) score += 55;
  if (Number(task.minutes || 10) > remaining) score -= 340;
  if (remaining <= 60 && Number(task.minutes || 10) <= remaining) score += 90;

  if (context.staffing === "short") {
    if (CUSTOMER_PATTERN.test(text)) score += 110;
    if (Number(task.minutes || 10) > 25 && !URGENT_PATTERN.test(text) && !due.overdue) score -= 135;
  }

  if (covering) {
    if (/register|customer|coffee|fountain|front|trash|restroom/i.test(text)) score += 130;
    if (Number(task.minutes || 10) <= 10) score += 80;
    if (/backstock|truck|audit|bookwork|cooler|walk/i.test(text) && Number(task.minutes || 10) > 12) score -= 160;
  }

  if (context.role === "register" && /register|customer|coffee|fountain|front|trash|restroom/i.test(text)) score += 150;
  if (context.role === "kitchen" && /food|fresh|warmer|prep|sandwich|wrap|salad|dough|temperature/i.test(text)) score += 185;
  if (context.role === "floor" && /stock|backstock|cooler|walk|floor|facing|trash/i.test(text)) score += 145;
  if (context.role === "manager" && LEADERSHIP_PATTERN.test(text)) score += 95;

  return score;
}

function explainTask(task, context) {
  if (!task) return "The active list is handled or documented. Review the handoff before leaving.";
  const text = taskText(task);
  const due = dueSignal(task);
  const reasons = [];
  if (due.label) reasons.push(due.label);
  if (URGENT_PATTERN.test(text)) reasons.push("protects safety or store operations");
  if ((CONTEXT_MODES[context.mode] || CONTEXT_MODES.normal).boost?.test(text)) reasons.push(`fits ${CONTEXT_MODES[context.mode].label.toLowerCase()} mode`);
  if (LEADERSHIP_PATTERN.test(text)) reasons.push("leadership-visible");
  if (CUSTOMER_PATTERN.test(text)) reasons.push("customer-facing");
  if (Number(task.minutes || 10) <= 10) reasons.push("a quick win");
  if (context.coverageUntil && parseClock(context.coverageUntil) > new Date() && Number(task.minutes || 10) <= 10) reasons.push("fits your current coverage window");
  return reasons.length ? `Why now: ${reasons.slice(0, 3).join(", ")}.` : "Why now: it is the highest-impact open task for the current shift context.";
}

function waitsCopy(task) {
  if (!task) return "Nothing urgent is waiting.";
  const text = taskText(task);
  if (URGENT_PATTERN.test(text)) return "If it waits, an operations, safety, or documentation risk can grow.";
  if (LEADERSHIP_PATTERN.test(text)) return "If it waits, leadership-visible work may need an explanation later.";
  if (/fresh|cooler|food|warmer|date/i.test(text)) return "If it waits, freshness or presentation standards can slip.";
  if (CUSTOMER_PATTERN.test(text)) return "If it waits, customers will notice before the spreadsheet does.";
  return "If it waits, it becomes another loose end in the handoff.";
}

function getActiveIncident(context = getContext()) {
  const incidents = commandRead(COMMAND_KEYS.incidents, []);
  if (context.activeIncidentId) return incidents.find((incident) => incident.id === context.activeIncidentId && incident.status === "active") || null;
  return incidents.find((incident) => incident.shiftKey === commandShiftKey() && incident.status === "active") || null;
}

function analyzeShift() {
  const data = getShiftData();
  const context = getContext();
  const ranked = data.active
    .map((task) => ({ task, score: scoreTask(task, data, context) }))
    .sort((a, b) => b.score - a.score);
  const next = ranked[0]?.task || null;
  const coming = ranked.slice(1, 4).map((item) => item.task);
  const end = parseClock(context.shiftEnd);
  const minutesLeft = Math.max(0, minutesBetween(end) ?? 0);
  const activeMinutes = data.active.reduce((sum, task) => sum + Number(task.minutes || 10), 0);
  const overdue = data.active.filter((task) => dueSignal(task).overdue);
  const activeIncident = getActiveIncident(context);
  let risk = "controlled";
  if (activeIncident || data.active.some((task) => URGENT_PATTERN.test(taskText(task)))) risk = "critical";
  else if (overdue.length || activeMinutes > minutesLeft || data.delayed.length + data.carried.length >= 3 || context.mode !== "normal") risk = "watch";
  const completion = data.tasks.length ? Math.round((data.completed.length / data.tasks.length) * 100) : 0;
  const analysis = {
    data,
    context,
    ranked,
    next,
    coming,
    risk,
    completion,
    minutesLeft,
    activeMinutes,
    activeIncident,
    reason: explainTask(next, context),
    waits: waitsCopy(next)
  };
  lastAnalysis = analysis;
  return analysis;
}

function setStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => { status.textContent = "Ready"; }, 2200);
}

function refreshCore() {
  const activeShift = document.querySelector(".shift-button.active");
  if (activeShift) activeShift.click();
  else renderCommandCenter(true);
}

function completeTask(task) {
  if (!task) return;
  if (/walk/i.test(`${task.area || ""} ${task.title || ""}`)) {
    document.querySelector('[data-screen="tasks"]')?.click();
    setTimeout(() => document.querySelector(`[data-task="${CSS.escape(task.id)}"]`)?.closest("article")?.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
    return;
  }
  const key = commandShiftKey();
  const completed = commandRead(COMMAND_KEYS.completed, {});
  completed[key] = [...new Set([...(completed[key] || []), task.id])];
  commandWrite(COMMAND_KEYS.completed, completed);
  const allStates = commandRead(COMMAND_KEYS.states, {});
  const states = { ...(allStates[key] || {}) };
  delete states[task.id];
  allStates[key] = states;
  commandWrite(COMMAND_KEYS.states, allStates);
  setStatus("Marked done");
  refreshCore();
}

function setTaskState(taskId, type, reason) {
  const key = commandShiftKey();
  const allStates = commandRead(COMMAND_KEYS.states, {});
  allStates[key] = { ...(allStates[key] || {}), [taskId]: { type, reason, updatedAt: new Date().toISOString() } };
  commandWrite(COMMAND_KEYS.states, allStates);
}

function formatMinutes(minutes) {
  if (minutes <= 0) return "shift end reached";
  if (minutes < 60) return `${minutes} min left`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min left` : `${hours} hr left`;
}

function riskLabel(risk) {
  return risk === "critical" ? "Needs attention" : risk === "watch" ? "Watch" : "Controlled";
}

function modeOptions(selected) {
  return Object.entries(CONTEXT_MODES)
    .map(([value, mode]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${commandEscape(mode.label)}</option>`)
    .join("");
}

function ensureContextCard(analysis) {
  const shiftCard = document.querySelector(".shift-card");
  if (!shiftCard?.parentElement) return;
  let card = document.querySelector("#shift-command-context");
  if (!card) {
    card = document.createElement("section");
    card.id = "shift-command-context";
    shiftCard.parentElement.insertBefore(card, shiftCard.nextSibling);
  }
  const context = analysis.context;
  const mode = CONTEXT_MODES[context.mode] || CONTEXT_MODES.normal;
  const incidentLine = analysis.activeIncident ? `<span class="command-context-alert">Incident active: ${commandEscape(analysis.activeIncident.type)}</span>` : "";
  card.className = "shift-command-context";
  card.dataset.risk = analysis.risk;
  card.innerHTML = `
    <div class="command-context-summary">
      <div>
        <p>SHIFT CONTEXT</p>
        <strong>${commandEscape(mode.label)} · ${commandEscape(context.role.replace("-", " "))}</strong>
        <span>${commandEscape(mode.hint)}</span>
        ${incidentLine}
      </div>
      <button type="button" class="command-context-edit" aria-expanded="false">Edit</button>
    </div>
    <form id="shift-context-form" class="shift-context-form" hidden>
      <div class="command-form-grid two-col">
        <label>Mode<select name="mode">${modeOptions(context.mode)}</select></label>
        <label>Role<select name="role">
          ${[["manager","Manager / admin"],["register","Register coverage"],["floor","Center store / floor"],["kitchen","Kitchen / prep"]].map(([value,label]) => `<option value="${value}" ${context.role === value ? "selected" : ""}>${label}</option>`).join("")}
        </select></label>
        <label>Staffing<select name="staffing"><option value="normal" ${context.staffing === "normal" ? "selected" : ""}>Normal</option><option value="short" ${context.staffing === "short" ? "selected" : ""}>Short staffed</option></select></label>
        <label>Coverage until<input type="time" name="coverageUntil" value="${commandEscape(context.coverageUntil)}" /></label>
        <label>Shift start<input type="time" name="shiftStart" value="${commandEscape(context.shiftStart)}" /></label>
        <label>Shift end<input type="time" name="shiftEnd" value="${commandEscape(context.shiftEnd)}" /></label>
      </div>
      <label>Known constraint<textarea name="constraint" rows="2" placeholder="Register until 9:15, short staffed, corporate follow-up...">${commandEscape(context.constraint)}</textarea></label>
      <div class="command-inline-actions"><button class="primary-action" type="submit">Save context</button><button class="secondary-action command-light-button" type="button" data-context-reset>Reset</button></div>
    </form>`;

  const toggle = card.querySelector(".command-context-edit");
  const form = card.querySelector("#shift-context-form");
  toggle?.addEventListener("click", () => {
    const open = form.hidden;
    form.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Close" : "Edit";
  });
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(form);
    saveContext({
      ...context,
      mode: String(values.get("mode") || "normal"),
      role: String(values.get("role") || "manager"),
      staffing: String(values.get("staffing") || "normal"),
      coverageUntil: String(values.get("coverageUntil") || ""),
      shiftStart: String(values.get("shiftStart") || SHIFT_DEFAULTS[commandShift()].start),
      shiftEnd: String(values.get("shiftEnd") || SHIFT_DEFAULTS[commandShift()].end),
      constraint: String(values.get("constraint") || "").trim()
    });
    setStatus("Context updated");
    renderCommandCenter(true);
  });
  card.querySelector("[data-context-reset]")?.addEventListener("click", () => {
    saveContext({ ...defaultContext(), activeIncidentId: context.activeIncidentId || "" });
    setStatus("Context reset");
    renderCommandCenter(true);
  });
}

function ensureHero(analysis) {
  const title = document.querySelector("#next-title");
  const copy = document.querySelector("#next-copy");
  const oldDone = document.querySelector("#complete-next");
  const oldReport = document.querySelector("#open-report");
  if (!title || !copy || !oldDone || !oldReport) return;

  title.textContent = analysis.next?.title || "Ready for review";
  copy.textContent = analysis.next
    ? `${analysis.next.minutes} min · ${analysis.reason.replace(/^Why now:\s*/i, "")}`
    : `${analysis.data.completed.length} done and ${analysis.data.delayed.length + analysis.data.carried.length} documented.`;

  let done = oldDone;
  if (!oldDone.dataset.commandOwned) {
    done = oldDone.cloneNode(true);
    done.dataset.commandOwned = "true";
    oldDone.replaceWith(done);
  }
  done.textContent = analysis.next ? (/walk/i.test(`${analysis.next.area} ${analysis.next.title}`) ? "Open walk" : "Mark done") : "Review handoff";
  done.disabled = false;
  done.onclick = () => analysis.next ? completeTask(analyzeShift().next) : document.querySelector('[data-screen="log"]')?.click();

  let report = oldReport;
  if (!oldReport.dataset.commandOwned) {
    report = oldReport.cloneNode(true);
    report.dataset.commandOwned = "true";
    oldReport.replaceWith(report);
  }
  report.textContent = analysis.activeIncident ? "Update incident" : "Report incident";
  report.onclick = () => document.querySelector('[data-screen="report"]')?.click();
}

function comingUpHTML(analysis) {
  if (!analysis.coming.length) return `<div class="command-empty"><strong>No additional active tasks.</strong><span>Anything delayed or carried is already documented.</span></div>`;
  return analysis.coming.map((task, index) => `
    <article class="command-coming-row">
      <span>${index + 2}</span>
      <div><strong>${commandEscape(task.title)}</strong><small>${commandEscape(task.area)} · ${task.minutes} min${task.due ? ` · due ${commandEscape(task.due)}` : ""}</small></div>
    </article>`).join("");
}

function buildRescuePlan(analysis) {
  const available = Math.max(0, analysis.minutesLeft - 15);
  const must = [];
  const delegate = [];
  const defer = [];
  let used = 0;

  for (const item of analysis.ranked) {
    const task = item.task;
    const text = taskText(task);
    const minutes = Number(task.minutes || 10);
    const isMust = URGENT_PATTERN.test(text) || dueSignal(task).score >= 360 || LEADERSHIP_PATTERN.test(text) || must.length === 0;
    if (isMust && used + minutes <= Math.max(available, minutes)) {
      must.push(task);
      used += minutes;
    } else if (DELEGATABLE_PATTERN.test(text) && !LEADERSHIP_PATTERN.test(text) && delegate.length < 3) {
      delegate.push(task);
    } else {
      defer.push(task);
    }
  }
  return { must: must.slice(0, 4), delegate: delegate.slice(0, 3), defer: defer.slice(0, 6), available };
}

function rescueList(title, items, empty) {
  return `<section><h4>${title}</h4>${items.length ? `<ul>${items.map((task) => `<li>${commandEscape(task.title)} <span>${task.minutes} min</span></li>`).join("")}</ul>` : `<p>${empty}</p>`}</section>`;
}

function rescueHTML(analysis) {
  const plan = buildRescuePlan(analysis);
  const shouldRescue = Boolean(analysis.activeIncident || analysis.activeMinutes > analysis.minutesLeft || analysis.risk === "critical");
  return `
    <details class="command-rescue" ${shouldRescue ? "open" : ""}>
      <summary><span>SHIFT RESCUE</span><strong>${shouldRescue ? "Recovery plan recommended" : "Build a recovery plan"}</strong></summary>
      <div class="command-rescue-grid">
        ${rescueList("Must do", plan.must, "No critical work identified.")}
        ${rescueList("Delegate if possible", plan.delegate, "Nothing obvious to delegate.")}
        ${rescueList("Document for later", plan.defer, "Nothing needs to move.")}
      </div>
      ${plan.defer.length ? `<button type="button" class="secondary-action command-light-button" data-apply-rescue>Document lower-priority delays</button>` : ""}
    </details>`;
}

function renderNextScreen(analysis, force = false) {
  const nextActive = document.querySelector('[data-screen="next"]')?.classList.contains("active");
  const content = document.querySelector("#screen-content");
  if (!nextActive || !content) return;
  if (!force && content.querySelector("#command-center-screen")) return;
  content.innerHTML = `
    <section id="command-center-screen" class="command-center-screen">
      <article class="command-decision-card" data-risk="${analysis.risk}">
        <div class="command-decision-head">
          <div><p>WHY THIS IS NEXT</p><strong>${commandEscape(analysis.next?.title || "Shift review")}</strong></div>
          <span>${commandEscape(riskLabel(analysis.risk))}</span>
        </div>
        <p>${commandEscape(analysis.reason)}</p>
        <p class="command-waits"><b>If it waits:</b> ${commandEscape(analysis.waits)}</p>
        <div class="command-metrics">
          <span>${analysis.completion}% done</span>
          <span>${analysis.data.active.length} open</span>
          <span>${analysis.data.delayed.length} delayed</span>
          <span>${formatMinutes(analysis.minutesLeft)}</span>
        </div>
      </article>
      <article class="command-coming-card">
        <div class="command-section-head"><div><p>COMING UP</p><h3>After the current task</h3></div><button type="button" data-open-tasks>All tasks</button></div>
        <div class="command-coming-list">${comingUpHTML(analysis)}</div>
      </article>
      ${rescueHTML(analysis)}
    </section>`;
  content.querySelector("[data-open-tasks]")?.addEventListener("click", () => document.querySelector('[data-screen="tasks"]')?.click());
  content.querySelector("[data-apply-rescue]")?.addEventListener("click", () => {
    const plan = buildRescuePlan(analyzeShift());
    plan.defer.forEach((task) => setTaskState(task.id, "delayed", "Moved by Shift Rescue after current shift constraints."));
    setStatus(`${plan.defer.length} lower-priority item${plan.defer.length === 1 ? "" : "s"} documented`);
    refreshCore();
  });
}

function incidentDateTime(timeValue) {
  if (!timeValue) return new Date().toISOString();
  const result = parseClock(timeValue) || new Date();
  return result.toISOString();
}

function incidentSummary(incident) {
  const start = new Date(incident.startedAt).toLocaleString();
  const end = incident.endedAt ? new Date(incident.endedAt).toLocaleString() : "Still active";
  return `Incident update from Jamison - ${new Date(incident.createdAt).toLocaleString()}\n\nShift: ${SHIFT_LABELS[incident.shift] || incident.shift}\nType: ${incident.type}\nStatus: ${incident.status === "active" ? "Active" : "Resolved"}\nStarted: ${start}\nEnded: ${end}\n\nWhat happened:\n${incident.summary || "No summary entered."}\n\nOperational impact:\n${incident.impact || "Not listed."}\n\nWho was notified:\n${incident.notified || "Not listed."}\n\nActions taken:\n${incident.actions || "Not listed."}\n\nWork delayed or moved:\n${incident.delayed || "Not listed."}\n\nResolution / current status:\n${incident.resolution || "Still being worked."}`;
}

function saveIncident(form, status) {
  const values = new FormData(form);
  const incidents = commandRead(COMMAND_KEYS.incidents, []);
  const existingId = String(values.get("incidentId") || "");
  const existingIndex = incidents.findIndex((incident) => incident.id === existingId);
  const incident = {
    id: existingId || `incident-${Date.now()}`,
    shift: commandShift(),
    shiftKey: commandShiftKey(),
    type: String(values.get("type") || "Other"),
    status,
    startedAt: incidentDateTime(String(values.get("started") || "")),
    endedAt: status === "resolved" ? incidentDateTime(String(values.get("ended") || "")) : "",
    summary: String(values.get("summary") || "").trim(),
    impact: String(values.get("impact") || "").trim(),
    notified: String(values.get("notified") || "").trim(),
    actions: String(values.get("actions") || "").trim(),
    delayed: String(values.get("delayed") || "").trim(),
    resolution: String(values.get("resolution") || "").trim(),
    createdAt: existingIndex >= 0 ? incidents[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) incidents[existingIndex] = incident;
  else incidents.unshift(incident);
  commandWrite(COMMAND_KEYS.incidents, incidents.slice(0, 50));

  const reports = commandRead(COMMAND_KEYS.reports, []);
  reports.push(incidentSummary(incident));
  commandWrite(COMMAND_KEYS.reports, reports.slice(-50));

  const context = getContext();
  const mode = /short staff|call out/i.test(`${incident.type} ${incident.summary}`)
    ? "short-staffed"
    : /outage|system|power|register/i.test(`${incident.type} ${incident.summary}`)
      ? "incident-recovery"
      : context.mode;
  saveContext({ ...context, mode, activeIncidentId: status === "active" ? incident.id : "" });
  setStatus(status === "active" ? "Incident saved and recovery mode enabled" : "Incident resolved and saved");
  renderCommandCenter(true);
}

function renderIncidentScreen(analysis, force = false) {
  const reportActive = document.querySelector('[data-screen="report"]')?.classList.contains("active");
  const content = document.querySelector("#screen-content");
  if (!reportActive || !content) return;
  if (!force && content.querySelector("#command-incident-form")) return;
  const active = analysis.activeIncident;
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const latest = commandRead(COMMAND_KEYS.incidents, []).filter((incident) => incident.shiftKey === commandShiftKey()).slice(0, 3);
  content.innerHTML = `
    <form id="command-incident-form" class="command-incident-form">
      <input type="hidden" name="incidentId" value="${commandEscape(active?.id || "")}" />
      <div class="command-section-head"><div><p>INCIDENT MODE</p><h3>${active ? "Update active incident" : "Document what disrupted the shift"}</h3></div><span class="command-incident-status">${active ? "ACTIVE" : "READY"}</span></div>
      <div class="command-form-grid two-col">
        <label>Type<select name="type">
          ${["System outage","Power outage","Short staffed","Safety issue","Customer incident","Equipment failure","Delayed work","Other"].map((type) => `<option ${active?.type === type ? "selected" : ""}>${type}</option>`).join("")}
        </select></label>
        <label>Started<input type="time" name="started" value="${active ? new Date(active.startedAt).toTimeString().slice(0,5) : currentTime}" /></label>
        <label>Ended<input type="time" name="ended" value="${currentTime}" /></label>
        <label>Who was notified<input name="notified" value="${commandEscape(active?.notified || "")}" placeholder="Loretta, Richard, IT, maintenance..." /></label>
      </div>
      <label>What happened<textarea name="summary" rows="3" placeholder="Power failed, systems rebooted, tech support call...">${commandEscape(active?.summary || "")}</textarea></label>
      <label>Operational impact<textarea name="impact" rows="2" placeholder="Registers unavailable, customer delays, unable to complete bookwork...">${commandEscape(active?.impact || "")}</textarea></label>
      <label>Actions taken<textarea name="actions" rows="2" placeholder="Called support, moved staff, secured product, notified leadership...">${commandEscape(active?.actions || "")}</textarea></label>
      <label>Work delayed or moved<textarea name="delayed" rows="2" placeholder="Bookwork, cooler dates, cleaning, truck...">${commandEscape(active?.delayed || "")}</textarea></label>
      <label>Resolution / current status<textarea name="resolution" rows="2" placeholder="Systems restored at 11:20; remaining work reprioritized...">${commandEscape(active?.resolution || "")}</textarea></label>
      <div class="command-inline-actions">
        <button class="primary-action" type="button" data-save-incident="active">${active ? "Update active incident" : "Save active incident"}</button>
        <button class="secondary-action command-light-button" type="button" data-save-incident="resolved">Save as resolved</button>
      </div>
    </form>
    <article class="command-incident-history">
      <div class="command-section-head"><div><p>TODAY</p><h3>Incident history</h3></div></div>
      ${latest.length ? latest.map((incident) => `<div><strong>${commandEscape(incident.type)}</strong><span>${incident.status === "active" ? "Active" : "Resolved"} · ${new Date(incident.startedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</span></div>`).join("") : `<p>No incidents saved for this shift.</p>`}
    </article>`;
  content.querySelectorAll("[data-save-incident]").forEach((button) => button.addEventListener("click", () => saveIncident(content.querySelector("#command-incident-form"), button.dataset.saveIncident)));
}

function renderCommandCenter(force = false) {
  if (commandRendering) return;
  commandRendering = true;
  try {
    const analysis = analyzeShift();
    ensureContextCard(analysis);
    ensureHero(analysis);
    renderNextScreen(analysis, force);
    renderIncidentScreen(analysis, force);
    document.documentElement.classList.toggle("command-next-active", document.querySelector('[data-screen="next"]')?.classList.contains("active") === true);
  } finally {
    commandRendering = false;
  }
}

function observeCommandCenter() {
  if (commandObserver) return;
  commandObserver = new MutationObserver((mutations) => {
    if (commandRendering) return;
    const relevant = mutations.some((mutation) => mutation.type === "childList" && (mutation.target.id === "screen-content" || mutation.target.closest?.("#screen-content") || mutation.target.classList?.contains("shift-toggle")));
    if (relevant) setTimeout(() => renderCommandCenter(false), 0);
  });
  commandObserver.observe(document.body, { childList: true, subtree: true });
}

window.StorePilotCommandCenter = {
  analyze: analyzeShift,
  render: () => renderCommandCenter(true),
  buildRescuePlan: () => buildRescuePlan(analyzeShift())
};

window.addEventListener("storage", () => renderCommandCenter(true));
window.addEventListener("focus", () => renderCommandCenter(true));
window.addEventListener("resize", () => renderCommandCenter(false));
document.addEventListener("visibilitychange", () => { if (!document.hidden) renderCommandCenter(true); });

setTimeout(() => {
  observeCommandCenter();
  renderCommandCenter(true);
}, 180);
setInterval(() => renderCommandCenter(true), 60000);
