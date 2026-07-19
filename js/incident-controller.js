import {
  INCIDENT_FIELDS,
  buildIncidentRecord,
  clearIncidentDraft,
  incidentReport,
  updateIncidentContext,
  upsertIncident,
  upsertIncidentReport
} from "./incident-state-model.js?v=command-center-26";

const INCIDENT_RELEASE = "command-center-26";
const KEYS = {
  drafts: "storePilot.incidentDrafts.v1",
  incidents: "storePilot.incidents.v2",
  reports: "storePilot.reports.v6",
  reportReferences: "storePilot.incidentReportRefs.v1",
  context: "storePilot.shiftContext.v2",
  shift: "storePilot.shift.v6"
};

const MODE_COPY = {
  normal: ["Normal", "Standard shift flow."],
  "short-staffed": ["Short staffed", "Protect coverage, quick wins, and documentation."],
  "incident-recovery": ["Incident recovery", "Must-do work first. Lower-priority work gets documented."]
};

let draftTimer = null;
let hydrateQueued = false;
let saving = false;
let observer = null;

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentShift() {
  const shift = readJSON(KEYS.shift, "morning");
  return ["morning", "mid", "close"].includes(shift) ? shift : "morning";
}

function currentShiftKey() {
  return `${dateKey()}:${currentShift()}`;
}

function incidentFormFrom(target) {
  return target?.closest?.("#command-incident-form") || null;
}

function formValues(form) {
  const values = {};
  INCIDENT_FIELDS.forEach((name) => {
    const control = form.elements?.namedItem(name);
    if (control) values[name] = String(control.value || "");
  });
  return values;
}

function draftStore() {
  return asRecord(readJSON(KEYS.drafts, {}));
}

function ensureDraftHint(form, text = "Draft saves while you type") {
  let hint = form.querySelector(".incident-draft-hint");
  if (!hint) {
    hint = document.createElement("div");
    hint.className = "incident-draft-hint";
    const head = form.querySelector(".command-section-head");
    if (head) head.insertAdjacentElement("afterend", hint);
    else form.prepend(hint);
  }
  hint.textContent = text;
}

function saveDraft(form) {
  if (!form || saving) return;
  const drafts = draftStore();
  drafts[currentShiftKey()] = {
    ...formValues(form),
    shift: currentShift(),
    shiftKey: currentShiftKey(),
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(KEYS.drafts, JSON.stringify(drafts));
    form.dataset.incidentDraftSaved = "true";
    ensureDraftHint(form, "Draft saved automatically");
  } catch {
    ensureDraftHint(form, "Draft could not be saved");
    setStatus("Incident draft could not be saved");
  }
}

function scheduleDraft(form) {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    draftTimer = null;
    saveDraft(form);
  }, 180);
}

function getDraft() {
  return draftStore()[currentShiftKey()] || null;
}

function restoreDraft(form) {
  if (!form || form.dataset.incidentDraftHydrated === "true") return;
  ensureDraftHint(form);
  const draft = getDraft();
  if (draft) {
    INCIDENT_FIELDS.forEach((name) => {
      const control = form.elements?.namedItem(name);
      if (control && draft[name] !== undefined) control.value = draft[name];
    });
    ensureDraftHint(form, "Draft restored and still saving");
  }
  form.dataset.incidentDraftHydrated = "true";
}

function removeLegacyButtonListeners(form) {
  form?.querySelectorAll("[data-save-incident]").forEach((button) => {
    if (button.dataset.incidentController === INCIDENT_RELEASE) return;
    const controlled = button.cloneNode(true);
    controlled.dataset.incidentController = INCIDENT_RELEASE;
    button.replaceWith(controlled);
  });
}

function hydrateForms() {
  document.querySelectorAll("#command-incident-form").forEach((form) => {
    removeLegacyButtonListeners(form);
    restoreDraft(form);
  });
}

