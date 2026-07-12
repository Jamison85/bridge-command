const LORETTA_AWAY_KEY = "storePilot.lorettaAway.v1";
const LORETTA_NOTES_KEY = "storePilot.lorettaNotes.v1";
const LANE_LABELS = { do: "Do now", approval: "Needs Loretta", wait: "Wait" };
const STATUS_LABELS = { open: "Open", done: "Done", delayed: "Delayed" };

let awayObserver = null;
let awayRenderQueued = false;
let awayView = "board";
let awayTab = "do";
let delayEditorNoteId = "";
let summaryPeriodId = "";

function awayRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function awayWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function awayEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
}

function awayDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function awayDateFromKey(key) {
  const [year, month, day] = String(key || "").split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day, 12, 0, 0, 0) : null;
}

function awayAddDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  next.setHours(12, 0, 0, 0);
  return next;
}

function awayFormatDate(key, includeWeekday = true) {
  const date = awayDateFromKey(key);
  if (!date) return "No date";
  return new Intl.DateTimeFormat(undefined, includeWeekday
    ? { weekday: "short", month: "short", day: "numeric" }
    : { month: "short", day: "numeric" }).format(date);
}

function awayRangeLabel(period) {
  if (!period) return "";
  if (period.startDate === period.endDate) return awayFormatDate(period.startDate);
  return `${awayFormatDate(period.startDate)} – ${awayFormatDate(period.endDate)}`;
}

function awayStore() {
  const stored = awayRead(LORETTA_AWAY_KEY, { periods: [] });
  return { periods: Array.isArray(stored?.periods) ? stored.periods : [] };
}

function saveAwayStore(store) {
  store.periods = (store.periods || []).slice(0, 24);
  awayWrite(LORETTA_AWAY_KEY, store);
  window.dispatchEvent(new CustomEvent("storepilot:loretta-away-changed"));
}

function activeAwayPeriod(store = awayStore()) {
  return store.periods.find((period) => period.status === "active") || null;
}

function lastEndedPeriod(store = awayStore()) {
  return store.periods.find((period) => period.status === "ended") || null;
}

function allLorettaNotes() {
  return awayRead(LORETTA_NOTES_KEY, []);
}

function noteCreatedDate(note) {
  const created = new Date(note?.createdAt || 0);
  return Number.isNaN(created.getTime()) ? "" : awayDateKey(created);
}

function dateInsidePeriod(value, period) {
  return Boolean(value && value >= period.startDate && value <= period.endDate);
}

function noteBelongsToPeriod(note, period) {
  const scheduled = Array.isArray(note?.scheduledDates) ? note.scheduledDates : [];
  return scheduled.some((date) => dateInsidePeriod(date, period)) || dateInsidePeriod(noteCreatedDate(note), period);
}

