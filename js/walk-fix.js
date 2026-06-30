const WALK_FIX_KEYS = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6"
};

const WALK_FIX_ITEMS = [
  "Front doors / entry",
  "Restrooms",
  "Cooler / open-air",
  "Coffee area",
  "Fountain / BIBs",
  "Trash",
  "Wet floors / safety",
  "Customer-facing issues"
];

function walkReadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function walkWriteJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function walkDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function walkCurrentShift() {
  return walkReadJSON(WALK_FIX_KEYS.shift, "morning");
}

function walkShiftKey(shift = walkCurrentShift(), date = new Date()) {
  return `${walkDateKey(date)}:${shift}`;
}

function addWalkFollowup(title, detail = "Created from daily walk because this was not complete yet.") {
  const key = walkShiftKey();
  const all = walkReadJSON(WALK_FIX_KEYS.customTasks, {});
  const tasks = all[key] || [];
  tasks.push({
    id: `walk-followup-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    area: "Follow-up",
    minutes: 8,
    priority: 45 + tasks.length,
    detail
  });
  all[key] = tasks;
  walkWriteJSON(WALK_FIX_KEYS.customTasks, all);
}

function markWalkComplete() {
  const key = walkShiftKey();
  const all = walkReadJSON(WALK_FIX_KEYS.completed, {});
  const completed = new Set(all[key] || []);
  completed.add("morning-walk");
  completed.add("daily-walk");
  completed.add("mid-walk");
  completed.add("close-walk");
  all[key] = [...completed];
  walkWriteJSON(WALK_FIX_KEYS.completed, all);
}

function finishDailyWalkFromDom() {
  const boxes = [...document.querySelectorAll("[data-walk-item]")];
  const unchecked = boxes.filter((box) => !box.checked);
  unchecked.forEach((box) => {
    const label = WALK_FIX_ITEMS[Number(box.dataset.walkItem)] || box.closest("label")?.textContent?.trim() || "Daily walk item";
    addWalkFollowup(`Follow up: ${label}`);
  });
  markWalkComplete();
  const status = document.querySelector("#system-status");
  if (status) status.textContent = unchecked.length ? `${unchecked.length} walk follow-up${unchecked.length === 1 ? "" : "s"} added` : "Daily walk complete";
  document.querySelector('[data-screen="tasks"]')?.click();
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("#finish-walk, [data-walk-action='finish'], button");
  if (!button) return;
  const text = (button.textContent || "").toLowerCase();
  const isWalkButton = button.id === "finish-walk" || button.dataset.walkAction === "finish" || (text.includes("finish") && text.includes("walk"));
  if (!isWalkButton) return;
  event.preventDefault();
  event.stopPropagation();
  finishDailyWalkFromDom();
}, true);
