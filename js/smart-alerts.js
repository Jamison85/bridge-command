const ALERT_KEYS = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7",
  contextMode: "storePilot.contextMode.v1"
};

function alertRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function alertDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function alertShift() {
  return alertRead(ALERT_KEYS.shift, "morning");
}

function alertKey(shift = alertShift()) {
  return `${alertDay()}:${shift}`;
}

function getAlertData() {
  const shift = alertShift();
  const key = alertKey(shift);
  const templates = alertRead(ALERT_KEYS.templates, {});
  const custom = alertRead(ALERT_KEYS.customTasks, {})[key] || [];
  const tasks = [...(templates[shift] || []), ...custom];
  const completedIds = new Set(alertRead(ALERT_KEYS.completed, {})[key] || []);
  const states = alertRead(ALERT_KEYS.taskStates, {})[key] || {};
  const open = tasks.filter((task) => !completedIds.has(task.id));
  return {
    shift,
    tasks,
    completed: tasks.filter((task) => completedIds.has(task.id)),
    open,
    delayed: open.filter((task) => states[task.id]?.type === "delayed"),
    carried: open.filter((task) => states[task.id]?.type === "carry"),
    states,
    mode: alertRead(ALERT_KEYS.contextMode, "normal")
  };
}

function alertText(task) {
  return `${task?.title || ""} ${task?.area || ""} ${task?.detail || ""}`.toLowerCase();
}

function buildAlerts(data = getAlertData()) {
  const alerts = [];
  const delayedCount = data.delayed.length;
  const carriedCount = data.carried.length;
  const urgent = data.open.filter((task) => /outage|register|system|incident|lock|wet|water/i.test(alertText(task)));
  const leadership = data.open.filter((task) => /lto|loretta|richard|bookwork|smartsafe|deposit|audit|report|labor|order/i.test(alertText(task)));
  const walks = data.open.filter((task) => /walk/i.test(alertText(task)));

  if (urgent.length) alerts.push({ level: "red", title: "Operations item open", detail: `${urgent[0].title} should be handled or documented.` });
  if (delayedCount >= 3) alerts.push({ level: "red", title: "Too many delayed items", detail: `${delayedCount} tasks are delayed. Add a clean reason in the handoff.` });
  if (carriedCount >= 3) alerts.push({ level: "red", title: "Carry-forward pileup", detail: `${carriedCount} items are carried forward. Make a plan before tomorrow.` });
  if (leadership.length) alerts.push({ level: "warn", title: "Leadership-visible item", detail: `${leadership[0].title} may matter later.` });
  if (walks.length) alerts.push({ level: "warn", title: "Walk still open", detail: `${walks[0].title} is not complete yet.` });
  if (!alerts.length) alerts.push({ level: "info", title: "Shift looks controlled", detail: "No major risks are flagged. Keep moving through the list." });

  return alerts.slice(0, 4);
}

function removeDuplicateAlertCards() {
  document.querySelector("#smart-alerts-panel")?.remove();
  document.querySelector("#smart-alerts-next-note")?.remove();
}

window.StorePilotSmartAlerts = { getData: getAlertData, buildAlerts };

document.addEventListener("click", () => setTimeout(removeDuplicateAlertCards, 160));
document.addEventListener("change", () => setTimeout(removeDuplicateAlertCards, 160));
setInterval(removeDuplicateAlertCards, 2200);
setTimeout(removeDuplicateAlertCards, 500);
