const INTEL_KEYS = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7"
};

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function todayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function shiftName() { return readJSON(INTEL_KEYS.shift, "morning"); }
function shiftKey(shift = shiftName()) { return `${todayKey()}:${shift}`; }

function shiftData() {
  const shift = shiftName();
  const templates = readJSON(INTEL_KEYS.templates, {});
  const custom = readJSON(INTEL_KEYS.customTasks, {})[shiftKey(shift)] || [];
  const tasks = [...(templates[shift] || []), ...custom];
  const completed = new Set(readJSON(INTEL_KEYS.completed, {})[shiftKey(shift)] || []);
  const states = readJSON(INTEL_KEYS.taskStates, {})[shiftKey(shift)] || {};
  return {
    tasks,
    completed: tasks.filter((task) => completed.has(task.id)),
    open: tasks.filter((task) => !completed.has(task.id) && !states[task.id]),
    delayed: tasks.filter((task) => !completed.has(task.id) && states[task.id]?.type === "delayed"),
    carried: tasks.filter((task) => !completed.has(task.id) && states[task.id]?.type === "carry"),
    states
  };
}

function dueScore(task) {
  if (!task.due) return 0;
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
  if (away < 0) return 36;
  if (away <= 30) return 30;
  if (away <= 90) return 18;
  return 6;
}

function impact(task) {
  const text = `${task.title || ""} ${task.area || ""} ${task.detail || ""}`.toLowerCase();
  let score = 0;
  if (/safety|wet|water|incident|outage|register|system|customer|lock/.test(text)) score += 34;
  if (/loretta|richard|lto|report|handoff|bookwork|smartsafe|deposit|audit|order/.test(text)) score += 28;
  if (/fresh|cooler|date|food|warmer|coffee|fountain|restroom|trash|walk/.test(text)) score += 18;
  if ((task.minutes || 0) <= 10) score += 12;
  return score;
}

function score(task, data) {
  const state = data.states[task.id];
  const stateBoost = state?.type === "delayed" ? 20 : state?.type === "carry" ? 14 : 0;
  return Math.max(0, 100 - Number(task.priority || 10) * 5) + impact(task) + dueScore(task) + stateBoost;
}

function reason(task, data) {
  if (!task) return "The core list is stable. Do one final floor walk, then send a clean handoff.";
  const text = `${task.title || ""} ${task.area || ""} ${task.detail || ""}`.toLowerCase();
  const reasons = [];
  if (task.due) reasons.push(`due ${task.due}`);
  if (/safety|wet|water|incident|outage|register|system|lock/.test(text)) reasons.push("protects safety or operations");
  if (/loretta|richard|lto|report|bookwork|smartsafe|deposit|audit|order/.test(text)) reasons.push("leadership-visible");
  if (/fresh|cooler|date|food|warmer/.test(text)) reasons.push("protects freshness and store standards");
  if ((task.minutes || 0) <= 10) reasons.push("quick win");
  if (data.states[task.id]?.type) reasons.push(`already marked ${data.states[task.id].type}`);
  return reasons.length ? `This is recommended because it is ${reasons.join(", ")}.` : "This is the highest-impact open item based on priority and shift context.";
}

function waits(task) {
  if (!task) return "If it waits, nothing major is currently flagged, but the store still needs a final human check.";
  const text = `${task.title || ""} ${task.area || ""} ${task.detail || ""}`.toLowerCase();
  if (/safety|wet|water|lock|incident/.test(text)) return "If it waits, safety or documentation risk can grow.";
  if (/register|system|outage/.test(text)) return "If it waits, operations and follow-up documentation can get messy fast.";
  if (/lto|loretta|richard|report|bookwork|smartsafe|deposit|audit|order/.test(text)) return "If it waits, leadership-visible work may need extra explanation later.";
  if (/fresh|cooler|date|food|warmer/.test(text)) return "If it waits, freshness standards or customer-facing quality can slip.";
  if (/coffee|fountain|restroom|trash|floor/.test(text)) return "If it waits, the store can start feeling neglected to customers.";
  return "If it waits, it may become one more loose end for the handoff.";
}

