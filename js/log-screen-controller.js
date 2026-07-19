import { buildLogState, logRiskStatus, logStatusSummary } from "./log-state-model.js?v=command-center-28";

const LOG_RELEASE = "command-center-28";
const LOG_KEYS = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  states: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7",
  preferences: "storePilot.handoffPrefs.v10",
  variant: "storePilot.handoffVariant.v4",
  endpoint: "storePilot.aiEndpoint.v1"
};
const SHIFT_LABELS = { morning: "Morning", mid: "Mid", close: "Close" };
const RECIPIENTS = { loretta: "Loretta", richard: "Richard", both: "Loretta and Richard" };
const TONE_LABELS = { quick: "Quick text", detailed: "Detailed handoff", issue: "Issue-first", positive: "Warm daily" };
const TONE_VARIANTS = { quick: 4, detailed: 4, issue: 4, positive: 4 };

let renderQueued = false;
let rendering = false;
let contentObserver = null;
const messageDrafts = new Map();

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentShift() {
  const shift = readJSON(LOG_KEYS.shift, "morning");
  return SHIFT_LABELS[shift] ? shift : "morning";
}

function getLogState() {
  return buildLogState({
    shift: currentShift(),
    dateKey: dateKey(),
    templates: readJSON(LOG_KEYS.templates, {}),
    customTasks: readJSON(LOG_KEYS.customTasks, {}),
    completed: readJSON(LOG_KEYS.completed, {}),
    taskStates: readJSON(LOG_KEYS.states, {})
  });
}

function getPreferences() {
  const prefs = readJSON(LOG_KEYS.preferences, { recipient: "loretta", tone: "positive" });
  return {
    recipient: RECIPIENTS[prefs?.recipient] ? prefs.recipient : "loretta",
    tone: TONE_LABELS[prefs?.tone] ? prefs.tone : "positive"
  };
}

function variantIndex(tone) {
  const count = TONE_VARIANTS[tone] || 1;
  return Math.abs(Number(readJSON(LOG_KEYS.variant, 0)) || 0) % count;
}

function taskNames(items, limit = 4, empty = "none") {
  const visible = items.slice(0, limit).map((task) => task.title);
  const hidden = items.length - visible.length;
  if (!visible.length) return empty;
  return hidden > 0 ? `${visible.join(", ")}, plus ${hidden} more` : visible.join(", ");
}

function taskLines(items, states, empty) {
  if (!items.length) return `- ${empty}`;
  return items.map((task) => {
    const reason = states[task.id]?.reason;
    return `- ${task.title}${reason ? `: ${reason}` : ""}`;
  }).join("\n");
}

function followupItems(state) {
  return [
    ...state.delayed.map((task) => ({ task, label: "Delayed", reason: state.states[task.id]?.reason || "Reason noted" })),
    ...state.carried.map((task) => ({ task, label: "Carry forward", reason: state.states[task.id]?.reason || "Next best window" })),
    ...state.open.map((task) => ({ task, label: "Still watching", reason: "Not completed yet" }))
  ];
}

function followupLines(state, empty = "No follow-up items from the planned list.") {
  const items = followupItems(state);
  if (!items.length) return `- ${empty}`;
  return items.map((item) => `- ${item.task.title}: ${item.label}, ${item.reason}`).join("\n");
}

function greetingName(prefs) {
  return RECIPIENTS[prefs.recipient] || "Loretta";
}

