const BRAIN_STORAGE = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7"
};

const SHIFT_LABELS_BRAIN = { morning: "Morning", mid: "Mid", close: "Close" };
const BRAIN_DEFAULTS = {
  morning: [
    task("bookwork", "Bookwork / SmartSafe match", "Opening", 18, 1, "Verify SmartSafe, deposits, lottery, and starting cash."),
    task("smart-counts", "Smart Counts", "Inventory", 14, 2, "Complete Smart Counts early while the shift is still manageable."),
    task("lto", "LTO screenshot to Loretta", "Admin", 6, 3, "Send the daily LTO screenshot.", "10:00 AM"),
    task("morning-walk", "Morning walk", "Walk", 12, 4, "Check the store once, then transfer anything unfinished into follow-up tasks."),
    task("coffee-fountain", "Coffee and fountain reset", "Guest", 12, 5, "Cups, lids, straws, coffee area, fountain area, and BIBs."),
    task("open-air", "Open-air cooler dates", "Fresh", 12, 6, "Check dates, face product, and rotate as needed."),
    task("food-warmers", "Food warmers check", "Fresh", 8, 7, "Check quality, holding, labels, and presentation."),
    task("shift-note", "Morning handoff note", "Closeout", 7, 9, "Capture what was done, what moved, and what needs follow-up.")
  ],
  mid: [
    task("mid-walk", "Mid-shift floor reset walk", "Walk", 10, 1, "Check customer-facing areas and catch anything morning could not finish."),
    task("coffee-fountain-mid", "Coffee / fountain recovery", "Guest", 10, 2, "Refill cups, lids, straws, clean counters, and check fountain issues."),
    task("cooler-fresh-mid", "Cooler and fresh food check", "Fresh", 14, 3, "Face open-air, check dates, rotate issues, and fix empty spots."),
    task("restrooms-mid", "Restrooms and trash pass", "Guest", 10, 4, "Supplies, trash, quick wipe, and customer-facing reset."),
    task("backstock-mid", "Backstock / back room quick reset", "Stock", 20, 5, "Put out priority backstock and keep paths clear."),
    task("handoff-mid", "Mid-shift handoff note", "Closeout", 7, 8, "Log what was done, what still needs done, and anything leadership should know.")
  ],
  close: [
    task("close-walk", "Closing walk and recovery", "Walk", 12, 1, "Check floor, restrooms, trash, cooler, coffee, fountain, and safety issues."),
    task("dates-close", "Fresh food / cooler date pass", "Fresh", 14, 2, "Check open-air and priority fresh items."),
    task("coffee-fountain-close", "Coffee and fountain close reset", "Guest", 10, 3, "Clean and stock for the next morning."),
    task("restrooms-close", "Restrooms, trash, and floor", "Guest", 16, 4, "Restrooms stocked, trash handled, floors checked, and store presentable."),
    task("lock-doors", "Lock doors / closing timing", "Close", 5, 5, "Use the store process for closing timing."),
    task("handoff-close", "Closing handoff note", "Closeout", 8, 8, "Log what is complete, what carried forward, and any incident or delay.")
  ]
};

const BRAIN_WEEKLY = {
  0: [task("outs", "Sunday outs check", "Weekly", 20, 2, "Complete outs check.")],
  1: [task("store-order", "Store order by 2 PM", "Weekly", 35, 1, "Protect time for the Monday store order.", "2:00 PM")],
  2: [task("cig-audit", "Cigarette audits", "Weekly", 120, 1, "Tuesday audit block."), task("backstock", "Backstock and back room reset", "Weekly", 35, 4, "Put backstock out and organize priority areas.")],
  3: [task("truck-prep", "Truck prep and walkway clear", "Truck", 20, 2, "Carts/dollies ready and receiving area clear."), task("truck-triage", "Truck triage", "Truck", 35, 3, "Prioritize customer-impacting freight first.")]
};