function queueHydrate() {
  if (hydrateQueued) return;
  hydrateQueued = true;
  requestAnimationFrame(() => {
    hydrateQueued = false;
    hydrateForms();
  });
}

function setStatus(text) {
  const status = document.querySelector("#system-status");
  if (!status) return;
  status.textContent = text;
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => { status.textContent = "Ready"; }, 2600);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
}

function transactionWrite(values) {
  const entries = Object.entries(values);
  const previous = new Map(entries.map(([key]) => [key, localStorage.getItem(key)]));
  try {
    entries.forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
  } catch (error) {
    previous.forEach((value, key) => {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch {
        // The original error remains the useful failure signal.
      }
    });
    throw error;
  }
}

function updateHistory(incidents) {
  const history = document.querySelector(".command-incident-history");
  if (!history) return;
  const latest = incidents.filter((incident) => incident.shiftKey === currentShiftKey()).slice(0, 3);
  history.innerHTML = `
    <div class="command-section-head"><div><p>TODAY</p><h3>Incident history</h3></div></div>
    ${latest.length
      ? latest.map((incident) => `<div><strong>${escapeHTML(incident.type)}</strong><span>${incident.status === "active" ? "Active" : "Resolved"} · ${new Date(incident.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></div>`).join("")
      : "<p>No incidents saved for this shift.</p>"}`;
}

function updateVisibleContext(incident, contexts) {
  const reportButton = document.querySelector("#open-report");
  if (reportButton) reportButton.textContent = incident.status === "active" ? "Update incident" : "Report incident";

  const card = document.querySelector("#shift-command-context");
  if (!card) return;
  let alert = card.querySelector(".command-context-alert");
  if (incident.status === "active") {
    if (!alert) {
      alert = document.createElement("span");
      alert.className = "command-context-alert";
      card.querySelector(".command-context-summary > div")?.appendChild(alert);
    }
    alert.textContent = `Incident active: ${incident.type}`;
  } else {
    alert?.remove();
  }

  const context = asRecord(contexts[currentShiftKey()]);
  const mode = MODE_COPY[context.mode];
  if (mode) {
    const summary = card.querySelector(".command-context-summary > div");
    const title = summary?.querySelector("strong");
    const hint = summary?.querySelector("span:not(.command-context-alert)");
    const role = String(context.role || "manager").replace(/-/g, " ");
    if (title) title.textContent = `${mode[0]} · ${role}`;
    if (hint) hint.textContent = mode[1];
  }
}

function showConfirmation(form, incident) {
  document.querySelectorAll(".incident-save-confirmation").forEach((item) => item.remove());
  const confirmation = document.createElement("section");
  confirmation.className = "incident-save-confirmation";
  confirmation.innerHTML = `
    <div class="incident-save-check">✓</div>
    <div class="incident-save-copy">
      <span>INCIDENT SAVED</span>
      <strong>${escapeHTML(incident.type)}</strong>
      <p>${incident.status === "active" ? "Saved as active. Future updates will replace this incident's report instead of adding duplicates." : "Saved as resolved. The incident record and report were updated."}</p>
    </div>
    <button type="button" data-dismiss-incident-confirmation>Keep editing</button>`;
  form.insertAdjacentElement("beforebegin", confirmation);
  confirmation.querySelector("[data-dismiss-incident-confirmation]")?.addEventListener("click", () => {
    confirmation.remove();
    form.querySelector("textarea, input, select")?.focus();
  });

  const hiddenId = form.elements?.namedItem("incidentId");
  if (hiddenId) hiddenId.value = incident.id;
  form.dataset.savedIncidentId = incident.id;
  form.dataset.incidentDraftHydrated = "true";

  const badge = form.querySelector(".command-incident-status");
  if (badge) badge.textContent = incident.status === "active" ? "ACTIVE" : "RESOLVED";
  const title = form.querySelector(".command-section-head h3");
  if (title) title.textContent = incident.status === "active" ? "Update active incident" : "Resolved incident saved";
  const primary = form.querySelector('[data-save-incident="active"]');
  if (primary) primary.textContent = incident.status === "active" ? "Update active incident" : "Reopen as active";

  ensureDraftHint(form, "Saved. New edits will autosave as a draft");
  confirmation.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function setButtonsBusy(form, busy) {
  form?.querySelectorAll("[data-save-incident]").forEach((button) => {
    button.disabled = busy;
    button.setAttribute("aria-busy", String(busy));
  });
}

function saveIncident(form, requestedStatus) {
  if (saving || !form) return;
  saving = true;
  clearTimeout(draftTimer);
  draftTimer = null;
  setButtonsBusy(form, true);

  try {
    const values = formValues(form);
    values.incidentId ||= form.dataset.savedIncidentId || "";
    const incidents = asArray(readJSON(KEYS.incidents, []));
    const existing = incidents.find((item) => item?.id === values.incidentId) || null;
    const incident = buildIncidentRecord({
      values,
      status: requestedStatus,
      shift: currentShift(),
      shiftKey: currentShiftKey(),
      existing
    });
    const nextIncidents = upsertIncident(incidents, incident);
    const report = incidentReport(incident);
    const reportState = upsertIncidentReport({
      reports: asArray(readJSON(KEYS.reports, [])),
      references: asRecord(readJSON(KEYS.reportReferences, {})),
      incident,
      report
    });
    const nextContexts = updateIncidentContext(readJSON(KEYS.context, {}), currentShiftKey(), incident);
    const nextDrafts = clearIncidentDraft(readJSON(KEYS.drafts, {}), currentShiftKey());

    transactionWrite({
      [KEYS.incidents]: nextIncidents,
      [KEYS.reports]: reportState.reports,
      [KEYS.reportReferences]: reportState.references,
      [KEYS.context]: nextContexts,
      [KEYS.drafts]: nextDrafts
    });

    showConfirmation(form, incident);
    updateHistory(nextIncidents);
    updateVisibleContext(incident, nextContexts);
    setStatus(incident.status === "active" ? "Active incident saved" : "Resolved incident saved");
    navigator.vibrate?.(35);
    window.dispatchEvent(new CustomEvent("storepilot:incident-saved", { detail: incident }));
  } catch (error) {
    console.error("Store Pilot incident save failed", error);
    ensureDraftHint(form, "Save failed. Your draft remains on this screen");
    setStatus("Incident was not saved");
  } finally {
    setButtonsBusy(form, false);
    setTimeout(() => { saving = false; }, 140);
  }
}

function interceptSave(event) {
  const button = event.target.closest?.("[data-save-incident]");
  if (!button) return;
  const form = incidentFormFrom(button);
  if (!form) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  saveIncident(form, button.dataset.saveIncident === "resolved" ? "resolved" : "active");
}

function interceptSubmit(event) {
  const form = incidentFormFrom(event.target);
  if (!form) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  saveIncident(form, "active");
}

function handleDraftInput(event) {
  const form = incidentFormFrom(event.target);
  if (form) scheduleDraft(form);
}

function startIncidentController() {
  window.addEventListener("click", interceptSave, true);
  window.addEventListener("submit", interceptSubmit, true);
  document.addEventListener("input", handleDraftInput, true);
  document.addEventListener("change", handleDraftInput, true);
  observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.type === "childList")) queueHydrate();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  hydrateForms();
  document.documentElement.dataset.incidentController = INCIDENT_RELEASE;
}

window.StorePilotIncidentController = {
  version: INCIDENT_RELEASE,
  save: (status = "active") => saveIncident(document.querySelector("#command-incident-form"), status),
  saveDraft: () => saveDraft(document.querySelector("#command-incident-form")),
  getDraft,
  clearDraft: () => {
    const next = clearIncidentDraft(draftStore(), currentShiftKey());
    localStorage.setItem(KEYS.drafts, JSON.stringify(next));
  }
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startIncidentController, { once: true });
else startIncidentController();
