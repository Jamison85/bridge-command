const BRAIN_KEYS = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7",
  endpoint: "storePilot.aiEndpoint.v1"
};

const SHIFT_NAMES = { morning: "Morning", mid: "Mid", close: "Close" };
const RECIPIENT_NAMES = { loretta: "Loretta", richard: "Richard", both: "Loretta and Richard" };

function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function dateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function currentShift() { return readJSON(BRAIN_KEYS.shift, "morning"); }
function shiftKey(shift = currentShift()) { return `${dateKey()}:${shift}`; }

function getReviewData() {
  const shift = currentShift();
  const templates = readJSON(BRAIN_KEYS.templates, {});
  const custom = readJSON(BRAIN_KEYS.customTasks, {})[shiftKey(shift)] || [];
  const tasks = [...(templates[shift] || []), ...custom];
  const completedIds = new Set(readJSON(BRAIN_KEYS.completed, {})[shiftKey(shift)] || []);
  const states = readJSON(BRAIN_KEYS.taskStates, {})[shiftKey(shift)] || {};
  return {
    shift,
    tasks,
    completed: tasks.filter((task) => completedIds.has(task.id)),
    delayed: tasks.filter((task) => !completedIds.has(task.id) && states[task.id]?.type === "delayed"),
    carried: tasks.filter((task) => !completedIds.has(task.id) && states[task.id]?.type === "carry"),
    open: tasks.filter((task) => !completedIds.has(task.id) && !states[task.id]),
    states
  };
}

function taskImpact(task) {
  const text = `${task.title || ""} ${task.area || ""} ${task.detail || ""}`.toLowerCase();
  let score = 0;
  if (/safety|wet|water|incident|outage|register|system|customer/.test(text)) score += 28;
  if (/loretta|richard|lto|report|handoff|bookwork|smartsafe|deposit|audit/.test(text)) score += 24;
  if (/fresh|cooler|date|food|warmer|coffee|fountain|restroom|trash/.test(text)) score += 16;
  if ((task.minutes || 0) <= 10) score += 10;
  return score;
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
  const now = new Date();
  const due = new Date();
  due.setHours(hour, minute, 0, 0);
  const minutesAway = Math.round((due - now) / 60000);
  if (minutesAway < 0) return 35;
  if (minutesAway <= 30) return 30;
  if (minutesAway <= 90) return 18;
  return 6;
}

function scoreTask(task, review) {
  const state = review.states[task.id];
  const base = Math.max(0, 90 - (Number(task.priority || 10) * 4));
  const stateBoost = state?.type === "delayed" ? 18 : state?.type === "carry" ? 12 : 0;
  return base + taskImpact(task) + dueScore(task) + stateBoost;
}

function analyzeShift(review = getReviewData()) {
  const followups = [...review.delayed, ...review.carried, ...review.open];
  const completedRatio = review.tasks.length ? review.completed.length / review.tasks.length : 0;
  const ranked = followups.map((task) => ({ task, score: scoreTask(task, review) })).sort((a, b) => b.score - a.score);
  const next = ranked[0]?.task || null;
  const hasIncident = followups.some((task) => /safety|water|outage|system|register|incident/i.test(`${task.title} ${task.detail || ""}`));
  const hasLeadership = followups.some((task) => /loretta|richard|lto|report|bookwork|smartsafe|deposit/i.test(`${task.title} ${task.detail || ""}`));
  let status = "Green";
  if (hasIncident || review.delayed.length >= 3 || review.carried.length >= 3) status = "Red";
  else if (followups.length || completedRatio < 0.7 || hasLeadership) status = "Yellow";
  const reason = next ? reasonForTask(next, review, hasIncident, hasLeadership) : "The planned list is in good shape, so the best next move is a final walk and clean handoff note.";
  const confidence = next && scoreTask(next, review) > 120 ? "High" : next ? "Medium" : "Low";
  return { status, next, reason, completedRatio, followupCount: followups.length, confidence };
}

