const MORNING_GUIDANCE_RELEASE = "command-center-20";
const MORNING_GUIDANCE_KEYS = {
  shift: "storePilot.shift.v6",
  context: "storePilot.shiftContext.v2",
  briefingSeen: "storePilot.shiftBriefings.v1",
  releaseSeen: `storePilot.managerGuidanceSeen.${MORNING_GUIDANCE_RELEASE}`
};

const MANAGER_WISDOM = {
  normal: [
    "Finish the work that requires quiet before the store gets loud. The first interruption rarely arrives alone.",
    "Do not carry the whole shift in your head. Write down the loose ends while they are still small enough to manage.",
    "Complete one management task before helping with ten visible little things. Motion is not the same as control.",
    "Check the areas everyone assumes are fine. Assumptions are where warmers, vaults, coolers, and bathrooms go to misbehave.",
    "A strong shift is not one with no problems. It is one where problems are noticed early, handled honestly, and documented clearly.",
    "A clean handoff starts during the shift. Five minutes before leaving is too late to reconstruct a day that has already escaped.",
    "The task nobody owns will become the task everybody explains later. Give important work a name and a person.",
    "Fix the repeat problem, not only today's symptom. Ten small rescues usually point to one missing routine."
  ],
  short: [
    "When staffing is thin, protect cash, safety, food, and documentation first. Everything else can wait with an honest reason.",
    "Being the fastest person in the building is not the same as managing the shift. Decide what only you can do, then delegate the rest.",
    "Do not hide short staffing by silently absorbing everything. Record the impact while it is happening, not after the evidence is gone.",
    "A short-staffed shift needs fewer promises and clearer priorities. Finish the essential work before collecting optional victories.",
    "Coverage problems become management problems when nobody names them. Say what is uncovered, what is protected, and what must move."
  ],
  "truck-day": [
    "Clear space before freight arrives. Moving the same case three times is not productivity, it is cardio with paperwork.",
    "Truck day rewards sequence. Protect the walkway, cold product, priority outs, and customer access before chasing perfect organization.",
    "Do not let easy freight steal the whole morning. Work the cases that affect sales, safety, and space first.",
    "A back room becomes manageable when every cart has a purpose. Mystery piles are merely tomorrow's arguments in cardboard form."
  ],
  "busy-rush": [
    "During a rush, protect the customer path and keep one eye on what will hurt after the rush. Recovery starts before the line disappears.",
    "A busy store can look productive while quietly running out of everything. Pause long enough to check cups, coffee, warmers, and restrooms.",
    "Do the shortest high-impact reset first. Five controlled minutes can prevent thirty chaotic ones later."
  ],
  "manager-coverage": [
    "When you are covering multiple roles, choose the next checkpoint before the current one ends. Otherwise the register will plan your day for you.",
    "Manager coverage means protecting decisions, not personally touching every task. Keep the work visible and assign what can leave your hands.",
    "The moment coverage opens, use it for the work only a manager can finish. Small floor tasks will always volunteer to consume that window."
  ],
  "leadership-visit": [
    "Do not stage a perfect five minutes. Fix the condition that would still look wrong after everyone stops watching.",
    "Leadership notices visible standards, but experienced managers also protect the records behind them. Presentation and proof travel together.",
    "Handle the obvious miss, then look one layer deeper. The second problem is usually the one that explains the first."
  ],
  "incident-recovery": [
    "During recovery, stabilize first and explain second. But write the timeline while it is fresh, because memory becomes generous after the crisis.",
    "An incident changes the definition of a successful shift. Protect people and operations, then document what normal work had to move.",
    "Do not restart everything at once after a disruption. Restore the critical path, confirm it works, then rebuild the routine around it."
  ],
  "kitchen-prep": [
    "Prep work expands to fill every available minute. Set the production order before opening packages, or urgency will choose it for you.",
    "Protect food safety and the next selling window first. A beautiful prep table does not help an empty open-air cooler.",
    "Batch similar work while the tools and ingredients are already out. Repeated setup is where a five-hour prep shift quietly disappears."
  ]
};

let guidanceObserver = null;
let guidanceQueued = false;

function guidanceRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function guidanceWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function guidanceEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function guidanceDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function guidanceShift() {
  const shift = guidanceRead(MORNING_GUIDANCE_KEYS.shift, "morning");
  return ["morning", "mid", "close"].includes(shift) ? shift : "morning";
}