function dayPart() {
  const hour = new Date().getHours();
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

function buildQuickMessage(state, prefs, variant) {
  const name = greetingName(prefs);
  const shift = SHIFT_LABELS[state.shift];
  const followups = followupItems(state);
  const variants = [
    `${name}, quick ${shift.toLowerCase()} update from Jamison.\n\nDone: ${state.counts.done}/${state.counts.total}. Documented for another window: ${state.counts.documented}. Still open: ${state.counts.open}.\n\nCompleted: ${taskNames(state.done, 4, "nothing checked off yet")}\nFollow-up: ${taskNames(followups.map((item) => item.task), 4, "nothing major right now")}\n\nNo reply needed unless you want something handled differently.`,
    `Good ${dayPart()} ${name}, quick handoff from Jamison.\n\n${logStatusSummary(state)}.\n\nMost important completed work:\n${taskLines(state.done, state.states, "No completed items were checked off yet.")}\n\nItems not to lose:\n${followupLines(state)}\n\nI kept unfinished work separated by actual status so the next window is clear.`,
    `Quick shift note for ${name}:\n\nHandled: ${taskNames(state.done, 5, "the shift was reviewed and follow-ups were separated")}\n\nDelayed or carried: ${taskNames([...state.delayed, ...state.carried], 5, "none")}\nStill watching: ${taskNames(state.open, 5, "none")}\n\nI focused on the highest-impact work first.`,
    `${name}, short version from Jamison:\n\nShift: ${shift}\nDone: ${state.counts.done}\nDocumented: ${state.counts.documented}\nStill open: ${state.counts.open}\n\nCompleted now: ${taskNames(state.done, 4, "nothing checked off yet")}\nNext window: ${taskNames(followups.map((item) => item.task), 4, "nothing major")}`
  ];
  return variants[variant] || variants[0];
}

function buildDetailedMessage(state, prefs, variant) {
  const name = greetingName(prefs);
  const shift = SHIFT_LABELS[state.shift];
  const variants = [
    `Detailed ${shift.toLowerCase()} handoff for ${name}\nFrom: Jamison\n\nStatus snapshot\n- Planned: ${state.counts.total}\n- Done: ${state.counts.done}\n- Delayed: ${state.counts.delayed}\n- Carried forward: ${state.counts.carried}\n- Still open: ${state.counts.open}\n\nCompleted\n${taskLines(state.done, state.states, "No tasks were checked complete yet.")}\n\nFollow-up\n${followupLines(state)}\n\nAnything delayed or carried has a documented status. Anything still open is listed separately rather than counted as documented.`,
    `Good ${dayPart()} ${name}, here is the full ${shift.toLowerCase()} shift picture from Jamison.\n\nThe shift landed at ${state.counts.done}/${state.counts.total} planned items completed.\n\nWork completed:\n${taskLines(state.done, state.states, "No completed items were checked off yet.")}\n\nDelayed and carried with reasons:\n${taskLines([...state.delayed, ...state.carried], state.states, "Nothing delayed or carried.")}\n\nStill watching:\n${taskLines(state.open, state.states, "No active tasks remain.")}\n\nI kept the categories separate so the handoff reflects what actually happened.`,
    `End-of-shift detail for ${name}\nShift: ${shift}\n\n1. Completed work\n${taskLines(state.done, state.states, "Nothing checked complete yet.")}\n\n2. Work documented for another window\n${taskLines([...state.delayed, ...state.carried], state.states, "Nothing delayed or carried.")}\n\n3. Work still open\n${taskLines(state.open, state.states, "No open tasks remain.")}\n\n4. Summary\n${logStatusSummary(state)}.`,
    `${name}, detailed daily handoff from Jamison.\n\nMain progress:\n${taskLines(state.done, state.states, "The shift was reviewed, but nothing was checked complete yet.")}\n\nNot finished, but documented:\n${taskLines([...state.delayed, ...state.carried], state.states, "No tasks were delayed or carried.")}\n\nStill active / not yet documented:\n${taskLines(state.open, state.states, "No active tasks remain.")}\n\nThe goal here is a clean record, not a prettier number.`
  ];
  return variants[variant] || variants[0];
}

function buildIssueMessage(state, prefs, variant) {
  const name = greetingName(prefs);
  const shift = SHIFT_LABELS[state.shift];
  const status = logRiskStatus(state).toUpperCase();
  const variants = [
    `Issue-first ${shift.toLowerCase()} update for ${name}\nFrom: Jamison\n\nStore read: ${status}\n\nNeeds attention first:\n${followupLines(state)}\n\nCompleted for context:\n${taskLines(state.done, state.states, "No tasks were checked complete yet.")}\n\nDelayed or carried work is documented. Open work remains listed as still watching.`,
    `Good ${dayPart()} ${name}, this is the issue-first handoff from Jamison.\n\nPossible impact after this shift:\n${followupLines(state)}\n\nProgress made despite that:\n${taskLines(state.done, state.states, "No completed items were checked off yet.")}\n\nCurrent count: ${logStatusSummary(state)}.`,
    `Heads-up update for ${name}\n\nDelayed / carried:\n${taskLines([...state.delayed, ...state.carried], state.states, "Nothing delayed or carried.")}\n\nStill open:\n${taskLines(state.open, state.states, "Nothing still open.")}\n\nCompleted:\n${taskLines(state.done, state.states, "Nothing checked complete yet.")}\n\nI separated documented work from untouched open work so the risk is not understated.`,
    `${name}, the main follow-up picture from the ${shift.toLowerCase()} shift is:\n\n${followupLines(state)}\n\nCompleted work for context:\n${taskLines(state.done, state.states, "No completed items were checked off yet.")}\n\nStore read: ${status}. ${logStatusSummary(state)}.`
  ];
  return variants[variant] || variants[0];
}

function buildPositiveMessage(state, prefs, variant) {
  const name = greetingName(prefs);
  const shift = SHIFT_LABELS[state.shift];
  const variants = [
    `Good ${dayPart()} ${name}, here is my ${shift.toLowerCase()} shift handoff.\n\nWhat moved forward:\n${taskLines(state.done, state.states, "The shift was reviewed and follow-ups were separated.")}\n\nWhat still needs a window:\n${followupLines(state)}\n\nOverall: ${logStatusSummary(state)}. I kept the focus on the highest-impact items and did not count open work as documented.`,
    `${name}, here is where I landed today.\n\nBest progress: ${taskNames(state.done, 5, "the shift was reviewed and the status was made clear")}\n\nDocumented for later: ${taskNames([...state.delayed, ...state.carried], 5, "nothing")}\nStill on the radar: ${taskNames(state.open, 5, "nothing")}\n\nI wanted this to be useful and honest instead of just making the shift sound cleaner on paper.`,
    `Daily handoff for ${name}\nShift: ${shift}\nFrom: Jamison\n\nHandled well:\n${taskLines(state.done, state.states, "No items were checked complete yet.")}\n\nNot forgotten:\n${followupLines(state)}\n\nThe shift moved forward, and every unfinished item is shown in its actual category.`,
    `${name}, sincere wrap-up from Jamison.\n\nToday I focused on moving the most important work first.\n\nCompleted:\n${taskLines(state.done, state.states, "Nothing checked complete yet.")}\n\nDelayed / carried:\n${taskLines([...state.delayed, ...state.carried], state.states, "Nothing delayed or carried.")}\n\nStill watching:\n${taskLines(state.open, state.states, "Nothing still open.")}\n\n${logStatusSummary(state)}.`
  ];
  return variants[variant] || variants[0];
}

function buildMessage(state, prefs = getPreferences()) {
  const variant = variantIndex(prefs.tone);
  if (prefs.tone === "quick") return buildQuickMessage(state, prefs, variant);
  if (prefs.tone === "detailed") return buildDetailedMessage(state, prefs, variant);
  if (prefs.tone === "issue") return buildIssueMessage(state, prefs, variant);
  return buildPositiveMessage(state, prefs, variant);
}

function nextTask(state) {
  return [...state.open, ...state.delayed, ...state.carried]
    .sort((a, b) => Number(a.priority || 99) - Number(b.priority || 99))[0] || null;
}

function smartReason(state, task) {
  if (!task) return "The planned list is clear. Review the handoff and complete a final walk.";
  const taskState = state.states[task.id];
  if (taskState?.reason) return `${task.title} is the next item because it is marked ${taskState.type} with this reason: ${taskState.reason}.`;
  return `${task.title} is the highest-priority item still open for this selected shift.`;
}

function buildSmartMessage(state, prefs) {
  const name = greetingName(prefs);
  const task = nextTask(state);
  const status = logRiskStatus(state);
  return `${name}, here is the smart ${SHIFT_LABELS[state.shift].toLowerCase()} handoff from Jamison.\n\nStore status: ${status.charAt(0).toUpperCase() + status.slice(1)}\n\nWhat moved forward:\n${taskLines(state.done, state.states, "No completed items were checked off yet.")}\n\nDocumented for another window:\n${taskLines([...state.delayed, ...state.carried], state.states, "Nothing delayed or carried.")}\n\nStill watching:\n${taskLines(state.open, state.states, "No open tasks remain.")}\n\nRecommended next move: ${task?.title || "Final walk and handoff review"}\nWhy: ${smartReason(state, task)}\n\nI kept open work separate from documented work so the status stays accurate.`;
}

function option(value, label, selected) {
  return `<option value="${value}" ${selected === value ? "selected" : ""}>${escapeHTML(label)}</option>`;
}

function statusLabel(value) {
  return value === "red" ? "Red priority" : value === "yellow" ? "Watch" : "Normal";
}

function statusClass(value) {
  return value === "red" ? "is-red" : value === "yellow" ? "is-yellow" : "is-green";
}

function taskListHTML(items, states, empty) {
  if (!items.length) return `<p class="log-empty-line">${escapeHTML(empty)}</p>`;
  return `<ul>${items.map((task) => {
    const reason = states[task.id]?.reason;
    return `<li><strong>${escapeHTML(task.title)}</strong>${reason ? `<span>${escapeHTML(reason)}</span>` : ""}</li>`;
  }).join("")}</ul>`;
}

function detailHTML(title, count, items, states, empty, open = false) {
  if (!count && title !== "Completed") return "";
  return `<details class="log-detail" ${open ? "open" : ""}><summary><span>${escapeHTML(title)}</span><b>${count}</b></summary><div>${taskListHTML(items, states, empty)}</div></details>`;
}

function injectStyles() {
  if (document.querySelector("#store-pilot-log-owner-style")) return;
  const style = document.createElement("style");
  style.id = "store-pilot-log-owner-style";
  style.textContent = `
    .log-owner-screen{display:grid;gap:12px;padding-bottom:calc(118px + env(safe-area-inset-bottom,0px))}
    .log-summary-card,.log-handoff-card,.log-detail-group{border:1px solid rgba(11,74,56,.14);border-radius:14px;background:#fff;padding:13px;box-shadow:0 8px 24px rgba(23,33,29,.05)}
    .log-summary-head,.log-handoff-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.log-summary-head p,.log-handoff-head p{margin:0;color:#a9632d;font-size:.58rem;font-weight:950;letter-spacing:.11em}.log-summary-head h3,.log-handoff-head h3{margin:2px 0 0;color:#17211d;font-size:1rem}.log-risk-pill{border-radius:999px;padding:6px 9px;font-size:.66rem;font-weight:900}.log-risk-pill.is-green{background:#e6f4ed;color:#0b4a38}.log-risk-pill.is-yellow{background:#fff2d4;color:#714508}.log-risk-pill.is-red{background:#fde7e4;color:#8b261d}
    .log-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:11px}.log-metric{display:grid;gap:2px;padding:9px 5px;border-radius:10px;background:#f6f8f7;text-align:center}.log-metric strong{font-size:1.05rem;color:#17211d}.log-metric span{font-size:.62rem;color:#68756f;font-weight:800}.log-truth-line{margin:10px 0 0;color:#435049;font-size:.72rem;line-height:1.4}
    .log-options{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:11px}.log-options label{display:grid;gap:4px;color:#53615a;font-size:.65rem;font-weight:850}.log-options select{min-height:42px;border:1px solid rgba(11,74,56,.2);border-radius:10px;background:#fff;color:#17211d;font-size:.82rem;padding:0 10px}
    .log-smart-read{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:9px;margin-top:10px;padding:10px;border-radius:11px;background:#f4f8f6}.log-smart-read b{font-size:.74rem}.log-smart-read span{font-size:.68rem;color:#68756f;line-height:1.3}.log-smart-read button{min-height:38px;border-radius:9px;border:1px solid rgba(11,74,56,.2);background:#fff;color:#0b4a38;font-size:.68rem;font-weight:900;padding:0 10px}
    .log-message-label{display:grid;gap:6px;margin-top:11px;color:#53615a;font-size:.68rem;font-weight:900}.log-message-label textarea{min-height:220px;max-height:45vh;resize:vertical;border:1px solid rgba(11,74,56,.2);border-radius:11px;background:#fffefa;color:#17211d;font-size:.92rem;line-height:1.45;padding:11px}.log-message-label textarea:focus{outline:3px solid rgba(169,99,45,.14);border-color:rgba(169,99,45,.48)}
    .log-message-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.log-message-actions button{min-height:44px;border-radius:10px;font-size:.75rem;font-weight:900}.log-message-actions .log-share{border:0;background:#0b4a38;color:#fff}.log-message-actions .log-copy{border:1px solid rgba(11,74,56,.23);background:#fff;color:#0b4a38}.log-message-actions .log-version{grid-column:1/-1;border:1px solid rgba(169,99,45,.36);background:#fff4df;color:#5a3515}
    .log-detail-group{display:grid;gap:7px}.log-detail{border:1px solid rgba(11,74,56,.11);border-radius:10px;background:#fbfcfb;overflow:hidden}.log-detail summary{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:43px;padding:0 11px;cursor:pointer;color:#23302a;font-size:.76rem;font-weight:900}.log-detail summary b{display:grid;place-items:center;min-width:25px;height:25px;border-radius:999px;background:#eaf1ee;color:#0b4a38}.log-detail>div{padding:0 11px 10px}.log-detail ul{display:grid;gap:7px;margin:0;padding:0;list-style:none}.log-detail li{display:grid;gap:2px;padding-top:7px;border-top:1px solid rgba(11,74,56,.09)}.log-detail li strong{font-size:.75rem;color:#24312b}.log-detail li span,.log-empty-line{margin:0;color:#68756f;font-size:.68rem;line-height:1.35}.log-clean-state{padding:11px;border-radius:10px;background:#eaf5ef;color:#0b4a38;font-size:.72rem;font-weight:850}
    @media(max-width:420px){.log-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.log-smart-read{grid-template-columns:1fr}.log-smart-read button{width:100%}}
  `;
  document.head.appendChild(style);
}

function logScreenActive() {
  return document.querySelector('[data-screen="log"]')?.classList.contains("active") === true;
}

function renderLogScreen({ force = false, regenerate = false } = {}) {
  if (rendering || !logScreenActive()) return false;
  const content = document.querySelector("#screen-content");
  if (!content) return false;
  const state = getLogState();
  const existing = content.querySelector("[data-log-owner]");
  if (existing && !force && existing.dataset.shiftKey === state.shiftKey) return true;

  const prefs = getPreferences();
  if (regenerate) messageDrafts.delete(state.shiftKey);
  const currentDraft = existing?.dataset.shiftKey === state.shiftKey ? existing.querySelector("#review-message")?.value : "";
  if (currentDraft && !regenerate) messageDrafts.set(state.shiftKey, currentDraft);
  const message = messageDrafts.get(state.shiftKey) || buildMessage(state, prefs);
  const risk = logRiskStatus(state);
  const next = nextTask(state);
  const eyebrow = document.querySelector("#screen-eyebrow");
  const title = document.querySelector("#screen-title");

  rendering = true;
  try {
    if (eyebrow) eyebrow.textContent = "REVIEW";
    if (title) title.textContent = "End-of-Day";
    content.innerHTML = `
      <article class="log-owner-screen" data-log-owner="${LOG_RELEASE}" data-shift-key="${escapeHTML(state.shiftKey)}">
        <section class="log-summary-card">
          <div class="log-summary-head"><div><p>SHIFT RECORD</p><h3>${escapeHTML(SHIFT_LABELS[state.shift])} handoff</h3></div><span class="log-risk-pill ${statusClass(risk)}">${escapeHTML(statusLabel(risk))}</span></div>
          <div class="log-metrics">
            <div class="log-metric"><strong>${state.counts.done}</strong><span>Done</span></div>
            <div class="log-metric"><strong>${state.counts.delayed}</strong><span>Delayed</span></div>
            <div class="log-metric"><strong>${state.counts.carried}</strong><span>Carried</span></div>
            <div class="log-metric"><strong>${state.counts.open}</strong><span>Open</span></div>
          </div>
          <p class="log-truth-line"><strong>${state.counts.documented} documented</strong> means delayed or carried with a status. ${state.counts.open} still-open item${state.counts.open === 1 ? " is" : "s are"} listed separately.</p>
        </section>

        <section class="log-handoff-card">
          <div class="log-handoff-head"><div><p>DAILY HANDOFF</p><h3>Review and send</h3></div><span>${variantIndex(prefs.tone) + 1} of ${TONE_VARIANTS[prefs.tone]}</span></div>
          <div class="log-options">
            <label>Send to<select id="handoff-recipient">${option("loretta", "Loretta", prefs.recipient)}${option("richard", "Richard", prefs.recipient)}${option("both", "Both", prefs.recipient)}</select></label>
            <label>Tone<select id="handoff-tone">${option("quick", "Quick text", prefs.tone)}${option("detailed", "Detailed handoff", prefs.tone)}${option("issue", "Issue-first", prefs.tone)}${option("positive", "Warm daily", prefs.tone)}</select></label>
          </div>
          <div class="log-smart-read"><b>Smart Shift Brain</b><span>${escapeHTML(next ? `Recommended next: ${next.title}` : "No active task remains. Review the handoff and final walk.")}</span><button type="button" data-log-smart>Build Smart Handoff</button></div>
          <label class="log-message-label">Editable message<textarea id="review-message">${escapeHTML(message)}</textarea></label>
          <div class="log-message-actions">
            <button type="button" class="log-share" data-log-share>Text / Share</button>
            <button type="button" class="log-copy" data-log-copy>Copy</button>
            <button type="button" class="log-version" data-log-version>New Message Version</button>
          </div>
        </section>

        <section class="log-detail-group" aria-label="Shift task status">
          ${detailHTML("Completed", state.counts.done, state.done, state.states, "No tasks were checked complete yet.")}
          ${detailHTML("Delayed", state.counts.delayed, state.delayed, state.states, "No delayed tasks.", true)}
          ${detailHTML("Carry Forward", state.counts.carried, state.carried, state.states, "No carried tasks.", true)}
          ${detailHTML("Still Watching", state.counts.open, state.open, state.states, "No active tasks remain.", true)}
          ${state.counts.followups === 0 ? `<div class="log-clean-state">No planned task needs another window right now.</div>` : ""}
        </section>
      </article>`;
    injectStyles();
    window.dispatchEvent(new CustomEvent("storepilot:log-rendered", { detail: { shiftKey: state.shiftKey, counts: state.counts } }));
    return true;
  } finally {
    rendering = false;
  }
}

function setStatus(text) {
  const node = document.querySelector("#system-status");
  if (!node) return;
  node.textContent = text;
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => { node.textContent = "Ready"; }, 1800);
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else throw new Error("Clipboard unavailable");
  } catch {
    const textarea = document.querySelector("#review-message");
    textarea?.select();
    document.execCommand("copy");
    textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
  }
  setStatus("Handoff copied");
}

