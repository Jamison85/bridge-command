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

function completionLabel(review) {
  if (!review.tasks.length) return "0%";
  return `${Math.round((review.completed.length / review.tasks.length) * 100)}%`;
}

function modeLabel() {
  return readJSON(BRAIN_KEYS.endpoint, "") ? "API Connected" : "Local Only";
}

function modeClass() {
  return readJSON(BRAIN_KEYS.endpoint, "") ? "api" : "local";
}

function setSmartStatus(text) {
  const node = document.querySelector("#smart-handoff-status");
  if (node) node.textContent = text;
  const status = document.querySelector("#system-status");
  if (status && text) status.textContent = text;
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
  refreshSmartPanel();
}

function renderBrainResult(brain, why, status) {
  const result = document.querySelector("#smart-brain-result");
  if (!result) return;
  result.innerHTML = `<div class="smart-brain-next"><p class="smart-brain-kicker">CURRENT READ</p><strong>Store Status: ${escapeHTML(status)}</strong><p>Recommended next: ${escapeHTML(brain.next?.title || "Final walk and handoff note")}</p><p>${escapeHTML(why)}</p></div>`;
  const panel = document.querySelector("#smart-handoff-panel");
  if (panel) panel.dataset.status = String(status || brain.status || "green").toLowerCase();
}

function buildPanelHTML(review, brain) {
  const endpoint = readJSON(BRAIN_KEYS.endpoint, "");
  const shiftName = SHIFT_NAMES[review.shift] || "Shift";
  const nextTitle = brain.next?.title || "Final walk and handoff note";
  const status = String(brain.status || "Green").toLowerCase();
  return `
    <div class="smart-brain-head">
      <div class="smart-brain-title">
        <p>SMART SHIFT BRAIN</p>
        <h4>${escapeHTML(shiftName)} command read</h4>
      </div>
      <span class="smart-brain-mode ${modeClass()}">${escapeHTML(modeLabel())}</span>
    </div>
    <div class="smart-brain-status">
      <div class="smart-brain-stat"><span>Store</span><strong>${escapeHTML(brain.status)}</strong></div>
      <div class="smart-brain-stat"><span>Done</span><strong>${escapeHTML(completionLabel(review))}</strong></div>
      <div class="smart-brain-stat"><span>Follow-ups</span><strong>${review.delayed.length + review.carried.length + review.open.length}</strong></div>
    </div>
    <div id="smart-brain-result">
      <div class="smart-brain-next">
        <p class="smart-brain-kicker">RECOMMENDED NEXT MOVE</p>
        <strong>${escapeHTML(nextTitle)}</strong>
        <p>${escapeHTML(brain.reason)}</p>
      </div>
    </div>
    <div class="smart-brain-actions">
      <button id="make-smart-handoff" class="smart-primary" type="button">Build Smart Handoff</button>
      <button id="set-smart-endpoint" class="smart-secondary" type="button">${endpoint ? "Change API" : "Set API"}</button>
    </div>
    <p id="smart-handoff-status">${endpoint ? "API mode available. Local fallback still active." : "Local Shift Brain ready. API is optional."}</p>
    <p class="smart-brain-foot">Use this to rewrite the handoff without inventing completed work. Stunning that we have to say that, but here we are.</p>`;
}

function enhanceSmartHandoff() {
  const logActive = document.querySelector('[data-screen="log"]')?.classList.contains("active");
  if (!logActive) return;
  const options = document.querySelector(".handoff-options");
  const reviewBox = document.querySelector("#review-message");
  if (!options || !reviewBox) return;

  const review = getReviewData();
  const brain = analyzeShift(review);
  const signature = JSON.stringify({
    status: brain.status,
    next: brain.next?.title || "Final walk and handoff note",
    completion: completionLabel(review),
    delayed: review.delayed.length,
    carried: review.carried.length,
    open: review.open.length,
    mode: modeLabel()
  });

  let panel = document.querySelector("#smart-handoff-panel");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "smart-handoff-panel";
    panel.className = "smart-brain-panel";
    options.appendChild(panel);
  }

  panel.dataset.status = String(brain.status || "green").toLowerCase();
  if (panel.dataset.signature !== signature) {
    panel.dataset.signature = signature;
    panel.innerHTML = buildPanelHTML(review, brain);
    panel.querySelector("#make-smart-handoff")?.addEventListener("click", makeSmartHandoff);
    panel.querySelector("#set-smart-endpoint")?.addEventListener("click", configureEndpoint);
  }
}

function refreshSmartPanel() {
  const panel = document.querySelector("#smart-handoff-panel");
  if (panel) panel.dataset.signature = "";
  enhanceSmartHandoff();
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
