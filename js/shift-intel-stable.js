const SI_KEYS = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7"
};

function siRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function siDay(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function siShift() { return siRead(SI_KEYS.shift, "morning"); }
function siKey() { return `${siDay()}:${siShift()}`; }
function siEscape(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
function important(node, prop, value) { node?.style?.setProperty(prop, value, "important"); }

function getData() {
  const shift = siShift();
  const key = siKey();
  const templates = siRead(SI_KEYS.templates, {});
  const custom = siRead(SI_KEYS.customTasks, {})[key] || [];
  const tasks = [...(templates[shift] || []), ...custom];
  const done = new Set(siRead(SI_KEYS.completed, {})[key] || []);
  const states = siRead(SI_KEYS.taskStates, {})[key] || {};
  return {
    tasks,
    states,
    completed: tasks.filter((task) => done.has(task.id)),
    followups: tasks.filter((task) => !done.has(task.id))
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

function score(task, states) {
  const text = `${task.title || ""} ${task.area || ""} ${task.detail || ""}`.toLowerCase();
  let value = Math.max(0, 100 - Number(task.priority || 10) * 5) + dueScore(task);
  if (/safety|wet|water|incident|outage|register|system|customer|lock/.test(text)) value += 34;
  if (/loretta|richard|lto|report|handoff|bookwork|smartsafe|deposit|audit|order/.test(text)) value += 28;
  if (/fresh|cooler|date|food|warmer|coffee|fountain|restroom|trash|walk/.test(text)) value += 18;
  if ((task.minutes || 0) <= 10) value += 12;
  if (states[task.id]?.type === "delayed") value += 20;
  if (states[task.id]?.type === "carry") value += 14;
  return value;
}

function reason(task, states) {
  if (!task) return "The core list is stable. Do one final floor walk, then send a clean handoff.";
  const text = `${task.title || ""} ${task.area || ""} ${task.detail || ""}`.toLowerCase();
  const reasons = [];
  if (task.due) reasons.push(`due ${task.due}`);
  if (/safety|wet|water|incident|outage|register|system|lock/.test(text)) reasons.push("protects safety or operations");
  if (/loretta|richard|lto|report|bookwork|smartsafe|deposit|audit|order/.test(text)) reasons.push("leadership-visible");
  if (/fresh|cooler|date|food|warmer/.test(text)) reasons.push("protects freshness and store standards");
  if ((task.minutes || 0) <= 10) reasons.push("quick win");
  if (states[task.id]?.type) reasons.push(`already marked ${states[task.id].type}`);
  return reasons.length ? `This is recommended because it is ${reasons.join(", ")}.` : "This is the highest-impact open item based on priority and shift context.";
}

function ifWaits(task) {
  if (!task) return "If it waits, nothing major is currently flagged, but the store still needs a final human check.";
  const text = `${task.title || ""} ${task.area || ""} ${task.detail || ""}`.toLowerCase();
  if (/safety|wet|water|lock|incident/.test(text)) return "If it waits, safety or documentation risk can grow.";
  if (/register|system|outage/.test(text)) return "If it waits, operations and follow-up documentation can get messy fast.";
  if (/lto|loretta|richard|report|bookwork|smartsafe|deposit|audit|order/.test(text)) return "If it waits, leadership-visible work may need extra explanation later.";
  if (/fresh|cooler|date|food|warmer/.test(text)) return "If it waits, freshness standards or customer-facing quality can slip.";
  if (/coffee|fountain|restroom|trash|floor/.test(text)) return "If it waits, the store can start feeling neglected to customers.";
  return "If it waits, it may become one more loose end for the handoff.";
}

function analyze() {
  const data = getData();
  const ranked = data.followups.map((task) => ({ task, score: score(task, data.states) })).sort((a, b) => b.score - a.score);
  const next = ranked[0]?.task || null;
  const delayed = data.followups.filter((task) => data.states[task.id]?.type === "delayed").length;
  const carried = data.followups.filter((task) => data.states[task.id]?.type === "carry").length;
  const ratio = data.tasks.length ? data.completed.length / data.tasks.length : 0;
  let status = "Green";
  if (delayed >= 3 || carried >= 3 || data.followups.some((task) => /safety|wet|water|outage|register|system|incident/i.test(`${task.title} ${task.detail || ""}`))) status = "Red";
  else if (data.followups.length || ratio < 0.75) status = "Yellow";
  const confidence = next && score(next, data.states) > 130 ? "High" : next ? "Medium" : "Low";
  return { next, status, confidence, reason: reason(next, data.states), waits: ifWaits(next) };
}

function styleCard(card) {
  important(card, "margin-top", "14px");
  important(card, "padding", "14px");
  important(card, "border-radius", "20px");
  important(card, "border", "1px solid rgba(15,23,42,0.08)");
  important(card, "box-shadow", "0 14px 34px rgba(15,23,42,0.08)");
  important(card, "color", "#14392f");
  important(card, "-webkit-text-fill-color", "#14392f");
  card.querySelectorAll(".intel-kicker, .intel-title, .intel-badges span").forEach((node) => {
    important(node, "color", "#7c2d12");
    important(node, "-webkit-text-fill-color", "#7c2d12");
    important(node, "opacity", "1");
    important(node, "text-shadow", "none");
  });
  card.querySelectorAll(".intel-body, .intel-body b").forEach((node) => {
    important(node, "color", "#14392f");
    important(node, "-webkit-text-fill-color", "#14392f");
    important(node, "opacity", "1");
    important(node, "text-shadow", "none");
    important(node, "line-height", "1.36");
  });
  card.querySelectorAll(".intel-badges span").forEach((node) => {
    important(node, "display", "inline-block");
    important(node, "background", "rgba(255,255,255,0.94)");
    important(node, "border", "1px solid rgba(124,45,18,0.12)");
    important(node, "border-radius", "999px");
    important(node, "padding", "8px 12px");
    important(node, "font-weight", "900");
  });
  const badges = card.querySelector(".intel-badges");
  if (badges) {
    important(badges, "display", "flex");
    important(badges, "gap", "8px");
    important(badges, "flex-wrap", "wrap");
  }
}

function renderStableIntel() {
  const hero = document.querySelector(".hero-card");
  if (!hero) return;
  const item = analyze();
  const signature = JSON.stringify({ title: item.next?.title || "Final walk and handoff note", status: item.status, confidence: item.confidence, reason: item.reason, waits: item.waits });
  const card = document.querySelector("#next-brain-explain") || document.createElement("div");
  card.id = "next-brain-explain";
  card.className = "shift-intel-stable";
  important(card, "background", item.status === "Red" ? "#fee2e2" : item.status === "Yellow" ? "#fff7ed" : "#ecfdf5");
  if (card.dataset.signature !== signature) {
    card.dataset.signature = signature;
    card.innerHTML = `<p class="intel-kicker">SHIFT INTELLIGENCE</p><strong class="intel-title">${siEscape(item.next?.title || "Final walk and handoff note")}</strong><p class="intel-body"><b>Why:</b> ${siEscape(item.reason)}</p><p class="intel-body"><b>If it waits:</b> ${siEscape(item.waits)}</p><div class="intel-badges"><span>Store: ${siEscape(item.status)}</span><span>Confidence: ${siEscape(item.confidence)}</span></div>`;
  }
  if (!card.parentElement) hero.appendChild(card);
  styleCard(card);
}

document.addEventListener("click", () => setTimeout(renderStableIntel, 120));
document.addEventListener("change", () => setTimeout(renderStableIntel, 120));
setInterval(renderStableIntel, 2400);
setTimeout(renderStableIntel, 150);