async function shareText(text) {
  if (navigator.share) {
    try {
      await navigator.share({ title: "Shift update", text });
      setStatus("Share opened");
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }
  window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
}

async function applySmartHandoff() {
  const state = getLogState();
  const prefs = getPreferences();
  const localMessage = buildSmartMessage(state, prefs);
  const endpoint = String(readJSON(LOG_KEYS.endpoint, "") || "").trim();
  let message = localMessage;
  setStatus(endpoint ? "Building smart handoff" : "Local smart handoff ready");
  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs, state, currentMessage: document.querySelector("#review-message")?.value || "", instruction: "Write a concise, sincere manager handoff. Keep facts accurate. Do not count open tasks as documented." })
      });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const result = (response.headers.get("content-type") || "").includes("application/json") ? await response.json() : { message: await response.text() };
      message = result?.message || localMessage;
    } catch {
      setStatus("API unavailable; local handoff used");
    }
  }
  messageDrafts.set(state.shiftKey, message);
  const box = document.querySelector("#review-message");
  if (box) box.value = message;
}

function queueRender(force = false, regenerate = false) {
  if (renderQueued && !force) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderLogScreen({ force, regenerate });
  });
}

function handleClick(event) {
  if (event.target.closest?.('[data-screen="log"], .shift-button')) {
    setTimeout(() => queueRender(true), 35);
    return;
  }
  if (!event.target.closest?.("[data-log-owner]")) return;
  const box = document.querySelector("#review-message");
  if (event.target.closest("[data-log-copy]")) copyText(box?.value || "");
  if (event.target.closest("[data-log-share]")) shareText(box?.value || "");
  if (event.target.closest("[data-log-smart]")) applySmartHandoff();
  if (event.target.closest("[data-log-version]")) {
    writeJSON(LOG_KEYS.variant, Number(readJSON(LOG_KEYS.variant, 0) || 0) + 1);
    queueRender(true, true);
  }
}

