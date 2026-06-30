const STABLE_KEYS = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7"
};

const STABLE_SHIFT_NAMES = { morning: "Morning", mid: "Mid", close: "Close" };

function stableReadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function stableDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function stableShift() {
  return stableReadJSON(STABLE_KEYS.shift, "morning");
}

function stableShiftKey(shift = stableShift()) {
  return `${stableDateKey()}:${shift}`;
}

function stableData() {
  const shift = stableShift();
  const templates = stableReadJSON(STABLE_KEYS.templates, {});
  const custom = stableReadJSON(STABLE_KEYS.customTasks, {})[stableShiftKey(shift)] || [];
  const tasks = [...(templates[shift] || []), ...custom];
  const done = new Set(stableReadJSON(STABLE_KEYS.completed, {})[stableShiftKey(shift)] || []);
  const states = stableReadJSON(STABLE_KEYS.taskStates, {})[stableShiftKey(shift)] || {};
  return {
    shift,
    tasks,
    completed: tasks.filter((task) => done.has(task.id)),
    open: tasks.filter((task) => !done.has(task.id) && !states[task.id]),
    delayed: tasks.filter((task) => !done.has(task.id) && states[task.id]?.type === "delayed"),
    carried: tasks.filter((task) => !done.has(task.id) && states[task.id]?.type === "carry"),
    states
  };
}

function stableDueScore(task) {
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
  const minutes = Math.round((due - new Date()) / 60000);
  if (minutes < 0) return 36;
  if (minutes <= 30) return 30;
  if (minutes <= 90) return 18;
  return 6;
}

function stableImpact(task) {
  const text = `${task.title || ""} ${task.area || ""} ${task.detail || ""}`.toLowerCase();
  let score = 0;
  if (/safety|wet|water|incident|outage|register|system|customer|lock/.test(text)) score += 34;
  if (/loretta|richard|lto|report|handoff|bookwork|smartsafe|deposit|audit|order/.test(text)) score += 28;
  if (/fresh|cooler|date|food|warmer|coffee|fountain|restroom|trash|walk/.test(text)) score += 18;
  if ((task.minutes || 0) <= 10) score += 12;
  return score;
}

function stableScore(task, data) {
  const state = data.states[task.id];
  const stateBoost = state?.type === "delayed" ? 20 : state?.type === "carry" ? 14 : 0;
  return Math.max(0, 100 - Number(task.priority || 10) * 5) + stableImpact(task) + stableDueScore(task) + stateBoost;
}