function guidanceShiftKey(shift = guidanceShift()) {
  return `${guidanceDateKey()}:${shift}`;
}

function guidanceContext() {
  const all = guidanceRead(MORNING_GUIDANCE_KEYS.context, {});
  return {
    mode: "normal",
    role: "manager",
    staffing: "normal",
    ...(all[guidanceShiftKey()] || {})
  };
}

function isBookworkTask(task) {
  return String(task?.id || "") === "bookwork"
    || /\bbookwork\b|smartsafe\s*match/i.test(`${task?.title || ""} ${task?.detail || ""}`);
}

function openingBookwork(analysis) {
  if (!analysis || guidanceShift() !== "morning") return null;
  const context = analysis.context || guidanceContext();
  if (context.role !== "manager" || context.mode === "truck-day") return null;
  return (analysis.data?.active || []).find(isBookworkTask) || null;
}

function openingLead(bookwork) {
  return `Start with ${bookwork.title}. Protect the quiet opening window before the 8:00 AM manager photo check-in.`;
}

function applyOpeningPriority(analysis) {
  const bookwork = openingBookwork(analysis);
  if (!bookwork) return analysis;
  const currentRanked = Array.isArray(analysis.ranked) ? analysis.ranked : [];
  const highestScore = currentRanked.reduce((highest, item) => Math.max(highest, Number(item?.score || 0)), 0);
  const ranked = [
    { task: bookwork, score: highestScore + 1 },
    ...currentRanked.filter((item) => item?.task?.id !== bookwork.id)
  ];
  return {
    ...analysis,
    ranked,
    next: bookwork,
    coming: ranked.slice(1, 4).map((item) => item.task),
    reason: "Why now: opening bookwork needs quiet and control before the first manager photo checkpoint and the day's interruptions take over.",
    waits: "If it waits, cash and opening records become harder to verify once the store gets busy."
  };
}

function installAnalyzeGuidance() {
  const api = window.StorePilotCommandCenter;
  if (!api?.analyze) return false;
  if (api.__morningGuidanceRelease === MORNING_GUIDANCE_RELEASE) return true;
  const originalAnalyze = api.analyze.bind(api);
  api.analyze = () => applyOpeningPriority(originalAnalyze());
  api.__morningGuidanceRelease = MORNING_GUIDANCE_RELEASE;
  api.__morningGuidanceOriginalAnalyze = originalAnalyze;
  return true;
}

function comingRows(tasks) {
  if (!tasks.length) return `<div class="command-empty"><strong>No additional active tasks.</strong><span>Anything delayed or carried is already documented.</span></div>`;
  return tasks.map((task, index) => `
    <article class="command-coming-row">
      <span>${index + 2}</span>
      <div><strong>${guidanceEscape(task.title)}</strong><small>${guidanceEscape(task.area || "Shift")} · ${Number(task.minutes || 10)} min${task.due ? ` · due ${guidanceEscape(task.due)}` : ""}</small></div>
    </article>`).join("");
}