function analysis() {
  const data = shiftData();
  const followups = [...data.delayed, ...data.carried, ...data.open];
  const ranked = followups.map((task) => ({ task, score: score(task, data) })).sort((a, b) => b.score - a.score);
  const next = ranked[0]?.task || null;
  const ratio = data.tasks.length ? data.completed.length / data.tasks.length : 0;
  let status = "Green";
  if (data.delayed.length >= 3 || data.carried.length >= 3 || followups.some((task) => /safety|wet|water|outage|register|system|incident/i.test(`${task.title} ${task.detail || ""}`))) status = "Red";
  else if (followups.length || ratio < 0.75) status = "Yellow";
  const confidence = next && score(next, data) > 130 ? "High" : next ? "Medium" : "Low";
  return { next, data, status, confidence, reason: reason(next, data), waits: waits(next) };
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function setImportant(node, property, value) {
  node.style.setProperty(property, value, "important");
}

function renderReadableIntel() {
  const hero = document.querySelector(".hero-card");
  if (!hero) return;
  const item = analysis();
  const existing = document.querySelector("#next-brain-explain");
  const card = existing || document.createElement("div");
  card.id = "next-brain-explain";
  card.className = "shift-intel-readable";
  card.innerHTML = `
    <p class="intel-kicker">SHIFT INTELLIGENCE</p>
    <strong class="intel-title">${escapeHTML(item.next?.title || "Final walk and handoff note")}</strong>
    <p class="intel-body"><b>Why:</b> ${escapeHTML(item.reason)}</p>
    <p class="intel-body"><b>If it waits:</b> ${escapeHTML(item.waits)}</p>
    <div class="intel-badges"><span>Store: ${escapeHTML(item.status)}</span><span>Confidence: ${escapeHTML(item.confidence)}</span></div>
  `;
  if (!card.parentElement) hero.appendChild(card);

  setImportant(card, "margin-top", "14px");
  setImportant(card, "padding", "14px");
  setImportant(card, "border-radius", "20px");
  setImportant(card, "background", item.status === "Red" ? "#fee2e2" : item.status === "Yellow" ? "#fff7ed" : "#ecfdf5");
  setImportant(card, "border", "1px solid rgba(15,23,42,0.08)");
  setImportant(card, "box-shadow", "0 14px 34px rgba(15,23,42,0.08)");
  setImportant(card, "color", "#14392f");
  setImportant(card, "-webkit-text-fill-color", "#14392f");

  card.querySelectorAll(".intel-kicker, .intel-title, .intel-badges span").forEach((node) => {
    setImportant(node, "color", "#7c2d12");
    setImportant(node, "-webkit-text-fill-color", "#7c2d12");
    setImportant(node, "text-shadow", "none");
    setImportant(node, "opacity", "1");
  });

  card.querySelectorAll(".intel-body, .intel-body b").forEach((node) => {
    setImportant(node, "color", "#14392f");
    setImportant(node, "-webkit-text-fill-color", "#14392f");
    setImportant(node, "text-shadow", "none");
    setImportant(node, "opacity", "1");
    setImportant(node, "line-height", "1.36");
  });

  card.querySelectorAll(".intel-badges span").forEach((node) => {
    setImportant(node, "display", "inline-block");
    setImportant(node, "background", "rgba(255,255,255,0.94)");
    setImportant(node, "border", "1px solid rgba(124,45,18,0.12)");
    setImportant(node, "border-radius", "999px");
    setImportant(node, "padding", "8px 12px");
    setImportant(node, "font-weight", "900");
  });

  const badges = card.querySelector(".intel-badges");
  if (badges) {
    setImportant(badges, "display", "flex");
    setImportant(badges, "gap", "8px");
    setImportant(badges, "flex-wrap", "wrap");
  }
}

document.addEventListener("click", () => setTimeout(renderReadableIntel, 90));
document.addEventListener("change", () => setTimeout(renderReadableIntel, 90));
setInterval(renderReadableIntel, 600);
setTimeout(renderReadableIntel, 100);