function reasonForTask(task, review, hasIncident, hasLeadership) {
  const parts = [];
  const text = `${task.title} ${task.area || ""} ${task.detail || ""}`.toLowerCase();
  if (task.due) parts.push(`it has a listed due time of ${task.due}`);
  if (/loretta|richard|lto|report|bookwork|smartsafe|deposit/.test(text)) parts.push("it is leadership-visible or admin-sensitive");
  if (/safety|water|outage|system|register|incident/.test(text)) parts.push("it can affect safety, operations, or documentation");
  if ((task.minutes || 0) <= 10) parts.push("it is a quick win");
  if (review.states[task.id]?.type) parts.push(`it was marked ${review.states[task.id].type}`);
  if (!parts.length && hasIncident) parts.push("there are operational issues documented today");
  if (!parts.length && hasLeadership) parts.push("there are leadership-visible items still open");
  if (!parts.length) parts.push("it is the highest-scoring open item based on priority and impact");
  return `Recommended because ${parts.join(", ")}.`;
}

function listLine(items, limit, empty) {
  if (!items.length) return `- ${empty}`;
  const shown = items.slice(0, limit).map((task) => `- ${task.title}`);
  const hidden = items.length - shown.length;
  return hidden > 0 ? `${shown.join("\n")}\n- ${hidden} more item${hidden === 1 ? "" : "s"} still in Store Pilot` : shown.join("\n");
}

function getPrefs() {
  return { recipient: document.querySelector("#handoff-recipient")?.value || "loretta", tone: document.querySelector("#handoff-tone")?.value || "positive" };
}

function buildLocalSmartMessage(review, prefs, brain) {
  const name = RECIPIENT_NAMES[prefs.recipient] || "Loretta";
  const shiftName = SHIFT_NAMES[review.shift] || "Shift";
  const followups = [...review.delayed, ...review.carried, ...review.open];
  const nextTitle = brain.next?.title || "final walk and handoff note";
  const lead = prefs.recipient === "richard"
    ? `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"} ${name}, this is the smart ${shiftName.toLowerCase()} shift update from Jamison.`
    : `${name}, here is the smart handoff from my ${shiftName.toLowerCase()} shift.`;
  return `${lead}\n\nStore status: ${brain.status}\n\nWhat moved forward:\n${listLine(review.completed, 7, "No completed items were checked off yet, but the shift was reviewed.")}\n\nWhat still needs attention:\n${listLine(followups, 7, "No major follow-ups from the planned list right now.")}\n\nRecommended next move: ${nextTitle}\nWhy: ${brain.reason}\n\nI kept the focus on the highest-impact items first and documented anything that still needs a window.`;
}

async function callSmartEndpoint(endpoint, payload) {
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  return { message: await response.text() };
}

function setSmartStatus(text) {
  const node = document.querySelector("#smart-handoff-status");
  if (node) node.textContent = text;
}

async function makeSmartHandoff() {
  const review = getReviewData();
  const prefs = getPrefs();
  const brain = analyzeShift(review);
  const currentMessage = document.querySelector("#review-message")?.value || "";
  const endpoint = readJSON(BRAIN_KEYS.endpoint, "");
  const payload = { prefs, review, brain, currentMessage, instruction: "Write a concise, sincere manager handoff. Keep facts accurate. Do not invent completed work." };
  setSmartStatus(endpoint ? "Calling smart API..." : "Using local Shift Brain...");
  try {
    const result = endpoint ? await callSmartEndpoint(endpoint, payload) : {};
    const message = result.message || buildLocalSmartMessage(review, prefs, brain);
    const box = document.querySelector("#review-message");
    if (box) box.value = message;
    renderBrainResult(brain, result.why || brain.reason, result.storeStatus || brain.status);
    setSmartStatus(endpoint ? "Smart API handoff applied." : "Local smart handoff applied.");
  } catch {
    const fallback = buildLocalSmartMessage(review, prefs, brain);
    const box = document.querySelector("#review-message");
    if (box) box.value = fallback;
    renderBrainResult(brain, brain.reason, brain.status);
    setSmartStatus("API failed, local Shift Brain used instead.");
  }
}

