const CONTEXT_KEYS = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7",
  mode: "storePilot.contextMode.v1"
};

const CONTEXT_MODES = [
  { id: "normal", label: "Normal", hint: "Standard shift flow." },
  { id: "short-staffed", label: "Short Staffed", hint: "Prioritize register coverage, quick wins, and handoff clarity.", boost: /register|customer|trash|restroom|coffee|fountain|handoff|walk|quick|safety/i },
  { id: "truck-day", label: "Truck Day", hint: "Protect receiving space, backstock, and customer-facing recovery.", boost: /truck|backstock|walk|cooler|open-air|trash|floor|receiving/i },
  { id: "busy-rush", label: "Busy Rush", hint: "Customer-facing tasks and fast resets move up.", boost: /coffee|fountain|restroom|trash|floor|customer|front|warmer|food|walk/i },
  { id: "corporate", label: "Corporate Visit", hint: "Leadership-visible, guest-facing, and standards work move up.", boost: /loretta|richard|lto|bookwork|smartsafe|audit|walk|restroom|cooler|fresh|report|handoff/i },
  { id: "loretta-out", label: "Loretta Out", hint: "Handoff, leadership visibility, and coverage risks matter more.", boost: /loretta|handoff|report|bookwork|smartsafe|audit|order|carry|delay/i },
  { id: "richard-visit", label: "Richard Visit", hint: "Labor, admin, audits, LTO, and leadership-sensitive work move up.", boost: /richard|lto|labor|bookwork|smartsafe|deposit|audit|report|handoff/i },
  { id: "lake-event", label: "Weather/Event Rush", hint: "Traffic, guest areas, safety, and fast resets matter more.", boost: /customer|coffee|fountain|restroom|trash|wet|safety|floor|cooler|food|warmer|walk/i }
];

const SHIFT_NAMES = { morning: "Morning", mid: "Mid", close: "Close" };

function contextRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function contextWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function contextDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function contextShift() {
  return contextRead(CONTEXT_KEYS.shift, "morning");
}

function contextKey(shift = contextShift()) {
  return `${contextDay()}:${shift}`;
}

function activeMode() {
  const saved = contextRead(CONTEXT_KEYS.mode, "normal");
  return CONTEXT_MODES.find((mode) => mode.id === saved) || CONTEXT_MODES[0];
}

function getContextData() {
  const shift = contextShift();
  const key = contextKey(shift);
  const templates = contextRead(CONTEXT_KEYS.templates, {});
  const custom = contextRead(CONTEXT_KEYS.customTasks, {})[key] || [];
  const tasks = [...(templates[shift] || []), ...custom];
  const done = new Set(contextRead(CONTEXT_KEYS.completed, {})[key] || []);
  const states = contextRead(CONTEXT_KEYS.taskStates, {})[key] || {};
  const open = tasks.filter((task) => !done.has(task.id));
  return {
    shift,
    tasks,
    completed: tasks.filter((task) => done.has(task.id)),
    open,
    delayed: open.filter((task) => states[task.id]?.type === "delayed"),
    carried: open.filter((task) => states[task.id]?.type === "carry"),
    freshOpen: open.filter((task) => !states[task.id]),
    states
  };
}

function taskText(task) {
  return `${task?.title || ""} ${task?.area || ""} ${task?.detail || ""}`.toLowerCase();
}

function dueScore(task) {
  if (!task?.due) return 0;
  const match = String(task.due).match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return 8;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const ampm = (match[3] || "").toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const due = new Date();
  due.setHours(hour, minute, 0, 0);
  const away = Math.round((due - new Date()) / 60000);
  if (away < 0) return 42;
  if (away <= 20) return 34;
  if (away <= 60) return 24;
  if (away <= 120) return 12;
  return 5;
}

function scoreTask(task, data, mode) {
  const text = taskText(task);
  let value = Math.max(0, 120 - Number(task.priority || 12) * 6) + dueScore(task);
  if (/wet|water|incident|outage|register|system|lock/.test(text)) value += 36;
  if (/loretta|richard|lto|report|handoff|bookwork|smartsafe|deposit|audit|order|labor/.test(text)) value += 30;
  if (/fresh|cooler|date|food|warmer|coffee|fountain|restroom|trash|floor|walk|customer|safety/.test(text)) value += 22;
  if ((task.minutes || 0) <= 10) value += 14;
  if (data.states[task.id]?.type === "delayed") value += 24;
  if (data.states[task.id]?.type === "carry") value += 18;
  if (mode.boost?.test(text)) value += 26;
  return value;
}

function explainTask(task, data, mode) {
  if (!task) return "Core work is complete. Do a final scan and write a clean handoff.";
  const text = taskText(task);
  const reasons = [];
  if (task.due) reasons.push(`due ${task.due}`);
  if (mode.id !== "normal" && mode.boost?.test(text)) reasons.push(`matches ${mode.label.toLowerCase()} mode`);
  if (/wet|water|incident|outage|register|system|lock/.test(text)) reasons.push("protects operations or documentation");
  if (/loretta|richard|lto|report|handoff|bookwork|smartsafe|deposit|audit|order|labor/.test(text)) reasons.push("leadership-visible");
  if (/fresh|cooler|date|food|warmer/.test(text)) reasons.push("protects freshness and store standards");
  if (/coffee|fountain|restroom|trash|floor|customer|walk|safety/.test(text)) reasons.push("customer-facing and standards-related");
  if ((task.minutes || 0) <= 10) reasons.push("a quick win");
  if (data.states[task.id]?.type) reasons.push(`already marked ${data.states[task.id].type}`);
  return reasons.length ? `Best next because it is ${reasons.join(", ")}.` : "Best next based on priority, state, and current shift context.";
}