const SHIFT_WINDOWS = { morning: [5, 12], mid: [11, 18], close: [16, 23] };

function task(id, title, area, minutes, priority, detail, due = "") { return { id, title, area, minutes, priority, detail, due }; }
function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function currentShift() { return readJSON(BRAIN_STORAGE.shift, defaultShift()); }
function defaultShift() { const hour = new Date().getHours(); return hour < 10 ? "morning" : hour < 16 ? "mid" : "close"; }
function dateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function shiftKey(shift = currentShift(), date = new Date()) { return `${dateKey(date)}:${shift}`; }
function templates() { return readJSON(BRAIN_STORAGE.templates, BRAIN_DEFAULTS); }
function completed() { return readJSON(BRAIN_STORAGE.completed, {})[shiftKey()] || []; }
function states() { return readJSON(BRAIN_STORAGE.taskStates, {})[shiftKey()] || {}; }
function customTasks() { return readJSON(BRAIN_STORAGE.customTasks, {})[shiftKey()] || []; }

function tasks() {
  const shift = currentShift();
  const day = new Date().getDay();
  const weekly = shift === "morning" ? (BRAIN_WEEKLY[day] || []) : [];
  return [...(templates()[shift] || BRAIN_DEFAULTS[shift] || []), ...customTasks(), ...weekly].sort((a, b) => a.priority - b.priority);
}