function configureEndpoint() {
  const current = readJSON(BRAIN_KEYS.endpoint, "");
  const value = prompt("Paste your secure AI endpoint URL. Leave blank to use local Shift Brain only. Do not paste an API key here.", current) || "";
  writeJSON(BRAIN_KEYS.endpoint, value.trim());
  setSmartStatus(value.trim() ? "API endpoint saved." : "Using local Shift Brain only.");
}

function renderBrainResult(brain, why, status) {
  const result = document.querySelector("#smart-brain-result");
  if (!result) return;
  result.innerHTML = `<strong>Store Status: ${escapeHTML(status)}</strong><br><span>Recommended next: ${escapeHTML(brain.next?.title || "Final walk and handoff note")}</span><br><span>${escapeHTML(why)}</span>`;
}

function styleButton(button, primary = false) {
  button.style.background = primary ? "#fff4df" : "rgba(255,255,255,0.82)";
  button.style.color = "#43260f";
  button.style.border = "1px solid rgba(184, 115, 54, 0.45)";
  button.style.borderRadius = "16px";
  button.style.padding = "12px 14px";
  button.style.fontWeight = "950";
  button.style.boxShadow = primary ? "0 10px 24px rgba(184,115,54,0.15)" : "none";
}

function enhanceSmartHandoff() {
  const logActive = document.querySelector('[data-screen="log"]')?.classList.contains("active");
  if (!logActive || document.querySelector("#smart-handoff-panel")) return;
  const options = document.querySelector(".handoff-options");
  const reviewBox = document.querySelector("#review-message");
  if (!options || !reviewBox) return;
  const review = getReviewData();
  const brain = analyzeShift(review);
  const panel = document.createElement("div");
  panel.id = "smart-handoff-panel";
  panel.style.marginTop = "14px";
  panel.style.padding = "14px";
  panel.style.border = "1px solid rgba(7,63,47,0.12)";
  panel.style.borderRadius = "20px";
  panel.style.background = "rgba(255,255,255,0.68)";
  panel.innerHTML = `<h4 style="margin:0 0 6px;color:#14392f;">Smart Shift Brain</h4><p id="smart-brain-result" class="helper-text" style="margin:0 0 10px;"><strong>Store Status: ${escapeHTML(brain.status)}</strong><br><span>Recommended next: ${escapeHTML(brain.next?.title || "Final walk and handoff note")}</span><br><span>${escapeHTML(brain.reason)}</span></p><div style="display:flex;gap:8px;flex-wrap:wrap;"><button id="make-smart-handoff" type="button">Make Smart Handoff</button><button id="set-smart-endpoint" type="button">Set API Endpoint</button></div><p id="smart-handoff-status" class="helper-text" style="margin:10px 0 0;">Local Shift Brain ready. API optional.</p>`;
  options.appendChild(panel);
  const smartButton = panel.querySelector("#make-smart-handoff");
  const endpointButton = panel.querySelector("#set-smart-endpoint");
  styleButton(smartButton, true);
  styleButton(endpointButton, false);
  smartButton.addEventListener("click", makeSmartHandoff);
  endpointButton.addEventListener("click", configureEndpoint);
}

function upgradeDelayPrompt() {
  if (window.__storePilotSmartPrompt) return;
  window.__storePilotSmartPrompt = true;
  const originalPrompt = window.prompt.bind(window);
  window.prompt = (message, defaultValue = "") => {
    if (String(message || "").toLowerCase().includes("why is this delayed")) return originalPrompt(message, "Short staffed / register coverage / customer rush / system issue / waiting on someone / lower priority today");
    return originalPrompt(message, defaultValue);
  };
}

function escapeHTML(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }

upgradeDelayPrompt();
document.addEventListener("click", () => setTimeout(enhanceSmartHandoff, 120));
document.addEventListener("change", () => setTimeout(enhanceSmartHandoff, 120));
setInterval(enhanceSmartHandoff, 1000);
setTimeout(enhanceSmartHandoff, 500);
