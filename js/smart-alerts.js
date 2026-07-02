const ALERT_KEYS = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7",
  contextMode: "storePilot.contextMode.v1"
};

const ALERT_SHIFT_NAMES = { morning: "Morning", mid: "Mid", close: "Close" };

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

function parseDue(task) {
  if (!task?.due) return null;
  const match = String(task.due).match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const ampm = (match[3] || "").toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const due = new Date();
  due.setHours(hour, minute, 0, 0);
  return due;
}

function dueMinutes(task) {
  const due = parseDue(task);
  if (!due) return null;
  return Math.round((due - new Date()) / 60000);
}

function buildAlerts(data = getAlertData()) {
  const alerts = [];
  const overdue = data.open.filter((task) => dueMinutes(task) !== null && dueMinutes(task) < 0);
  const dueSoon = data.open.filter((task) => {
    const away = dueMinutes(task);
    return away !== null && away >= 0 && away <= 45;
  });
  const safety = data.open.filter((task) => /safety|wet|water|outage|register|system|incident|lock/i.test(alertText(task)));
  const leadership = data.open.filter((task) => /lto|loretta|richard|bookwork|smartsafe|deposit|audit|report|labor|order/i.test(alertText(task)));
  const walks = data.open.filter((task) => /walk/i.test(alertText(task)));
  const guest = data.open.filter((task) => /coffee|fountain|restroom|trash|floor|customer|cooler|food|warmer|fresh/i.test(alertText(task)));
  const handoff = data.open.filter((task) => /handoff|note|log|closeout/i.test(alertText(task)));

  if (overdue.length) alerts.push(alertItem("red", "Overdue work", `${overdue[0].title} is already past its listed due time. Handle it before it becomes an explanation.`));
  if (safety.length) alerts.push(alertItem("red", "Safety or operations risk", `${safety[0].title} should stay near the top until it is handled or documented.`));
  if (data.delayed.length >= 3) alerts.push(alertItem("red", "Too many delayed items", `${data.delayed.length} tasks are delayed. Handoff needs a clear reason, not a vague little shrug.`));
  if (data.carried.length >= 3) alerts.push(alertItem("red", "Carry-forward pileup", `${data.carried.length} items are carried forward. This needs a plan before it becomes tomorrow's swamp.`));
  if (dueSoon.length) alerts.push(alertItem("warn", "Due soon", `${dueSoon[0].title} is coming up soon. Handle it before it turns into an explanation.`));
  if (leadership.length) alerts.push(alertItem("warn", "Leadership-visible item", `${leadership[0].title} is something Loretta or Richard may care about later.`));
  if (walks.length) alerts.push(alertItem("warn", "Walk still open", `${walks[0].title} is not complete yet. The floor does not inspect itself, rude as that is.`));
  if (guest.length && data.mode !== "normal") alerts.push(alertItem("warn", "Guest-facing pressure", `${guest[0].title} is boosted because this shift mode raises customer-facing risk.`));
  if (handoff.length && data.open.length <= 2) alerts.push(alertItem("info", "Handoff is the cleanup move", `${handoff[0].title} is close to being the best next use of time.`));
  if (!alerts.length) alerts.push(alertItem("info", "Shift looks controlled", "No major risks are flagged. Do the next task, keep notes clean, and try not to invent a crisis for entertainment."));

  return alerts.slice(0, 4);
}

function alertItem(level, title, detail) {
  return { level, title, detail };
}

function riskFromAlerts(alerts) {
  if (alerts.some((alert) => alert.level === "red")) return "red";
  if (alerts.some((alert) => alert.level === "warn")) return "yellow";
  return "green";
}

function iconFor(level) {
  if (level === "red") return "!";
  if (level === "warn") return "•";
  return "✓";
}

function riskLabel(risk) {
  return risk === "red" ? "Needs attention" : risk === "yellow" ? "Watch list" : "Controlled";
}

