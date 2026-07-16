const LORETTA_WIN_RELEASE = "command-center-23";
const LORETTA_WIN_KEYS = {
  wins: "storePilot.leadershipWins.v1",
  shift: "storePilot.shift.v6",
  context: "storePilot.shiftContext.v2",
  away: "storePilot.lorettaAway.v1",
  briefingSeen: "storePilot.shiftBriefings.v1",
  releaseSeen: `storePilot.lorettaWinSeen.${LORETTA_WIN_RELEASE}`
};

const LORETTA_WIN_POOLS = {
  normal: [
    {
      id: "repeat-annoyance",
      title: "Fix one repeat annoyance before it gets mentioned",
      action: "Choose one issue Loretta has had to point out more than once. Correct it completely and leave the area obviously finished.",
      why: "Managers remember the problems that stop returning."
    },
    {
      id: "tomorrow-ready",
      title: "Make tomorrow's first hour easier",
      action: "Stage one piece of paperwork, supplies, labels, carts, or information the next manager will need.",
      why: "Quiet preparation saves more time than a dramatic last-minute rescue."
    },
    {
      id: "close-loose-loop",
      title: "Close one loose loop",
      action: "Check the status of one lingering repair, vendor, staffing, or inventory issue and record the next clear step.",
      why: "A clear answer is more useful than another vague reminder."
    },
    {
      id: "visible-zone",
      title: "Make one high-visibility area walk-ready",
      action: "Choose the checkout, coolers, warmers, ice vault, or bathrooms. Fix the full condition, not only the most obvious symptom.",
      why: "One unmistakably finished area shows judgment better than five half-finished ones."
    },
    {
      id: "employee-win",
      title: "Give one employee a clear win",
      action: "Assign one specific job, explain the finish line, verify it, and acknowledge the effort when it is done.",
      why: "Good managers improve the work without personally absorbing all of it."
    },
    {
      id: "prevent-shortage",
      title: "Prevent one shortage before customers find it",
      action: "Check a high-use supply or high seller such as cups, lids, coffee, warmer items, ice, or store supplies and correct the risk early.",
      why: "Prevented problems rarely look dramatic, which is why experienced managers value them."
    },
    {
      id: "backroom-friction",
      title: "Remove one back-room friction point",
      action: "Clear one path, consolidate one confusing group of product, label one mystery area, or make one cart's purpose obvious.",
      why: "A small organization fix can save the whole team repeated wasted motion."
    },
    {
      id: "clean-proof",
      title: "Leave one clean piece of proof",
      action: "Finish one meaningful condition and capture a concise photo or note showing what changed and what no longer needs attention.",
      why: "Useful proof prevents follow-up questions without turning the shift into a documentary."
    }
  ],
  short: [
    {
      id: "short-priorities",
      title: "Make the short-staffed priorities visible",
      action: "Name the three things being protected, assign what can be assigned, and document what has to move.",
      why: "Clear tradeoffs show control. Silently absorbing everything only hides the staffing problem."
    },
    {
      id: "short-impact",
      title: "Document one real staffing impact while it is happening",
      action: "Record the uncovered role, time window, and the specific work delayed or reassigned because of it.",
      why: "Specific facts protect the shift better than a frustrated summary written hours later."
    },
    {
      id: "short-bottleneck",
      title: "Remove the next-hour bottleneck",
      action: "Identify the one shortage, station, person, or unfinished setup most likely to slow everyone down and address that first.",
      why: "On a thin shift, removing one bottleneck beats trying to improve everything equally."
    }
  ],
  "truck-day": [
    {
      id: "truck-space",
      title: "Create one clean receiving path",
      action: "Clear the walkway, stage the correct carts or dollies, and remove anything that will force product to be moved twice.",
      why: "Truck day looks controlled when freight has somewhere sensible to go."
    },
    {
      id: "truck-priority",
      title: "Stage the first priority freight before it becomes a pile",
      action: "Identify the cold, high-selling, or space-sensitive product that needs to move first and prepare its destination.",
      why: "Sequence is what separates freight work from cardboard weather."
    },
    {
      id: "truck-mystery-cart",
      title: "Eliminate one mystery cart",
      action: "Give one cart, dolly, or back-stock group a clear purpose and finish or label it before the shift ends.",
      why: "Tomorrow's manager should not have to perform archaeology in the back room."
    }
  ],
  "busy-rush": [
    {
      id: "rush-recovery",
      title: "Prepare the five-minute recovery move",
      action: "Choose the fastest reset that will matter after the rush, then stage what is needed so it can start immediately when coverage opens.",
      why: "Recovery begins before the line disappears."
    },
    {
      id: "rush-hidden-stock",
      title: "Protect the supplies customers will empty next",
      action: "Check cups, lids, coffee, fountain, warmer packaging, and restroom supplies before the rush exposes the shortage.",
      why: "Busy stores often fail quietly before they fail visibly."
    },
    {
      id: "rush-zone",
      title: "Win back one customer-facing zone",
      action: "Use a controlled five-minute reset on the area causing the most visible disorder or customer friction.",
      why: "One recovered zone can change how the whole store feels."
    }
  ],
  "manager-coverage": [
    {
      id: "coverage-delegate",
      title: "Delegate one complete outcome",
      action: "Give one person a specific result, deadline, and check-back point instead of a loose request to 'work on' something.",
      why: "Clear ownership frees the manager without losing the standard."
    },
    {
      id: "coverage-window",
      title: "Protect the next manager-only window",
      action: "Identify the next time coverage opens and reserve it for the one task only you can finish.",
      why: "Small floor tasks will consume every unclaimed management minute."
    },
    {
      id: "coverage-owner",
      title: "Give one neglected task a real owner",
      action: "Choose the task everyone assumes someone else is handling, assign it clearly, and verify the result.",
      why: "Unowned work becomes tomorrow's explanation."
    }
  ],
  "leadership-visit": [
    {
      id: "visit-root-cause",
      title: "Fix one visible miss and the reason behind it",
      action: "Correct the condition a walkthrough would notice, then remove the routine, supply, ownership, or follow-up problem that caused it.",
      why: "A staged fix lasts five minutes. A corrected system survives the next visit."
    },
    {
      id: "visit-proof",
      title: "Pair one standard with clean proof",
      action: "Finish one high-visibility standard and make sure the supporting count, note, label, or photo is just as clear.",
      why: "Presentation matters, but experienced leaders also look for the record behind it."
    },
    {
      id: "visit-second-layer",
      title: "Look one layer deeper than the obvious issue",
      action: "After fixing the first visible miss, check the nearby condition most likely to explain or repeat it.",
      why: "The second problem often reveals more judgment than the first."
    }
  ],
  "incident-recovery": [
    {
      id: "recovery-timeline",
      title: "Close the incident timeline while it is still accurate",
      action: "Confirm start time, notifications, operational impact, actions taken, delayed work, and the current status.",
      why: "Good recovery includes a record that does not rely on tomorrow's memory."
    },
    {
      id: "recovery-verify",
      title: "Verify the fix under normal use",
      action: "Test the restored system, equipment, or process through a real operating step before declaring it resolved.",
      why: "A restart is not the same thing as a recovery."
    },
    {
      id: "recovery-routine",
      title: "Restore one critical routine completely",
      action: "Choose the first normal process the incident disrupted, finish it end to end, and document anything that still has to move.",
      why: "Controlled recovery rebuilds the critical path instead of restarting everything at once."
    }
  ],
  "kitchen-prep": [
    {
      id: "prep-selling-window",
      title: "Protect the next selling window",
      action: "Prioritize the sandwiches, wraps, salads, dough balls, or other prep that will affect the next customer demand first.",
      why: "Production order matters more than making the prep table look busy."
    },
    {
      id: "prep-batch",
      title: "Remove one repeated setup",
      action: "Batch one group of similar prep while the ingredients, tools, labels, and workspace are already ready.",
      why: "Repeated setup is where a five-hour prep shift quietly disappears."
    },
    {
      id: "prep-count",
      title: "Leave the next prep decision obvious",
      action: "Finish one count, label, staging area, or shortage note so the next person knows exactly what exists and what is needed.",
      why: "Clear information prevents both overproduction and empty selling space."
    }
  ],
  away: [
    {
      id: "away-return-summary",
      title: "Remove one question from Loretta's return",
      action: "Close one issue fully or record a concise status, owner, and next step so she does not have to reconstruct it later.",
      why: "The best return summary contains fewer mysteries, not more paragraphs."
    },
    {
      id: "away-separate",
      title: "Separate what needs Loretta from what can be finished now",
      action: "Take one open item and clearly place it in the correct lane: do now, needs Loretta, or wait.",
      why: "Good coverage protects her decisions without using her absence as a reason to stop everything."
    },
    {
      id: "away-open-loop",
      title: "Close one open loop before Loretta comes back",
      action: "Choose one vendor, repair, staffing, inventory, or employee follow-up that can be completed without her approval and finish it.",
      why: "Returning to fewer loose ends is more impressive than returning to a longer explanation."
    }
  ]
};

