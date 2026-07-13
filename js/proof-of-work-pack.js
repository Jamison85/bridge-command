const PROOF_KEYS = {
  completed: "storePilot.completed.v6",
  customTasks: "storePilot.customTasks.v6",
  shift: "storePilot.shift.v6",
  states: "storePilot.taskStates.v6",
  templates: "storePilot.templates.v7",
  incidents: "storePilot.incidents.v2",
  interruptions: "storePilot.interruptions.v1",
  notes: "storePilot.notes.v6",
  lorettaAway: "storePilot.lorettaAway.v1",
  lorettaNotes: "storePilot.lorettaNotes.v1",
  snapshots: "storePilot.proofPacks.v1"
};

const PROOF_SHIFT_LABELS = { morning: "Morning", mid: "Mid", close: "Close" };
let proofObserver = null;
let proofRenderQueued = false;
let proofSnapshotId = "";

function proofRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function proofWrite(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function proofArray(value) {
  return Array.isArray(value) ? value : [];
}

function proofObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function proofEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
}

function proofDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function proofShift() {
  const shift = proofRead(PROOF_KEYS.shift, "morning");
  return PROOF_SHIFT_LABELS[shift] ? shift : "morning";
}

function proofShiftKey() {
  return `${proofDateKey()}:${proofShift()}`;
}