function handleChange(event) {
  if (!event.target.matches?.("#handoff-recipient, #handoff-tone")) return;
  writeJSON(LOG_KEYS.preferences, {
    recipient: document.querySelector("#handoff-recipient")?.value || "loretta",
    tone: document.querySelector("#handoff-tone")?.value || "positive"
  });
  writeJSON(LOG_KEYS.variant, 0);
  queueRender(true, true);
}

function handleInput(event) {
  if (!event.target.matches?.("#review-message")) return;
  messageDrafts.set(getLogState().shiftKey, event.target.value);
}

function startLogOwner() {
  injectStyles();
  document.documentElement.dataset.logOwner = LOG_RELEASE;
  document.addEventListener("click", handleClick, true);
  document.addEventListener("change", handleChange);
  document.addEventListener("input", handleInput);
  const content = document.querySelector("#screen-content");
  if (content) {
    contentObserver = new MutationObserver(() => {
      if (!rendering && logScreenActive() && !content.querySelector("[data-log-owner]")) queueRender(true);
    });
    contentObserver.observe(content, { childList: true, subtree: false });
  }
  ["storepilot:tasks-changed", "storepilot:incident-saved", "storepilot:interruptions-changed", "storepilot:loretta-away-changed"].forEach((name) => {
    window.addEventListener(name, () => queueRender(true));
  });
  window.addEventListener("storage", (event) => {
    if (!event.key || Object.values(LOG_KEYS).includes(event.key)) queueRender(true);
  });
  queueRender(true);
}

window.StorePilotLogScreen = {
  version: LOG_RELEASE,
  state: getLogState,
  render: () => renderLogScreen({ force: true }),
  buildMessage: () => buildMessage(getLogState(), getPreferences())
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startLogOwner, { once: true });
else startLogOwner();
