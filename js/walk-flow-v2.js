const WALK_V2_KEYS = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  taskStates: "storePilot.taskStates.v6"
};

const WALK_V2_ITEMS = [
  "Front doors / entry",
  "Restrooms",
  "Cooler / open-air",
  "Coffee area",
  "Fountain / BIBs",
  "Trash",
  "Wet floors / safety",
  "Customer-facing issues"
];

const WALK_ID_BY_SHIFT = {
  morning: "morning-walk",
  mid: "mid-walk",
  close: "close-walk"
};

function walkV2Read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function walkV2Write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function walkV2DateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function walkV2Shift() {
  return walkV2Read(WALK_V2_KEYS.shift, "morning");
}

function walkV2ShiftKey(shift = walkV2Shift(), date = new Date()) {
  return `${walkV2DateKey(date)}:${shift}`;
}

function walkV2CurrentWalkId() {
  return WALK_ID_BY_SHIFT[walkV2Shift()] || "morning-walk";
}

function walkV2AddFollowup(title, detail = "Created from Daily Walk because this item was not finished yet.") {
  const key = walkV2ShiftKey();
  const all = walkV2Read(WALK_V2_KEYS.customTasks, {});
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
  walkV2Write(WALK_V2_KEYS.customTasks, all);
}

function walkV2MarkComplete() {
  const key = walkV2ShiftKey();
  const all = walkV2Read(WALK_V2_KEYS.completed, {});
  const completed = new Set(all[key] || []);
  completed.add(walkV2CurrentWalkId());
  completed.add("daily-walk");
  all[key] = [...completed];
  walkV2Write(WALK_V2_KEYS.completed, all);

  const allStates = walkV2Read(WALK_V2_KEYS.taskStates, {});
  const states = { ...(allStates[key] || {}) };
  delete states[walkV2CurrentWalkId()];
  allStates[key] = states;
  walkV2Write(WALK_V2_KEYS.taskStates, allStates);
}

function walkV2ShowResult(card, followupCount) {
  const message = followupCount
    ? `Walk complete. ${followupCount} follow-up${followupCount === 1 ? "" : "s"} added to Tasks.`
    : "Walk complete. No follow-ups needed.";

  const status = document.querySelector("#system-status");
  if (status) status.textContent = message;

  if (card) {
    card.classList.add("done");
    card.style.border = "1px solid rgba(7,63,47,0.18)";
    card.style.background = "rgba(236,253,245,0.92)";
    let banner = card.querySelector("#walk-complete-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "walk-complete-banner";
      banner.style.marginTop = "12px";
      banner.style.padding = "12px";
      banner.style.borderRadius = "16px";
      banner.style.background = "rgba(255,255,255,0.85)";
      banner.style.border = "1px solid rgba(7,63,47,0.14)";
      banner.style.color = "#14392f";
      banner.style.fontWeight = "900";
      card.appendChild(banner);
    }
    banner.textContent = message;

    const button = card.querySelector("#finish-walk, [data-walk-action='finish']");
    if (button) {
      button.textContent = "Walk Saved ✓";
      button.disabled = true;
      button.style.opacity = "0.85";
      button.style.color = "#14392f";
      button.style.webkitTextFillColor = "#14392f";
    }
  }
}

function walkV2RefreshTasksSoon() {
  setTimeout(() => {
    document.querySelector('[data-screen="tasks"]')?.click();
  }, 650);
}

function walkV2Finish(event, button) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  const card = button.closest(".walk-card, article, .screen-card");
  const boxes = [...document.querySelectorAll("[data-walk-item]")];
  const unchecked = boxes.filter((box) => !box.checked);

  unchecked.forEach((box) => {
    const fallback = box.closest("label")?.textContent?.trim() || "Daily walk item";
    const label = WALK_V2_ITEMS[Number(box.dataset.walkItem)] || fallback;
    walkV2AddFollowup(`Follow up: ${label}`);
  });

  walkV2MarkComplete();
  walkV2ShowResult(card, unchecked.length);
  walkV2RefreshTasksSoon();
}

function walkV2IsFinishButton(button) {
  if (!button) return false;
  const text = (button.textContent || "").toLowerCase();
  return button.id === "finish-walk" || button.dataset.walkAction === "finish" || (text.includes("finish") && text.includes("walk"));
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!walkV2IsFinishButton(button)) return;
  walkV2Finish(event, button);
}, true);