function proofModeLabel(value) {
  return String(value || "normal")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function proofTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time not recorded";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function proofDateLabel(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return proofDateKey();
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function proofElapsed(item) {
  const start = new Date(item?.startedAt || 0).getTime();
  if (!start) return 0;
  const end = item?.endedAt ? new Date(item.endedAt).getTime() : Date.now();
  return Math.max(0, end - start);
}

function proofDuration(ms) {
  const totalMinutes = Math.max(1, Math.round(Number(ms || 0) / 60000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

function proofFallbackAnalysis() {
  const shift = proofShift();
  const key = proofShiftKey();
  const templates = proofObject(proofRead(PROOF_KEYS.templates, {}));
  const custom = proofObject(proofRead(PROOF_KEYS.customTasks, {}));
  const tasks = [...proofArray(templates[shift]), ...proofArray(custom[key])];
  const completedIds = new Set(proofArray(proofObject(proofRead(PROOF_KEYS.completed, {}))[key]));
  const states = proofObject(proofObject(proofRead(PROOF_KEYS.states, {}))[key]);
  const completed = tasks.filter((task) => completedIds.has(task.id));
  const unfinished = tasks.filter((task) => !completedIds.has(task.id));
  const delayed = unfinished.filter((task) => states[task.id]?.type === "delayed");
  const carried = unfinished.filter((task) => states[task.id]?.type === "carry");
  const active = unfinished.filter((task) => !states[task.id]);
  return {
    data: { key, tasks, completed, delayed, carried, active, states },
    context: {},
    completion: tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0
  };
}

function proofAnalysis() {
  try { return window.StorePilotCommandCenter?.analyze?.() || proofFallbackAnalysis(); }
  catch { return proofFallbackAnalysis(); }
}

function proofTodayNotes() {
  const label = PROOF_SHIFT_LABELS[proofShift()];
  return proofArray(proofRead(PROOF_KEYS.notes, [])).filter((note) => {
    if (typeof note !== "string") return false;
    const firstLine = note.split("\n")[0] || "";
    const match = firstLine.match(/^(.*?)\s+\((Morning|Mid|Close)\)$/);
    if (!match || match[2] !== label) return false;
    const parsed = new Date(match[1]);
    return !Number.isNaN(parsed.getTime()) && proofDateKey(parsed) === proofDateKey();
  });
}

function proofAwayData() {
  const store = proofObject(proofRead(PROOF_KEYS.lorettaAway, { periods: [] }));
  const periods = proofArray(store.periods);
  const period = periods.find((item) => item?.status === "active") || periods.find((item) => item?.status === "ended" && item?.endDate === proofDateKey());
  if (!period) return null;

  const states = Object.values(proofObject(period.noteStates));
  const counts = { done: 0, delayed: 0, approval: 0, wait: 0, open: 0 };
  states.forEach((state) => {
    if (state?.status === "done") counts.done += 1;
    else if (state?.status === "delayed") counts.delayed += 1;
    else counts.open += 1;
    if (state?.lane === "approval" && state?.status !== "done") counts.approval += 1;
    if (state?.lane === "wait" && state?.status !== "done") counts.wait += 1;
  });

  return {
    period,
    counts,
    label: period.startDate === period.endDate ? period.startDate : `${period.startDate} to ${period.endDate}`
  };
}

function proofLiveData() {
  const analysis = proofAnalysis();
  const data = analysis?.data || {};
  const key = data.key || proofShiftKey();
  const incidents = proofArray(proofRead(PROOF_KEYS.incidents, [])).filter((item) => item?.shiftKey === key);
  const interruptions = proofArray(proofRead(PROOF_KEYS.interruptions, [])).filter((item) => item?.shiftKey === key);
  const completed = proofArray(data.completed);
  const delayed = proofArray(data.delayed);
  const carried = proofArray(data.carried);
  const open = proofArray(data.active);
  const tasks = proofArray(data.tasks);
  const context = proofObject(analysis?.context);
  const notes = proofTodayNotes();
  const away = proofAwayData();
  const interruptionMinutes = interruptions.reduce((sum, item) => sum + proofElapsed(item), 0);
  const documented = delayed.length + carried.length + incidents.length + interruptions.length;
  const completion = Number.isFinite(analysis?.completion)
    ? analysis.completion
    : (tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0);

  return {
    key,
    date: proofDateKey(),
    shift: proofShift(),
    shiftLabel: PROOF_SHIFT_LABELS[proofShift()],
    generatedAt: new Date().toISOString(),
    tasks,
    completed,
    delayed,
    carried,
    open,
    states: proofObject(data.states),
    context,
    incidents,
    interruptions,
    interruptionMinutes,
    notes,
    away,
    documented,
    completion
  };
}

function proofTaskLines(items, states, empty) {
  if (!items.length) return [`- ${empty}`];
  return items.map((task) => {
    const reason = states[task.id]?.reason;
    return `- ${task.title}${reason ? `: ${reason}` : ""}`;
  });
}

function proofIncidentLines(items) {
  if (!items.length) return ["- No incident recorded for this shift."];
  return items.map((incident) => {
    const status = incident.status === "active" ? "active" : "resolved";
    const notified = incident.notified ? `; notified: ${incident.notified}` : "";
    const impact = incident.impact ? `; impact: ${incident.impact}` : "";
    const delayed = incident.delayed ? `; work moved: ${incident.delayed}` : "";
    return `- ${incident.type} (${status}, ${proofTime(incident.startedAt)})${notified}${impact}${delayed}`;
  });
}

function proofInterruptionLines(items) {
  if (!items.length) return ["- No interruptions logged."];
  return items.map((item) => {
    const note = item.note ? `; ${item.note}` : "";
    const task = item.pausedTaskTitle ? `; paused: ${item.pausedTaskTitle}` : "";
    return `- ${item.type}: ${proofDuration(proofElapsed(item))}${note}${task}`;
  });
}

function proofNoteLines(items) {
  if (!items.length) return ["- No shift notes saved."];
  return items.map((note) => {
    const body = String(note).split("\n").slice(1).join(" ").trim();
    return `- ${body || String(note).trim()}`;
  });
}

function proofAwayLines(away) {
  if (!away) return ["- Loretta Away Mode was not active for this shift."];
  return [
    `- Coverage period: ${away.label}`,
    `- ${away.counts.done} done; ${away.counts.delayed} delayed; ${away.counts.approval} need Loretta; ${away.counts.wait} waiting; ${away.counts.open} open`
  ];
}

function proofText(data) {
  const lines = [
    `PROOF OF WORK PACK · ${proofDateLabel(data.generatedAt)} · ${data.shiftLabel} shift`,
    `Generated ${proofTime(data.generatedAt)}`,
    "",
    "SHIFT SNAPSHOT",
    `- ${data.completed.length} of ${data.tasks.length} tasks completed (${data.completion}%)`,
    `- ${data.delayed.length} delayed; ${data.carried.length} carried; ${data.open.length} still open`,
    `- ${data.incidents.length} incident record${data.incidents.length === 1 ? "" : "s"}; ${data.interruptions.length} interruption${data.interruptions.length === 1 ? "" : "s"} totaling ${data.interruptions.length ? proofDuration(data.interruptionMinutes) : "0 min"}`,
    `- Context: ${proofModeLabel(data.context.mode || "normal")} · ${proofModeLabel(data.context.role || "manager")} · ${data.context.staffing === "short" ? "Short staffed" : "Normal staffing"}`,
    "",
    "COMPLETED",
    ...proofTaskLines(data.completed, data.states, "No tasks were checked complete yet."),
    "",
    "DELAYED / CARRIED WITH REASONS",
    ...proofTaskLines(data.delayed, data.states, "No delayed tasks."),
    ...proofTaskLines(data.carried, data.states, "No carried tasks."),
    "",
    "INCIDENTS",
    ...proofIncidentLines(data.incidents),
    "",
    "INTERRUPTIONS",
    ...proofInterruptionLines(data.interruptions),
    "",
    "LORETTA COVERAGE",
    ...proofAwayLines(data.away),
    "",
    "SHIFT NOTES",
    ...proofNoteLines(data.notes),
    "",
    "STILL OPEN",
    ...proofTaskLines(data.open, data.states, "No active tasks remain."),
    "",
    "Record generated from Store Pilot entries for this selected shift."
  ];
  return lines.join("\n");
}

function proofSnapshots() {
  return proofArray(proofRead(PROOF_KEYS.snapshots, []));
}

function proofCurrentSnapshots() {
  const key = proofShiftKey();
  return proofSnapshots().filter((item) => item?.shiftKey === key);
}

function proofSetStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  clearTimeout(proofSetStatus.timer);
  proofSetStatus.timer = setTimeout(() => { status.textContent = "Ready"; }, 2200);
}

function proofCardHTML(data) {
  const snapshots = proofCurrentSnapshots();
  return `
    <section id="proof-of-work-card" class="proof-of-work-card">
      <div class="proof-of-work-head">
        <div><p>PROOF OF WORK</p><h3>Shift record</h3><span>${proofEscape(data.shiftLabel)} · live from today’s entries</span></div>
        <span class="proof-of-work-ready">Ready</span>
      </div>
      <div class="proof-of-work-metrics">
        <span><b>${data.completed.length}</b> done</span>
        <span><b>${data.documented}</b> documented</span>
        <span><b>${data.open.length}</b> open</span>
      </div>
      <div class="proof-of-work-actions">
        <button type="button" data-proof-open>Open proof pack</button>
        ${snapshots.length ? `<button type="button" data-proof-open-snapshot="${proofEscape(snapshots[0].id)}">Latest saved</button>` : ""}
      </div>
    </section>`;
}

function ensureProofCard() {
  const logActive = document.querySelector('[data-screen="log"]')?.classList.contains("active");
  const content = document.querySelector("#screen-content");
  if (!logActive || !content) return;
  const data = proofLiveData();
  let card = content.querySelector("#proof-of-work-card");
  if (!card) {
    const holder = document.createElement("div");
    holder.innerHTML = proofCardHTML(data).trim();
    card = holder.firstElementChild;
    content.prepend(card);
    return;
  }
  const next = proofCardHTML(data).trim();
  if (card.outerHTML !== next) card.outerHTML = next;
}

function ensureProofSheet() {
  let sheet = document.querySelector("#proof-of-work-sheet");
  if (sheet) return sheet;
  sheet = document.createElement("section");
  sheet.id = "proof-of-work-sheet";
  sheet.className = "proof-of-work-sheet";
  sheet.setAttribute("aria-hidden", "true");
  sheet.innerHTML = `<div class="proof-of-work-sheet-card" role="dialog" aria-modal="true" aria-labelledby="proof-of-work-title"></div>`;
  sheet.addEventListener("click", (event) => {
    if (event.target === sheet || event.target.closest("[data-proof-close]")) closeProofSheet();
  });
  document.body.appendChild(sheet);
  return sheet;
}

function proofDetailList(title, items, empty) {
  return `
    <details class="proof-detail" ${items.length ? "" : "open"}>
      <summary><span>${proofEscape(title)}</span><b>${items.length}</b></summary>
      <div>${items.length ? items.map((item) => `<p>${proofEscape(item)}</p>`).join("") : `<p>${proofEscape(empty)}</p>`}</div>
    </details>`;
}

function proofLiveSheetHTML(data) {
  const delayed = [
    ...data.delayed.map((task) => `${task.title}: ${data.states[task.id]?.reason || "Reason noted"}`),
    ...data.carried.map((task) => `${task.title}: ${data.states[task.id]?.reason || "Carried forward"}`)
  ];
  const incidents = data.incidents.map((item) => `${item.type} · ${item.status} · ${item.notified || "No notification listed"}`);
  const interruptions = data.interruptions.map((item) => `${item.type} · ${proofDuration(proofElapsed(item))}${item.note ? ` · ${item.note}` : ""}`);
  const saved = proofCurrentSnapshots();
  return `
    <header class="proof-sheet-head">
      <div><p>PROOF OF WORK</p><h2 id="proof-of-work-title">${proofEscape(data.shiftLabel)} shift pack</h2><span>${proofEscape(proofDateLabel(data.generatedAt))}</span></div>
      <button type="button" data-proof-close>Close</button>
    </header>
    <section class="proof-sheet-summary">
      <div><b>${data.completed.length}</b><span>Completed</span></div>
      <div><b>${data.documented}</b><span>Documented</span></div>
      <div><b>${data.open.length}</b><span>Still open</span></div>
      <div><b>${data.completion}%</b><span>Progress</span></div>
    </section>
    <div class="proof-sheet-details">
      ${proofDetailList("Completed tasks", data.completed.map((item) => item.title), "Nothing checked complete yet.")}
      ${proofDetailList("Delayed and carried", delayed, "Nothing delayed or carried.")}
      ${proofDetailList("Incidents", incidents, "No incident recorded.")}
      ${proofDetailList("Interruptions", interruptions, "No interruption recorded.")}
    </div>
    <label class="proof-text-label">Copy-ready record
      <textarea id="proof-of-work-text" readonly>${proofEscape(proofText(data))}</textarea>
    </label>
    <div class="proof-sheet-actions">
      <button class="primary-action" type="button" data-proof-copy>Copy pack</button>
      <button class="secondary-action" type="button" data-proof-share>Share</button>
      <button class="secondary-action" type="button" data-proof-save>Save snapshot</button>
    </div>
    <section class="proof-saved-section">
      <div class="proof-saved-head"><strong>Saved snapshots</strong><span>${saved.length} for this shift</span></div>
      ${saved.length ? saved.slice(0, 6).map((item) => `<button type="button" data-proof-open-snapshot="${proofEscape(item.id)}"><span>${proofEscape(proofTime(item.generatedAt))}</span><b>${item.counts?.completed || 0} done · ${item.counts?.open || 0} open</b></button>`).join("") : `<p>No frozen snapshots yet.</p>`}
    </section>`;
}

function proofSnapshotSheetHTML(snapshot) {
  return `
    <header class="proof-sheet-head">
      <div><p>SAVED PROOF PACK</p><h2 id="proof-of-work-title">${proofEscape(snapshot.shiftLabel || "Shift")} snapshot</h2><span>${proofEscape(proofDateLabel(snapshot.generatedAt))} · ${proofEscape(proofTime(snapshot.generatedAt))}</span></div>
      <button type="button" data-proof-close>Close</button>
    </header>
    <section class="proof-snapshot-banner"><strong>Frozen record</strong><span>This copy will not change when the live shift data changes.</span></section>
    <label class="proof-text-label">Saved record
      <textarea id="proof-of-work-text" readonly>${proofEscape(snapshot.text || "")}</textarea>
    </label>
    <div class="proof-sheet-actions">
      <button class="primary-action" type="button" data-proof-copy>Copy pack</button>
      <button class="secondary-action" type="button" data-proof-share>Share</button>
      <button class="secondary-action" type="button" data-proof-back-live>Back to live</button>
    </div>`;
}

function renderProofSheet() {
  const sheet = ensureProofSheet();
  const card = sheet.querySelector(".proof-of-work-sheet-card");
  const snapshot = proofSnapshotId ? proofSnapshots().find((item) => item?.id === proofSnapshotId) : null;
  if (snapshot) card.innerHTML = proofSnapshotSheetHTML(snapshot);
  else {
    proofSnapshotId = "";
    card.innerHTML = proofLiveSheetHTML(proofLiveData());
  }
}

function openProofSheet(snapshotId = "") {
  proofSnapshotId = snapshotId;
  const sheet = ensureProofSheet();
  renderProofSheet();
  sheet.classList.add("open");
  sheet.setAttribute("aria-hidden", "false");
  document.body.classList.add("proof-of-work-open");
}

function closeProofSheet() {
  const sheet = document.querySelector("#proof-of-work-sheet");
  sheet?.classList.remove("open");
  sheet?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("proof-of-work-open");
  proofSnapshotId = "";
}

function proofCurrentText() {
  return document.querySelector("#proof-of-work-text")?.value || proofText(proofLiveData());
}

async function proofCopy(text) {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else throw new Error("Clipboard unavailable");
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  proofSetStatus("Proof pack copied");
}

async function proofShare(text) {
  if (navigator.share) {
    try {
      await navigator.share({ title: "Store Pilot proof of work", text });
      proofSetStatus("Share opened");
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }
  await proofCopy(text);
}

function saveProofSnapshot() {
  const data = proofLiveData();
  const snapshot = {
    id: `proof-${Date.now()}`,
    shiftKey: data.key,
    date: data.date,
    shift: data.shift,
    shiftLabel: data.shiftLabel,
    generatedAt: new Date().toISOString(),
    text: proofText(data),
    counts: {
      completed: data.completed.length,
      documented: data.documented,
      open: data.open.length,
      incidents: data.incidents.length,
      interruptions: data.interruptions.length
    }
  };
  const snapshots = proofSnapshots();
  snapshots.unshift(snapshot);
  proofWrite(PROOF_KEYS.snapshots, snapshots.slice(0, 50));
  proofSetStatus("Proof snapshot saved");
  navigator.vibrate?.(30);
  ensureProofCard();
  renderProofSheet();
}

function queueProofCard() {
  if (proofRenderQueued) return;
  proofRenderQueued = true;
  requestAnimationFrame(() => {
    proofRenderQueued = false;
    ensureProofCard();
  });
}

function handleProofClick(event) {
  if (event.target.closest("[data-proof-open]")) openProofSheet();
  const snapshotButton = event.target.closest("[data-proof-open-snapshot]");
  if (snapshotButton) openProofSheet(snapshotButton.dataset.proofOpenSnapshot || "");
  if (event.target.closest("[data-proof-copy]")) proofCopy(proofCurrentText());
  if (event.target.closest("[data-proof-share]")) proofShare(proofCurrentText());
  if (event.target.closest("[data-proof-save]")) saveProofSnapshot();
  if (event.target.closest("[data-proof-back-live]")) {
    proofSnapshotId = "";
    renderProofSheet();
  }
  if (event.target.closest('[data-screen="log"]') || event.target.closest(".shift-button")) {
    setTimeout(queueProofCard, 80);
    setTimeout(queueProofCard, 260);
  }
}

function startProofObserver() {
  if (proofObserver) return;
  proofObserver = new MutationObserver((mutations) => {
    const relevant = mutations.some((mutation) => mutation.type === "childList" && (
      mutation.target.id === "screen-content" || mutation.target.closest?.("#screen-content")
    ));
    if (relevant && !document.querySelector("#proof-of-work-card")) queueProofCard();
  });
  proofObserver.observe(document.body, { childList: true, subtree: true });
}

document.addEventListener("click", handleProofClick);
["storepilot:tasks-changed", "storepilot:incident-saved", "storepilot:interruptions-changed", "storepilot:loretta-away-changed"].forEach((name) => {
  window.addEventListener(name, () => {
    queueProofCard();
    if (document.querySelector("#proof-of-work-sheet.open") && !proofSnapshotId) renderProofSheet();
  });
});
window.addEventListener("focus", queueProofCard);
document.addEventListener("visibilitychange", () => { if (!document.hidden) queueProofCard(); });

setTimeout(() => {
  startProofObserver();
  queueProofCard();
}, 220);
setInterval(() => {
  if (document.querySelector('[data-screen="log"]')?.classList.contains("active")) queueProofCard();
}, 60000);

window.StorePilotProofPack = {
  open: () => openProofSheet(),
  build: () => ({ data: proofLiveData(), text: proofText(proofLiveData()) }),
  snapshots: proofSnapshots
};