function ifWaits(task) {
  if (!task) return "If it waits, the shift is probably okay, but the handoff still needs a final pass.";
  const text = taskText(task);
  if (/wet|water|lock|incident/.test(text)) return "If it waits, safety or documentation risk grows.";
  if (/register|system|outage/.test(text)) return "If it waits, operations and follow-up documentation can get messy fast.";
  if (/lto|loretta|richard|report|bookwork|smartsafe|deposit|audit|order|labor/.test(text)) return "If it waits, leadership-visible work may need extra explanation later.";
  if (/fresh|cooler|date|food|warmer/.test(text)) return "If it waits, freshness standards or customer-facing quality can slip.";
  if (/coffee|fountain|restroom|trash|floor|customer|safety/.test(text)) return "If it waits, customer-facing standards can slip.";
  return "If it waits, it becomes one more loose end for the handoff.";
}

function analyzeContext() {
  const data = getContextData();
  const mode = activeMode();
  const ranked = data.open.map((task) => ({ task, score: scoreTask(task, data, mode) })).sort((a, b) => b.score - a.score);
  const next = ranked[0]?.task || null;
  const incident = data.open.some((task) => /wet|water|outage|register|system|incident|lock/i.test(taskText(task)));
  const leadership = data.open.some((task) => /loretta|richard|lto|bookwork|smartsafe|audit|deposit|report|labor/i.test(taskText(task)));
  const completion = data.tasks.length ? data.completed.length / data.tasks.length : 0;
  let risk = "green";
  if (incident || data.delayed.length >= 3 || data.carried.length >= 3) risk = "red";
  else if (data.open.length || completion < 0.75 || leadership || mode.id !== "normal") risk = "yellow";
  return {
    data,
    mode,
    next,
    risk,
    completion,
    reason: explainTask(next, data, mode),
    waits: ifWaits(next),
    chips: [
      `${Math.round(completion * 100)}% done`,
      `${data.open.length} open`,
      `${data.delayed.length} delayed`,
      `${data.carried.length} carried`,
      mode.label
    ]
  };
}

function riskLabel(risk) {
  return risk === "red" ? "Red priority" : risk === "yellow" ? "Watch" : "Normal";
}

function ensureContextControls() {
  let card = document.querySelector("#context-engine-card");
  if (!card) {
    card = document.createElement("section");
    card.id = "context-engine-card";
    card.className = "context-engine-card context-engine-compact";
    const shiftCard = document.querySelector(".shift-card");
    if (shiftCard?.parentElement) shiftCard.parentElement.insertBefore(card, shiftCard.nextSibling);
  }
  if (!card) return;

  const analysis = analyzeContext();
  card.className = "context-engine-card context-engine-compact";
  card.dataset.risk = analysis.risk;
  card.innerHTML = `
    <div class="context-compact-row">
      <div>
        <p>SHIFT CONTEXT</p>
        <strong>${escapeContext(SHIFT_NAMES[analysis.data.shift] || "Shift")} • ${escapeContext(analysis.mode.label)}</strong>
        <span>${escapeContext(analysis.mode.hint)}</span>
      </div>
      <span class="context-risk-pill">${escapeContext(riskLabel(analysis.risk))}</span>
    </div>
    <details class="context-edit-drawer">
      <summary>Edit context</summary>
      <div class="context-mode-strip" role="group" aria-label="Shift context mode">
        ${CONTEXT_MODES.map((mode) => `<button class="context-mode-button ${mode.id === analysis.mode.id ? "active" : ""}" type="button" data-context-mode="${mode.id}">${escapeContext(mode.label)}</button>`).join("")}
      </div>
    </details>`;

  card.querySelectorAll("[data-context-mode]").forEach((button) => button.addEventListener("click", () => {
    contextWrite(CONTEXT_KEYS.mode, button.dataset.contextMode);
    const status = document.querySelector("#system-status");
    if (status) status.textContent = `${button.textContent} mode`;
    renderSmartContext();
  }));
}

function ensureInsightCard() {
  document.querySelector("#context-insight-card")?.remove();
}

function stableHeroLine(title) {
  if (/closing walk|walk and recovery/i.test(title || "")) {
    return "Best next: finish the walk, catch customer-facing issues, then document anything waiting.";
  }
  return "Best next: handle this focus item, then document anything waiting.";
}

function updateHeroWithContext() {
  const analysis = analyzeContext();
  const heroTitle = document.querySelector("#next-title");
  const heroCopy = document.querySelector("#next-copy");
  if (!heroTitle || !heroCopy || !analysis.next) return;
  const title = heroTitle.textContent?.trim() || analysis.next.title || "";
  heroCopy.textContent = stableHeroLine(title);
}

function renderSmartContext() {
  ensureContextControls();
  ensureInsightCard();
  updateHeroWithContext();
}

function escapeContext(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

window.StorePilotContextEngine = { analyze: analyzeContext, modes: CONTEXT_MODES };

document.addEventListener("click", () => setTimeout(renderSmartContext, 120));
document.addEventListener("change", () => setTimeout(renderSmartContext, 120));
setInterval(renderSmartContext, 1000);
setTimeout(renderSmartContext, 220);