function briefingTitle(data, risk) {
  const shiftName = ALERT_SHIFT_NAMES[data.shift] || "Shift";
  if (risk === "red") return `${shiftName} briefing: fix the risky stuff first`;
  if (risk === "yellow") return `${shiftName} briefing: watch these before they bite`;
  return `${shiftName} briefing: keep it moving`;
}

function renderAlertsPanel() {
  const data = getAlertData();
  const alerts = buildAlerts(data);
  const risk = riskFromAlerts(alerts);
  let panel = document.querySelector("#smart-alerts-panel");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "smart-alerts-panel";
    panel.className = "smart-alerts-panel";
    const contextCard = document.querySelector("#context-engine-card");
    const shiftCard = document.querySelector(".shift-card");
    const anchor = contextCard || shiftCard;
    if (anchor?.parentElement) anchor.parentElement.insertBefore(panel, anchor.nextSibling);
  }
  if (!panel) return;

  panel.dataset.risk = risk;
  panel.innerHTML = `
    <div class="smart-alerts-head">
      <div><p>DAILY BRIEFING</p><strong>${escapeAlert(briefingTitle(data, risk))}</strong></div>
      <span class="smart-alerts-risk">${escapeAlert(riskLabel(risk))}</span>
    </div>
    <div class="smart-alerts-list">
      ${alerts.map((alert) => `<div class="smart-alert-item" data-level="${alert.level}"><span class="smart-alert-icon">${iconFor(alert.level)}</span><div><strong>${escapeAlert(alert.title)}</strong><p>${escapeAlert(alert.detail)}</p></div></div>`).join("")}
    </div>
    <div class="smart-alert-actions">
      <button class="primary-alert-action" type="button" data-alert-jump="next">Show Next Move</button>
      <button type="button" data-alert-jump="log">Open Handoff</button>
    </div>`;

  panel.querySelector('[data-alert-jump="next"]')?.addEventListener("click", () => document.querySelector('[data-screen="next"]')?.click());
  panel.querySelector('[data-alert-jump="log"]')?.addEventListener("click", () => document.querySelector('[data-screen="log"]')?.click());
}

function enhanceNextBriefing() {
  const nextActive = document.querySelector('[data-screen="next"]')?.classList.contains("active");
  const content = document.querySelector("#screen-content");
  const existing = document.querySelector("#smart-alerts-next-note");
  if (!nextActive || !content) {
    existing?.remove();
    return;
  }

  const data = getAlertData();
  const alerts = buildAlerts(data);
  const risk = riskFromAlerts(alerts);
  const topAlert = alerts[0];
  const card = existing || document.createElement("article");
  card.id = "smart-alerts-next-note";
  card.className = "smart-alerts-panel";
  card.dataset.risk = risk;
  card.innerHTML = `
    <div class="smart-alerts-head">
      <div><p>ALERT READ</p><strong>${escapeAlert(topAlert.title)}</strong></div>
      <span class="smart-alerts-risk">${escapeAlert(riskLabel(risk))}</span>
    </div>
    <div class="smart-alerts-list">
      <div class="smart-alert-item" data-level="${topAlert.level}"><span class="smart-alert-icon">${iconFor(topAlert.level)}</span><div><strong>${escapeAlert(topAlert.title)}</strong><p>${escapeAlert(topAlert.detail)}</p></div></div>
    </div>`;

  if (card.parentElement !== content) content.appendChild(card);
}

function renderSmartAlerts() {
  renderAlertsPanel();
  enhanceNextBriefing();
}

function escapeAlert(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

window.StorePilotSmartAlerts = { getData: getAlertData, buildAlerts };

document.addEventListener("click", () => setTimeout(renderSmartAlerts, 160));
document.addEventListener("change", () => setTimeout(renderSmartAlerts, 160));
setInterval(renderSmartAlerts, 2200);
setTimeout(renderSmartAlerts, 500);