let lorettaWinObserver = null;
let lorettaWinQueued = false;

function lorettaWinRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function lorettaWinWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function lorettaWinEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function lorettaWinDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function lorettaWinShift() {
  const value = lorettaWinRead(LORETTA_WIN_KEYS.shift, "morning");
  return ["morning", "mid", "close"].includes(value) ? value : "morning";
}

function lorettaWinShiftKey() {
  return `${lorettaWinDateKey()}:${lorettaWinShift()}`;
}

function lorettaWinContext() {
  const store = lorettaWinRead(LORETTA_WIN_KEYS.context, {});
  return {
    mode: "normal",
    role: "manager",
    staffing: "normal",
    ...(store?.[lorettaWinShiftKey()] || {})
  };
}

function lorettaAwayActive() {
  const store = lorettaWinRead(LORETTA_WIN_KEYS.away, { periods: [] });
  const periods = Array.isArray(store?.periods) ? store.periods : [];
  const today = lorettaWinDateKey();
  return periods.some((period) => period?.status === "active" && period.startDate <= today && period.endDate >= today);
}

function lorettaWinCategory() {
  const context = lorettaWinContext();
  if (lorettaAwayActive()) return "away";
  if (context.staffing === "short") return "short";
  if (LORETTA_WIN_POOLS[context.mode]) return context.mode;
  if (context.role === "kitchen") return "kitchen-prep";
  return "normal";
}