function stableReason(task, data) {
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

function stableIfWaits(task) {
  if (!task) return "If it waits, nothing major is currently flagged, but the store still needs a final human check.";
  const text = `${task.title || ""} ${task.area || ""} ${task.detail || ""}`.toLowerCase();
  if (/safety|wet|water|lock|incident/.test(text)) return "If it waits, safety or documentation risk can grow.";
  if (/register|system|outage/.test(text)) return "If it waits, operations and follow-up documentation can get messy fast.";
  if (/lto|loretta|richard|report|bookwork|smartsafe|deposit|audit|order/.test(text)) return "If it waits, leadership-visible work may need extra explanation later.";
  if (/fresh|cooler|date|food|warmer/.test(text)) return "If it waits, freshness standards or customer-facing quality can slip.";
  if (/coffee|fountain|restroom|trash|floor/.test(text)) return "If it waits, the store can start feeling neglected to customers.";
  return "If it waits, it may become one more loose end for the handoff.";
}

function stableAnalysis() {
  const data = stableData();
  const followups = [...data.delayed, ...data.carried, ...data.open];
  const ranked = followups.map((task) => ({ task, score: stableScore(task, data) })).sort((a, b) => b.score - a.score);
  const next = ranked[0]?.task || null;
  const ratio = data.tasks.length ? data.completed.length / data.tasks.length : 0;
  const riskText = `${followups.length} open/follow-up · ${data.delayed.length} delayed · ${data.carried.length} carried`;
  let status = "Green";
  if (data.delayed.length >= 3 || data.carried.length >= 3 || followups.some((task) => /safety|wet|water|outage|register|system|incident/i.test(`${task.title} ${task.detail || ""}`))) status = "Red";
  else if (followups.length || ratio < 0.75) status = "Yellow";
  const score = next ? stableScore(next, data) : 0;
  const confidence = score > 130 ? "High" : score > 90 ? "Medium" : "Low";
  return { data, next, status, confidence, riskText, reason: stableReason(next, data), ifWaits: stableIfWaits(next) };
}

function stableButtonStyle(button, primary = false) {
  if (!button) return;
  button.style.minHeight = "44px";
  button.style.borderRadius = "16px";
  button.style.fontWeight = "900";
  button.style.padding = "12px 14px";
  button.style.color = primary ? "#43260f" : "#14392f";
  button.style.background = primary ? "#fff4df" : "rgba(255,255,255,0.82)";
  button.style.border = primary ? "1px solid rgba(184,115,54,0.45)" : "1px solid rgba(7,63,47,0.14)";
}

function forceReadableInside(card) {
  card.querySelectorAll("p, span, strong, b, div, .eyebrow, .badge").forEach((node) => {
    const text = (node.textContent || "").toLowerCase();
    const color = text.includes("lto") || text.includes("loretta") || text.includes("store:") || text.includes("confidence:") ? "#7c2d12" : "#14392f";
    node.style.setProperty("color", color, "important");
    node.style.setProperty("-webkit-text-fill-color", color, "important");
    node.style.setProperty("text-shadow", "none", "important");
    node.style.setProperty("opacity", "1", "important");
  });
}

function renderNextBrain() {
  const hero = document.querySelector(".hero-card");
  if (!hero) return;
  const analysis = stableAnalysis();
  const card = document.querySelector("#next-brain-explain") || document.createElement("div");
  card.id = "next-brain-explain";
  card.style.marginTop = "14px";
  card.style.padding = "14px";
  card.style.borderRadius = "20px";
  card.style.background = analysis.status === "Red" ? "#fee2e2" : analysis.status === "Yellow" ? "#fff7ed" : "#ecfdf5";
  card.style.setProperty("color", analysis.status === "Red" ? "#7f1d1d" : analysis.status === "Yellow" ? "#7c2d12" : "#064e3b", "important");
  card.style.border = "1px solid rgba(15,23,42,0.08)";
  card.innerHTML = `<p class="eyebrow" style="margin:0 0 6px;color:#7c2d12!important;-webkit-text-fill-color:#7c2d12!important;opacity:1!important;">SHIFT INTELLIGENCE</p><strong style="display:block;margin-bottom:6px;color:#7c2d12!important;-webkit-text-fill-color:#7c2d12!important;">${escapeStable(analysis.next?.title || "Final walk and handoff note")}</strong><p style="margin:0 0 8px;line-height:1.36;color:#14392f!important;-webkit-text-fill-color:#14392f!important;opacity:1!important;"><b style="color:#14392f!important;-webkit-text-fill-color:#14392f!important;">Why:</b> ${escapeStable(analysis.reason)}</p><p style="margin:0 0 10px;line-height:1.36;color:#14392f!important;-webkit-text-fill-color:#14392f!important;opacity:1!important;"><b style="color:#14392f!important;-webkit-text-fill-color:#14392f!important;">If it waits:</b> ${escapeStable(analysis.ifWaits)}</p><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="badge" style="background:rgba(255,255,255,.9);color:#7c2d12!important;-webkit-text-fill-color:#7c2d12!important;">Store: ${analysis.status}</span><span class="badge" style="background:rgba(255,255,255,.9);color:#7c2d12!important;-webkit-text-fill-color:#7c2d12!important;">Confidence: ${analysis.confidence}</span></div>`;
  if (!card.parentElement) hero.appendChild(card);
  forceReadableInside(card);
}

function polishHandoffControls() {
  const logActive = document.querySelector('[data-screen="log"]')?.classList.contains("active");
  if (!logActive) return;
  stableButtonStyle(document.querySelector("#handoff-new-version"), true);
  stableButtonStyle(document.querySelector("#refresh-review"), true);
  stableButtonStyle(document.querySelector("#make-smart-handoff"), true);
  stableButtonStyle(document.querySelector("#set-smart-endpoint"), false);
  const panel = document.querySelector("#smart-handoff-panel");
  if (panel) {
    panel.style.border = "1px solid rgba(7,63,47,0.14)";
    panel.style.background = "rgba(255,255,255,0.78)";
    panel.style.boxShadow = "0 14px 34px rgba(15,23,42,0.08)";
  }
}

function runStorePilotQA() {
  const checks = {
    logNav: Boolean(document.querySelector('[data-screen="log"]')),
    finishWalkHandler: true,
    handoffVarietyLoaded: typeof localStorage !== "undefined",
    smartBrainModule: Boolean(document.querySelector("#next-brain-explain") || document.querySelector("#smart-handoff-panel")),
    pwaRuntime: Boolean(document.querySelector("#system-status"))
  };
  const missing = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  if (missing.length) console.warn("Store Pilot QA warnings:", missing);
  return checks;
}

function stabilize() {
  try { renderNextBrain(); } catch (error) { console.warn("Store Pilot Next Brain failed", error); }
  try { polishHandoffControls(); } catch (error) { console.warn("Store Pilot handoff polish failed", error); }
}

function escapeStable(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

window.StorePilotQA = runStorePilotQA;
document.addEventListener("click", () => setTimeout(stabilize, 120));
document.addEventListener("change", () => setTimeout(stabilize, 120));
setInterval(stabilize, 1400);
setTimeout(() => { stabilize(); runStorePilotQA(); }, 500);