function notesForPeriod(period) {
  if (!period) return [];
  return allLorettaNotes()
    .filter((note) => noteBelongsToPeriod(note, period))
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

function defaultLane(note) {
  const text = String(note?.text || "").toLowerCase();
  if (/\b(wait|hold|leave it|when (?:i|loretta) (?:get|gets) back|after (?:i|loretta) (?:return|returns|get back|gets back))\b/.test(text)) return "wait";
  if (/\b(ask loretta|check with loretta|confirm with loretta|needs loretta|loretta(?:'s)? approval|approval|permission|decide|decision)\b/.test(text)) return "approval";
  return "do";
}

function syncPeriodNotes(period, store) {
  if (!period) return false;
  period.noteStates ||= {};
  let changed = false;
  notesForPeriod(period).forEach((note) => {
    if (!period.noteStates[note.id]) {
      period.noteStates[note.id] = {
        lane: defaultLane(note),
        status: note.status === "archived" ? "done" : "open",
        reason: "",
        updatedAt: new Date().toISOString()
      };
      changed = true;
    } else if (note.status === "archived" && period.noteStates[note.id].status === "open") {
      period.noteStates[note.id] = {
        ...period.noteStates[note.id],
        status: "done",
        updatedAt: new Date().toISOString()
      };
      changed = true;
    }
  });
  if (changed && store) saveAwayStore(store);
  return changed;
}

function syncedActivePeriod() {
  const store = awayStore();
  const period = activeAwayPeriod(store);
  if (period) syncPeriodNotes(period, store);
  return activeAwayPeriod(awayStore());
}

function stateForNote(period, note) {
  return period?.noteStates?.[note.id] || {
    lane: defaultLane(note),
    status: note.status === "archived" ? "done" : "open",
    reason: ""
  };
}

function statsForPeriod(period) {
  const notes = notesForPeriod(period);
  const stats = { total: notes.length, open: 0, done: 0, delayed: 0, approval: 0, wait: 0, do: 0 };
  notes.forEach((note) => {
    const state = stateForNote(period, note);
    stats[state.status] = (stats[state.status] || 0) + 1;
    stats[state.lane] = (stats[state.lane] || 0) + 1;
  });
  return stats;
}

function periodIsPast(period) {
  return Boolean(period && awayDateKey() > period.endDate);
}

function setAppStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  clearTimeout(setAppStatus.timer);
  setAppStatus.timer = setTimeout(() => { status.textContent = "Ready"; }, 2200);
}

function panelHTML() {
  const store = awayStore();
  const active = activeAwayPeriod(store);
  const last = lastEndedPeriod(store);

  if (active) {
    syncPeriodNotes(active, store);
    const current = activeAwayPeriod(awayStore());
    const stats = statsForPeriod(current);
    const returnLabel = periodIsPast(current) ? "Return summary is ready" : `Away through ${awayFormatDate(current.endDate)}`;
    return `
      <section class="loretta-away-panel active" data-away-panel>
        <div class="loretta-away-panel-head">
          <div><p>LORETTA AWAY MODE</p><h3>${awayEscape(returnLabel)}</h3><span>${awayEscape(awayRangeLabel(current))}</span></div>
          <span class="loretta-away-live">Active</span>
        </div>
        <div class="loretta-away-metrics">
          <span><b>${stats.done}</b> done</span>
          <span><b>${stats.open}</b> open</span>
          <span><b>${stats.delayed}</b> delayed</span>
          <span><b>${stats.approval}</b> need her</span>
        </div>
        <div class="loretta-away-panel-actions">
          <button type="button" data-away-board>Open coverage board</button>
          <button type="button" data-away-summary>Return summary</button>
        </div>
      </section>`;
  }

  if (last) {
    const stats = statsForPeriod(last);
    return `
      <section class="loretta-away-panel recent" data-away-panel>
        <div class="loretta-away-panel-head">
          <div><p>LAST AWAY PERIOD</p><h3>${awayEscape(awayRangeLabel(last))}</h3><span>${stats.done} completed · ${stats.delayed} delayed · ${stats.open} unresolved</span></div>
        </div>
        <div class="loretta-away-panel-actions">
          <button type="button" data-away-last-summary="${awayEscape(last.id)}">View summary</button>
          <button type="button" data-away-setup>Start new period</button>
        </div>
      </section>`;
  }

  return `
    <section class="loretta-away-panel" data-away-panel>
      <div class="loretta-away-panel-head">
        <div><p>LORETTA AWAY MODE</p><h3>Organize coverage across several days</h3><span>Separate what you can finish from what needs her decision.</span></div>
      </div>
      <button class="loretta-away-setup-button" type="button" data-away-setup>Set away dates</button>
    </section>`;
}

function bindAwayPanel(panel) {
  if (panel.dataset.bound === "true") return;
  panel.dataset.bound = "true";
  panel.addEventListener("click", (event) => {
    if (event.target.closest("[data-away-setup]")) openAwaySheet("setup");
    if (event.target.closest("[data-away-board]")) openAwaySheet("board");
    if (event.target.closest("[data-away-summary]")) openAwaySheet("summary");
    const last = event.target.closest("[data-away-last-summary]");
    if (last) {
      summaryPeriodId = last.dataset.awayLastSummary || "";
      openAwaySheet("summary");
    }
  });
}

function ensureAwayPanel() {
  const screen = document.querySelector("#loretta-notes-screen");
  const actions = screen?.querySelector(".loretta-screen-actions");
  if (!screen || !actions) return;
  let panel = screen.querySelector("[data-away-panel]");
  if (!panel) {
    const holder = document.createElement("div");
    holder.className = "loretta-away-panel-holder";
    actions.insertAdjacentElement("afterend", holder);
    panel = holder;
  }
  const next = panelHTML();
  if (panel.dataset.signature !== next) {
    panel.dataset.signature = next;
    panel.innerHTML = next;
  }
  bindAwayPanel(panel);
}

function ensureAwaySheet() {
  let sheet = document.querySelector("#loretta-away-sheet");
  if (sheet) return sheet;
  sheet = document.createElement("section");
  sheet.id = "loretta-away-sheet";
  sheet.className = "loretta-away-sheet";
  sheet.setAttribute("aria-hidden", "true");
  sheet.innerHTML = `<div class="loretta-away-card screen-card" role="dialog" aria-modal="true" aria-labelledby="loretta-away-title"></div>`;
  sheet.addEventListener("click", handleAwaySheetClick);
  sheet.addEventListener("change", handleAwaySheetChange);
  sheet.addEventListener("submit", handleAwaySheetSubmit);
  document.body.appendChild(sheet);
  return sheet;
}

function setupViewHTML() {
  const active = activeAwayPeriod();
  const start = active?.startDate || awayDateKey();
  const end = active?.endDate || awayDateKey(awayAddDays(new Date(), 3));
  return `
    <header class="screen-header loretta-away-sheet-head">
      <div><p class="eyebrow">LORETTA AWAY MODE</p><h2 id="loretta-away-title">${active ? "Edit away dates" : "Set coverage period"}</h2></div>
      <button class="text-button" type="button" data-away-close>Close</button>
    </header>
    <form class="loretta-away-setup-form" data-away-setup-form>
      <p>Use the dates Loretta is unavailable. Notes created or scheduled inside this range will appear on the coverage board.</p>
      <div class="loretta-away-date-grid">
        <label>First day<input type="date" name="startDate" value="${awayEscape(start)}" required></label>
        <label>Return / last away day<input type="date" name="endDate" value="${awayEscape(end)}" required></label>
      </div>
      <button class="primary-action" type="submit">${active ? "Save dates" : "Start Away Mode"}</button>
    </form>`;
}

function noteCardHTML(period, note) {
  const state = stateForNote(period, note);
  const dates = (note.scheduledDates || []).map((date) => `<span>${awayEscape(awayFormatDate(date))}</span>`).join("");
  const editing = delayEditorNoteId === note.id;
  const statusActions = state.status === "done"
    ? `<button type="button" data-away-status="open">Reopen</button>`
    : state.status === "delayed"
      ? `<button type="button" data-away-status="done">Done</button><button type="button" data-away-status="open">Reopen</button><button type="button" data-away-delay-edit>Edit delay</button>`
      : `<button type="button" data-away-status="done">Done</button><button type="button" data-away-status="delayed">Delay</button>`;

  return `
    <article class="loretta-away-note" data-away-note="${awayEscape(note.id)}" data-status="${awayEscape(state.status)}">
      <div class="loretta-away-note-head">
        <strong>${awayEscape(note.text)}</strong>
        <span>${awayEscape(STATUS_LABELS[state.status] || "Open")}</span>
      </div>
      <div class="loretta-away-note-dates">${dates || "<span>No scheduled date</span>"}</div>
      ${state.reason ? `<p class="loretta-away-delay-reason"><b>Delay:</b> ${awayEscape(state.reason)}</p>` : ""}
      <div class="loretta-away-note-controls">
        <label>Lane
          <select data-away-lane>
            ${Object.entries(LANE_LABELS).map(([value, label]) => `<option value="${value}"${state.lane === value ? " selected" : ""}>${label}</option>`).join("")}
          </select>
        </label>
        <div class="loretta-away-status-actions">${statusActions}</div>
      </div>
      ${editing ? `
        <form class="loretta-away-delay-form" data-away-delay-form>
          <label>Why was this delayed?<input name="reason" value="${awayEscape(state.reason || "")}" placeholder="Short staffed, system issue, vendor delay..." required></label>
          <div><button type="submit">Save delay</button><button type="button" data-away-delay-cancel>Cancel</button></div>
        </form>` : ""}
    </article>`;
}

function boardViewHTML(period) {
  const notes = notesForPeriod(period);
  const stats = statsForPeriod(period);
  const laneNotes = notes.filter((note) => stateForNote(period, note).lane === awayTab);
  return `
    <header class="screen-header loretta-away-sheet-head">
      <div><p class="eyebrow">LORETTA AWAY</p><h2 id="loretta-away-title">Coverage board</h2></div>
      <button class="text-button" type="button" data-away-close>Close</button>
    </header>
    <section class="loretta-away-board-summary">
      <div><strong>${awayEscape(awayRangeLabel(period))}</strong><span>${stats.done} done · ${stats.delayed} delayed · ${stats.open} open</span></div>
      <button type="button" data-away-edit-dates>Edit dates</button>
    </section>
    <nav class="loretta-away-tabs" aria-label="Coverage lanes">
      ${Object.entries(LANE_LABELS).map(([value, label]) => {
        const count = notes.filter((note) => stateForNote(period, note).lane === value).length;
        return `<button type="button" data-away-tab="${value}" class="${awayTab === value ? "active" : ""}">${label}<span>${count}</span></button>`;
      }).join("")}
    </nav>
    <div class="loretta-away-note-list">
      ${laneNotes.length ? laneNotes.map((note) => noteCardHTML(period, note)).join("") : `
        <div class="loretta-away-empty"><strong>No items in ${awayEscape(LANE_LABELS[awayTab])}.</strong><span>Move a Loretta note here or capture a new instruction.</span><button type="button" data-away-add-note>Add Loretta note</button></div>`}
    </div>
    <div class="loretta-away-board-footer">
      <button class="secondary-action" type="button" data-away-add-note>Add Loretta note</button>
      <button class="primary-action" type="button" data-away-open-summary>Return summary</button>
    </div>`;
}

function summaryText(period) {
  const notes = notesForPeriod(period);
  const groups = { done: [], delayed: [], approval: [], wait: [], open: [] };
  notes.forEach((note) => {
    const state = stateForNote(period, note);
    const item = state.reason ? `${note.text} — ${state.reason}` : note.text;
    if (state.status === "done") groups.done.push(item);
    else if (state.status === "delayed") groups.delayed.push(item);
    else if (state.lane === "approval") groups.approval.push(item);
    else if (state.lane === "wait") groups.wait.push(item);
    else groups.open.push(item);
  });
  const lines = [
    `Loretta Away Summary · ${awayRangeLabel(period)}`,
    `Completed: ${groups.done.length} | Delayed: ${groups.delayed.length} | Needs Loretta: ${groups.approval.length} | Waiting: ${groups.wait.length} | Still open: ${groups.open.length}`
  ];
  const add = (title, items) => {
    if (!items.length) return;
    lines.push("", `${title}:`, ...items.map((item) => `- ${item}`));
  };
  add("Completed", groups.done);
  add("Delayed", groups.delayed);
  add("Needs Loretta", groups.approval);
  add("Waiting for Loretta", groups.wait);
  add("Still open", groups.open);
  return lines.join("\n");
}

function summaryViewHTML(period) {
  const text = period.summary || summaryText(period);
  const ended = period.status === "ended";
  return `
    <header class="screen-header loretta-away-sheet-head">
      <div><p class="eyebrow">RETURN SUMMARY</p><h2 id="loretta-away-title">${ended ? "Saved coverage summary" : "Loretta is back"}</h2></div>
      <button class="text-button" type="button" data-away-close>Close</button>
    </header>
    <section class="loretta-away-summary-card">
      <div class="loretta-away-summary-meta"><strong>${awayEscape(awayRangeLabel(period))}</strong><span>${ended ? "Mode ended" : "Review before ending mode"}</span></div>
      <pre>${awayEscape(text)}</pre>
    </section>
    <div class="loretta-away-summary-actions">
      <button class="secondary-action" type="button" data-away-copy-summary>Copy summary</button>
      ${ended ? `<button class="primary-action" type="button" data-away-new-period>Start new period</button>` : `<button class="primary-action" type="button" data-away-end-period>End mode + save</button>`}
    </div>`;
}

function selectedSummaryPeriod() {
  const store = awayStore();
  return activeAwayPeriod(store) || store.periods.find((period) => period.id === summaryPeriodId) || lastEndedPeriod(store);
}

function renderAwaySheet() {
  const sheet = ensureAwaySheet();
  const card = sheet.querySelector(".loretta-away-card");
  if (awayView === "setup") card.innerHTML = setupViewHTML();
  else if (awayView === "summary") {
    const period = selectedSummaryPeriod();
    card.innerHTML = period ? summaryViewHTML(period) : setupViewHTML();
  } else {
    const period = syncedActivePeriod();
    card.innerHTML = period ? boardViewHTML(period) : setupViewHTML();
  }
}

function openAwaySheet(view = "board") {
  awayView = view;
  if (view !== "summary") summaryPeriodId = "";
  const sheet = ensureAwaySheet();
  renderAwaySheet();
  sheet.classList.add("open");
  sheet.setAttribute("aria-hidden", "false");
  document.body.classList.add("loretta-away-open");
}

function closeAwaySheet() {
  const sheet = document.querySelector("#loretta-away-sheet");
  sheet?.classList.remove("open");
  sheet?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("loretta-away-open");
  delayEditorNoteId = "";
}

function updateActiveNote(noteId, patch) {
  const store = awayStore();
  const period = activeAwayPeriod(store);
  if (!period) return;
  syncPeriodNotes(period);
  const previous = period.noteStates?.[noteId] || {};
  period.noteStates[noteId] = { ...previous, ...patch, updatedAt: new Date().toISOString() };
  saveAwayStore(store);
}

function updateInboxNoteStatus(noteId, status) {
  const notes = allLorettaNotes();
  const index = notes.findIndex((note) => note.id === noteId);
  if (index < 0) return;
  notes[index] = { ...notes[index], status: status === "done" ? "archived" : "open", updatedAt: new Date().toISOString() };
  awayWrite(LORETTA_NOTES_KEY, notes);
}

function refreshNotesScreen() {
  ensureAwayPanel();
  const screen = document.querySelector("#loretta-notes-screen");
  if (!screen || !document.querySelector('[data-screen="voice"]')?.classList.contains("active")) return;
  screen.remove();
  setTimeout(() => document.querySelector('[data-screen="voice"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })), 0);
}

function startOrUpdatePeriod(form) {
  const data = new FormData(form);
  const startDate = String(data.get("startDate") || "");
  const endDate = String(data.get("endDate") || "");
  if (!startDate || !endDate) return setAppStatus("Choose both dates");
  if (endDate < startDate) return setAppStatus("Return date must be after the start");
  const store = awayStore();
  let period = activeAwayPeriod(store);
  if (period) {
    period.startDate = startDate;
    period.endDate = endDate;
    period.updatedAt = new Date().toISOString();
  } else {
    period = {
      id: `loretta-away-${Date.now()}`,
      status: "active",
      startDate,
      endDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      endedAt: "",
      noteStates: {},
      summary: ""
    };
    store.periods.unshift(period);
  }
  syncPeriodNotes(period);
  saveAwayStore(store);
  awayView = "board";
  awayTab = "do";
  renderAwaySheet();
  ensureAwayPanel();
  setAppStatus("Loretta Away Mode active");
}

function endActivePeriod() {
  const store = awayStore();
  const period = activeAwayPeriod(store);
  if (!period) return;
  period.summary = summaryText(period);
  period.status = "ended";
  period.endedAt = new Date().toISOString();
  period.updatedAt = period.endedAt;
  summaryPeriodId = period.id;
  saveAwayStore(store);
  awayView = "summary";
  renderAwaySheet();
  refreshNotesScreen();
  setAppStatus("Away Mode ended and summary saved");
}

async function copyPeriodSummary() {
  const period = selectedSummaryPeriod();
  if (!period) return;
  const text = period.summary || summaryText(period);
  try {
    await navigator.clipboard.writeText(text);
    setAppStatus("Return summary copied");
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    setAppStatus("Return summary copied");
  }
}

function handleAwaySheetClick(event) {
  if (event.target === event.currentTarget || event.target.closest("[data-away-close]")) return closeAwaySheet();
  const tab = event.target.closest("[data-away-tab]");
  if (tab) {
    awayTab = tab.dataset.awayTab;
    delayEditorNoteId = "";
    return renderAwaySheet();
  }
  if (event.target.closest("[data-away-edit-dates]")) {
    awayView = "setup";
    return renderAwaySheet();
  }
  if (event.target.closest("[data-away-add-note]")) {
    closeAwaySheet();
    return window.StorePilotLorettaInbox?.open?.();
  }
  if (event.target.closest("[data-away-open-summary]")) {
    awayView = "summary";
    return renderAwaySheet();
  }
  const noteCard = event.target.closest("[data-away-note]");
  const noteId = noteCard?.dataset.awayNote;
  const statusButton = event.target.closest("[data-away-status]");
  if (noteId && statusButton) {
    const status = statusButton.dataset.awayStatus;
    if (status === "delayed") {
      delayEditorNoteId = noteId;
      return renderAwaySheet();
    }
    updateActiveNote(noteId, { status, reason: status === "open" ? "" : stateForNote(activeAwayPeriod(), allLorettaNotes().find((note) => note.id === noteId) || {}).reason || "" });
    updateInboxNoteStatus(noteId, status);
    renderAwaySheet();
    refreshNotesScreen();
    return;
  }
  if (noteId && event.target.closest("[data-away-delay-edit]")) {
    delayEditorNoteId = noteId;
    return renderAwaySheet();
  }
  if (event.target.closest("[data-away-delay-cancel]")) {
    delayEditorNoteId = "";
    return renderAwaySheet();
  }
  if (event.target.closest("[data-away-copy-summary]")) return copyPeriodSummary();
  if (event.target.closest("[data-away-end-period]")) return endActivePeriod();
  if (event.target.closest("[data-away-new-period]")) {
    summaryPeriodId = "";
    awayView = "setup";
    return renderAwaySheet();
  }
}

function handleAwaySheetChange(event) {
  const select = event.target.closest("[data-away-lane]");
  const noteId = select?.closest("[data-away-note]")?.dataset.awayNote;
  if (!select || !noteId) return;
  updateActiveNote(noteId, { lane: select.value });
  renderAwaySheet();
  ensureAwayPanel();
}

function handleAwaySheetSubmit(event) {
  if (event.target.matches("[data-away-setup-form]")) {
    event.preventDefault();
    return startOrUpdatePeriod(event.target);
  }
  if (event.target.matches("[data-away-delay-form]")) {
    event.preventDefault();
    const noteId = event.target.closest("[data-away-note]")?.dataset.awayNote;
    const reason = String(new FormData(event.target).get("reason") || "").trim();
    if (!noteId || !reason) return setAppStatus("Add a short delay reason");
    updateActiveNote(noteId, { status: "delayed", reason });
    updateInboxNoteStatus(noteId, "open");
    delayEditorNoteId = "";
    renderAwaySheet();
    refreshNotesScreen();
  }
}

function queueAwayRender() {
  if (awayRenderQueued) return;
  awayRenderQueued = true;
  requestAnimationFrame(() => {
    awayRenderQueued = false;
    ensureAwayPanel();
    const sheet = document.querySelector("#loretta-away-sheet.open");
    if (sheet && awayView === "board") renderAwaySheet();
  });
}

function observeAwayMode() {
  if (awayObserver) return;
  awayObserver = new MutationObserver(queueAwayRender);
  awayObserver.observe(document.body, { childList: true, subtree: true });
}

window.StorePilotLorettaAway = {
  open: openAwaySheet,
  getActive: () => syncedActivePeriod(),
  getPeriods: () => awayStore().periods,
  getSummary: (periodId) => {
    const period = awayStore().periods.find((item) => item.id === periodId) || activeAwayPeriod();
    return period ? period.summary || summaryText(period) : "";
  }
};

window.addEventListener("storepilot:loretta-away-changed", queueAwayRender);
window.addEventListener("storage", queueAwayRender);
setTimeout(() => {
  ensureAwaySheet();
  observeAwayMode();
  ensureAwayPanel();
}, 420);