function parseDueMinutes(due) {
  if (!due) return null;
  const match = String(due).match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function minutesNow() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function areaWeight(item) {
  const text = `${item.title} ${item.area} ${item.detail}`.toLowerCase();
  if (/safety|wet|water|lock|incident|system|register|outage/.test(text)) return 42;
  if (/lto|loretta|richard|order|audit|bookwork|smartsafe|deposit|report/.test(text)) return 34;
  if (/fresh|cooler|date|food|warmer/.test(text)) return 28;
  if (/guest|coffee|fountain|restroom|trash|floor|walk/.test(text)) return 24;
  if (/handoff|note|log/.test(text)) return 14;
  return 18;
}

function scoreTask(item, doneSet, taskStates) {
  let score = Math.max(0, 90 - (Number(item.priority || 10) * 6));
  const reasons = [];
  score += areaWeight(item);
  reasons.push(`${item.area || "Task"} impact`);

  const due = parseDueMinutes(item.due);
  if (due !== null) {
    const diff = due - minutesNow();
    if (diff < 0) { score += 55; reasons.push("due time has passed"); }
    else if (diff <= 30) { score += 50; reasons.push("due within 30 minutes"); }
    else if (diff <= 90) { score += 32; reasons.push("due soon"); }
    else { score += 10; reasons.push("has a known deadline"); }
  }

  if (Number(item.minutes || 0) <= 8) { score += 14; reasons.push("quick win"); }
  if (/loretta|richard|handoff|report|lto/i.test(`${item.title} ${item.detail}`)) { score += 18; reasons.push("leadership visible"); }
  if (/safety|wet|lock|register|system|outage/i.test(`${item.title} ${item.detail}`)) { score += 20; reasons.push("protects store risk"); }

  const state = taskStates[item.id];
  if (state?.type === "delayed") { score -= 35; reasons.push(`already delayed: ${state.reason || "reason noted"}`); }
  if (state?.type === "carry") { score -= 45; reasons.push(`carried forward: ${state.reason || "next window"}`); }
  if (doneSet.has(item.id)) score = -999;

  return { item, score, reasons: reasons.slice(0, 4) };
}

function analyzeShift() {
  const allTasks = tasks();
  const doneSet = new Set(completed());
  const taskStates = states();
  const scored = allTasks.map((item) => scoreTask(item, doneSet, taskStates)).filter((entry) => entry.score > -900).sort((a, b) => b.score - a.score);
  const delayed = allTasks.filter((item) => !doneSet.has(item.id) && taskStates[item.id]?.type === "delayed");
  const carried = allTasks.filter((item) => !doneSet.has(item.id) && taskStates[item.id]?.type === "carry");
  const open = allTasks.filter((item) => !doneSet.has(item.id) && !taskStates[item.id]);
  const recommended = scored.find((entry) => !taskStates[entry.item.id]) || scored[0] || null;
  const risk = [];
  if (delayed.length) risk.push(`${delayed.length} delayed`);
  if (carried.length) risk.push(`${carried.length} carry-forward`);
  const dueSoon = open.filter((item) => {
    const due = parseDueMinutes(item.due);
    return due !== null && due - minutesNow() <= 60;
  });
  if (dueSoon.length) risk.push(`${dueSoon.length} due soon/overdue`);
  if (open.length > Math.max(3, allTasks.length / 2)) risk.push("many open tasks");
  const status = risk.length >= 3 ? "Red" : risk.length ? "Yellow" : "Green";
  const confidence = recommended?.score > 130 ? "High" : recommended?.score > 95 ? "Medium" : "Low";
  return { allTasks, open, delayed, carried, recommended, status, confidence, risk };
}

function styleCard(card, status) {
  const colors = status === "Red" ? ["#fee2e2", "#7f1d1d", "#fecaca"] : status === "Yellow" ? ["#fff7ed", "#7c2d12", "#fed7aa"] : ["#ecfdf5", "#064e3b", "#bbf7d0"];
  card.style.marginTop = "14px";
  card.style.padding = "14px";
  card.style.borderRadius = "18px";
  card.style.background = colors[0];
  card.style.color = colors[1];
  card.style.border = `1px solid ${colors[2]}`;
  card.style.boxShadow = "0 14px 32px rgba(15, 23, 42, 0.08)";
}

function renderBrain() {
  const hero = document.querySelector(".hero-card");
  if (!hero) return;
  const analysis = analyzeShift();
  const existing = document.querySelector("#shift-brain-card");
  const card = existing || document.createElement("div");
  card.id = "shift-brain-card";
  styleCard(card, analysis.status);
  const rec = analysis.recommended;
  const reasons = rec?.reasons?.length ? rec.reasons.join(" + ") : "shift is stable";
  const riskText = analysis.risk.length ? analysis.risk.join(" • ") : "No major risk flags right now";
  card.innerHTML = `<p class="eyebrow" style="color:inherit;margin:0 0 6px;opacity:.72">SHIFT BRAIN</p><strong style="display:block;font-size:1.02rem;margin-bottom:6px">${escapeHTML(rec ? rec.item.title : "Shift core looks stable")}</strong><p style="margin:0 0 8px;line-height:1.35"><b>Why:</b> ${escapeHTML(reasons)}.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="badge" style="background:rgba(255,255,255,.55);color:inherit">Confidence: ${analysis.confidence}</span><span class="badge" style="background:rgba(255,255,255,.55);color:inherit">Store: ${analysis.status}</span></div><p style="margin:10px 0 0;font-size:.86rem;line-height:1.35"><b>Risk read:</b> ${escapeHTML(riskText)}</p>`;
  if (!existing) hero.appendChild(card);
}

function upgradeDelayPrompt() {
  if (window.__storePilotSmartPrompt) return;
  window.__storePilotSmartPrompt = true;
  const originalPrompt = window.prompt.bind(window);
  window.prompt = (message, defaultValue = "") => {
    if (String(message || "").toLowerCase().includes("why is this delayed")) {
      return originalPrompt(message, "Short staffed / register coverage / customer rush / system issue / waiting on someone / lower priority today");
    }
    return originalPrompt(message, defaultValue);
  };
}

function escapeHTML(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }

upgradeDelayPrompt();
document.addEventListener("click", () => setTimeout(renderBrain, 80));
document.addEventListener("change", () => setTimeout(renderBrain, 80));
setInterval(renderBrain, 1200);
setTimeout(renderBrain, 300);