function lorettaWinHash(value) {
  let hash = 0;
  for (const character of String(value || "")) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

function lorettaWinSuggestion(category, offset = 0) {
  const pool = LORETTA_WIN_POOLS[category] || LORETTA_WIN_POOLS.normal;
  const index = (lorettaWinHash(`${lorettaWinShiftKey()}:${category}`) + Math.max(0, Number(offset || 0))) % pool.length;
  return { ...pool[index], category };
}

function lorettaWinStore() {
  const value = lorettaWinRead(LORETTA_WIN_KEYS.wins, {});
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function currentLorettaWin() {
  const key = lorettaWinShiftKey();
  const category = lorettaWinCategory();
  const store = lorettaWinStore();
  let record = store[key];
  const known = Object.values(LORETTA_WIN_POOLS).flat().some((item) => item.id === record?.suggestionId);

  if (!record || !known || (record.status !== "done" && record.category !== category)) {
    const suggestion = lorettaWinSuggestion(category, 0);
    record = {
      shiftKey: key,
      date: lorettaWinDateKey(),
      shift: lorettaWinShift(),
      category,
      suggestionId: suggestion.id,
      swapCount: 0,
      status: "open",
      selectedAt: new Date().toISOString(),
      completedAt: ""
    };
    store[key] = record;
    lorettaWinWrite(LORETTA_WIN_KEYS.wins, store);
  }

  const suggestion = Object.values(LORETTA_WIN_POOLS).flat().find((item) => item.id === record.suggestionId)
    || lorettaWinSuggestion(record.category || category, record.swapCount || 0);
  return { ...record, suggestion };
}

function lorettaWinTime(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "this shift";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function lorettaWinCategoryLabel(category) {
  return ({
    normal: "Extra-mile judgment",
    short: "Short-staffed win",
    "truck-day": "Truck-day win",
    "busy-rush": "Rush win",
    "manager-coverage": "Coverage win",
    "leadership-visit": "Walkthrough win",
    "incident-recovery": "Recovery win",
    "kitchen-prep": "Prep win",
    away: "Loretta-away win"
  })[category] || "Leadership win";
}

function lorettaWinCardHTML(record, compact = false) {
  const done = record.status === "done";
  const suggestion = record.suggestion;
  return `
    <section class="loretta-win-card${done ? " done" : ""}${compact ? " compact" : ""}" data-loretta-win-card data-loretta-win-key="${lorettaWinEscape(record.shiftKey)}">
      <div class="loretta-win-head">
        <div><p>OPTIONAL LEADERSHIP WIN</p><h3>Make Loretta's day easier</h3></div>
        <span>${done ? "Completed" : lorettaWinEscape(lorettaWinCategoryLabel(record.category))}</span>
      </div>
      <div class="loretta-win-task">
        <strong>${lorettaWinEscape(suggestion.title)}</strong>
        <p>${lorettaWinEscape(suggestion.action)}</p>
        ${compact ? "" : `<small><b>Why it helps:</b> ${lorettaWinEscape(suggestion.why)}</small>`}
      </div>
      ${done ? `
        <div class="loretta-win-complete"><span>✓</span><div><b>Leadership win recorded</b><small>Completed at ${lorettaWinEscape(lorettaWinTime(record.completedAt))}. This does not change required shift progress.</small></div></div>
        <div class="loretta-win-actions"><button type="button" data-loretta-win-undo>Undo</button></div>` : `
        <div class="loretta-win-actions">
          <button type="button" class="loretta-win-done" data-loretta-win-done>Mark done</button>
          <button type="button" data-loretta-win-swap>Swap idea</button>
        </div>`}
    </section>`;
}

function tasksScreenActive() {
  return document.querySelector('[data-screen="tasks"]')?.classList.contains("active") === true
    || document.querySelector("#screen-title")?.textContent?.trim() === "Tasks";
}

function renderLorettaWinInTasks() {
  if (!tasksScreenActive()) return;
  const content = document.querySelector("#screen-content");
  if (!content) return;
  const record = currentLorettaWin();
  const html = lorettaWinCardHTML(record, false).trim();
  const existing = content.querySelector("[data-loretta-win-card]");
  if (!existing) {
    const holder = document.createElement("div");
    holder.innerHTML = html;
    content.prepend(holder.firstElementChild);
  } else if (existing.outerHTML !== html) {
    existing.outerHTML = html;
  }
}

function renderLorettaWinInBriefing() {
  const record = currentLorettaWin();
  const html = lorettaWinCardHTML(record, true).trim();
  const shell = document.querySelector(".briefing-native-shell");
  if (shell) {
    const existing = shell.querySelector("[data-loretta-win-card]");
    if (!existing) {
      const holder = document.createElement("div");
      holder.innerHTML = html;
      const wisdom = shell.querySelector("[data-manager-wisdom]");
      const context = shell.querySelector(".briefing-native-context");
      shell.insertBefore(holder.firstElementChild, wisdom?.nextSibling || context || shell.querySelector(".briefing-native-actions") || null);
    } else if (existing.outerHTML !== html) {
      existing.outerHTML = html;
    }
    return;
  }

  const raw = document.querySelector(".shift-briefing-card");
  if (!raw || !document.querySelector(".shift-briefing-sheet.open")) return;
  const existing = raw.querySelector("[data-loretta-win-card]");
  if (!existing) {
    const holder = document.createElement("div");
    holder.innerHTML = html;
    raw.insertBefore(holder.firstElementChild, raw.querySelector(".shift-briefing-context-line") || raw.querySelector(".shift-briefing-actions") || null);
  } else if (existing.outerHTML !== html) {
    existing.outerHTML = html;
  }
}

function setLorettaWinStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  clearTimeout(setLorettaWinStatus.timer);
  setLorettaWinStatus.timer = setTimeout(() => { status.textContent = "Ready"; }, 2400);
}

function updateLorettaWin(updater, statusText) {
  const key = lorettaWinShiftKey();
  const store = lorettaWinStore();
  const current = currentLorettaWin();
  const next = updater({ ...current });
  store[key] = {
    shiftKey: next.shiftKey,
    date: next.date,
    shift: next.shift,
    category: next.category,
    suggestionId: next.suggestionId,
    swapCount: next.swapCount,
    status: next.status,
    selectedAt: next.selectedAt,
    completedAt: next.completedAt
  };
  lorettaWinWrite(LORETTA_WIN_KEYS.wins, store);
  window.dispatchEvent(new CustomEvent("storepilot:leadership-win-changed", { detail: { shiftKey: key, record: store[key] } }));
  setLorettaWinStatus(statusText);
  navigator.vibrate?.(next.status === "done" ? 30 : 15);
  queueLorettaWinRender();
}

function markLorettaWinDone() {
  updateLorettaWin((record) => ({ ...record, status: "done", completedAt: new Date().toISOString() }), "Loretta Win completed");
}

function undoLorettaWin() {
  updateLorettaWin((record) => ({ ...record, status: "open", completedAt: "" }), "Loretta Win reopened");
}

function swapLorettaWin() {
  updateLorettaWin((record) => {
    const category = lorettaWinCategory();
    const swapCount = Number(record.swapCount || 0) + 1;
    const suggestion = lorettaWinSuggestion(category, swapCount);
    return {
      ...record,
      category,
      suggestionId: suggestion.id,
      swapCount,
      status: "open",
      selectedAt: new Date().toISOString(),
      completedAt: ""
    };
  }, "New Loretta Win selected");
}

function handleLorettaWinClick(event) {
  if (event.target.closest("[data-loretta-win-done]")) {
    event.preventDefault();
    markLorettaWinDone();
  }
  if (event.target.closest("[data-loretta-win-swap]")) {
    event.preventDefault();
    swapLorettaWin();
  }
  if (event.target.closest("[data-loretta-win-undo]")) {
    event.preventDefault();
    undoLorettaWin();
  }
  if (event.target.closest('[data-screen="tasks"], .shift-button, [data-open-shift-briefing], [data-briefing-tasks]')) {
    setTimeout(queueLorettaWinRender, 50);
    setTimeout(queueLorettaWinRender, 220);
  }
}

function resetBriefingOnce() {
  const key = lorettaWinShiftKey();
  if (localStorage.getItem(LORETTA_WIN_KEYS.releaseSeen) === key) return;
  const seen = lorettaWinRead(LORETTA_WIN_KEYS.briefingSeen, {});
  if (seen && typeof seen === "object" && !Array.isArray(seen)) {
    delete seen[key];
    lorettaWinWrite(LORETTA_WIN_KEYS.briefingSeen, seen);
  }
  localStorage.setItem(LORETTA_WIN_KEYS.releaseSeen, key);
}

function renderLorettaWin() {
  renderLorettaWinInTasks();
  renderLorettaWinInBriefing();
}

function queueLorettaWinRender() {
  if (lorettaWinQueued) return;
  lorettaWinQueued = true;
  requestAnimationFrame(() => {
    lorettaWinQueued = false;
    renderLorettaWin();
  });
}

function startLorettaWin() {
  resetBriefingOnce();
  currentLorettaWin();
  document.addEventListener("click", handleLorettaWinClick, true);
  window.addEventListener("storage", (event) => {
    if (!event.key || Object.values(LORETTA_WIN_KEYS).includes(event.key)) queueLorettaWinRender();
  });
  window.addEventListener("focus", queueLorettaWinRender);
  window.addEventListener("storepilot:leadership-win-changed", queueLorettaWinRender);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) queueLorettaWinRender(); });

  lorettaWinObserver = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.type === "childList")) queueLorettaWinRender();
  });
  lorettaWinObserver.observe(document.body, { childList: true, subtree: true });
  queueLorettaWinRender();
}

window.StorePilotLorettaWin = {
  version: LORETTA_WIN_RELEASE,
  current: currentLorettaWin,
  complete: markLorettaWinDone,
  undo: undoLorettaWin,
  swap: swapLorettaWin
};

document.documentElement.dataset.lorettaWin = LORETTA_WIN_RELEASE;
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startLorettaWin, { once: true });
else startLorettaWin();