function setTextIfChanged(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function setHTMLIfChanged(node, value) {
  if (node && node.innerHTML !== value) node.innerHTML = value;
}

function patchMorningDashboard() {
  if (!installAnalyzeGuidance()) return;
  let analysis;
  try { analysis = window.StorePilotCommandCenter.analyze(); }
  catch { return; }
  const bookwork = openingBookwork(analysis);
  if (!bookwork) return;

  const title = document.querySelector("#next-title");
  const copy = document.querySelector("#next-copy");
  const button = document.querySelector("#complete-next");
  setTextIfChanged(title, bookwork.title);
  setTextIfChanged(copy, `${Number(bookwork.minutes || 10)} min · finish opening bookwork before the 8:00 AM manager photo check-in.`);
  if (button && !button.disabled) setTextIfChanged(button, "Mark done");

  const decision = document.querySelector(".command-decision-card");
  const decisionTitle = decision?.querySelector(".command-decision-head strong");
  const reason = decision?.querySelector(":scope > p:not(.command-waits)");
  const waits = decision?.querySelector(".command-waits");
  setTextIfChanged(decisionTitle, bookwork.title);
  setTextIfChanged(reason, analysis.reason);
  setHTMLIfChanged(waits, `<b>If it waits:</b> ${guidanceEscape(analysis.waits)}`);

  const coming = document.querySelector("#command-center-screen .command-coming-list");
  setHTMLIfChanged(coming, comingRows(analysis.coming || []));
  setTextIfChanged(document.querySelector(".shift-briefing-lead"), openingLead(bookwork));
  setTextIfChanged(document.querySelector(".briefing-native-hero h2"), openingLead(bookwork));
}

function stringHash(value) {
  let hash = 0;
  for (const character of String(value || "")) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

function wisdomCategory(context) {
  if (context.staffing === "short") return "short";
  if (MANAGER_WISDOM[context.mode]) return context.mode;
  return "normal";
}

function wisdomForToday() {
  const context = guidanceContext();
  const category = wisdomCategory(context);
  const pool = MANAGER_WISDOM[category] || MANAGER_WISDOM.normal;
  return {
    category,
    text: pool[stringHash(`${guidanceDateKey()}:${category}`) % pool.length]
  };
}

function wisdomLabel(category) {
  return ({
    normal: "Opening judgment",
    short: "Short-staffed judgment",
    "truck-day": "Truck-day judgment",
    "busy-rush": "Rush judgment",
    "manager-coverage": "Coverage judgment",
    "leadership-visit": "Walkthrough judgment",
    "incident-recovery": "Recovery judgment",
    "kitchen-prep": "Prep judgment"
  })[category] || "Manager judgment";
}

function insertMorningWisdom() {
  const existing = document.querySelector("[data-manager-wisdom]");
  if (guidanceShift() !== "morning") {
    existing?.remove();
    return;
  }
  const shell = document.querySelector(".briefing-native-shell");
  if (!shell) return;

  let analysis = null;
  try { analysis = window.StorePilotCommandCenter?.analyze?.() || null; }
  catch {}
  const bookwork = openingBookwork(analysis);
  if (bookwork) setTextIfChanged(shell.querySelector(".briefing-native-hero h2"), openingLead(bookwork));

  const wisdom = wisdomForToday();
  const key = `${guidanceDateKey()}:${wisdom.category}`;
  if (existing?.dataset.managerWisdom === key) return;
  existing?.remove();

  const card = document.createElement("section");
  card.className = "briefing-manager-wisdom";
  card.dataset.managerWisdom = key;
  card.innerHTML = `
    <div class="briefing-manager-wisdom-head">
      <div><p>YEARS ON THE FLOOR</p><h3>Manager note for today</h3></div>
      <span>${guidanceEscape(wisdomLabel(wisdom.category))}</span>
    </div>
    <p>${guidanceEscape(wisdom.text)}</p>`;
  const contextCard = shell.querySelector(".briefing-native-context");
  shell.insertBefore(card, contextCard || shell.querySelector(".briefing-native-actions") || null);
}

function resetCurrentBriefingOnce() {
  if (guidanceShift() !== "morning") return;
  const shiftKey = guidanceShiftKey("morning");
  if (localStorage.getItem(MORNING_GUIDANCE_KEYS.releaseSeen) === shiftKey) return;
  const seen = guidanceRead(MORNING_GUIDANCE_KEYS.briefingSeen, {});
  delete seen[shiftKey];
  guidanceWrite(MORNING_GUIDANCE_KEYS.briefingSeen, seen);
  localStorage.setItem(MORNING_GUIDANCE_KEYS.releaseSeen, shiftKey);
}

function runGuidance() {
  installAnalyzeGuidance();
  patchMorningDashboard();
  insertMorningWisdom();
}

function queueGuidance() {
  if (guidanceQueued) return;
  guidanceQueued = true;
  requestAnimationFrame(() => {
    guidanceQueued = false;
    runGuidance();
  });
}

function startMorningGuidance() {
  resetCurrentBriefingOnce();
  runGuidance();
  guidanceObserver = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.type === "childList")) queueGuidance();
  });
  guidanceObserver.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", () => setTimeout(queueGuidance, 30));
  window.addEventListener("storage", queueGuidance);
  window.addEventListener("focus", queueGuidance);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) queueGuidance(); });
  setInterval(queueGuidance, 60000);
}

window.StorePilotMorningManagerGuidance = {
  version: MORNING_GUIDANCE_RELEASE,
  wisdom: wisdomForToday,
  analyze: () => {
    const original = window.StorePilotCommandCenter?.__morningGuidanceOriginalAnalyze;
    return applyOpeningPriority(original ? original() : window.StorePilotCommandCenter?.analyze?.());
  }
};

document.documentElement.dataset.morningManagerGuidance = MORNING_GUIDANCE_RELEASE;
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startMorningGuidance, { once: true });
else startMorningGuidance();
