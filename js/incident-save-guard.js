(() => {
  const KEYS = {
    drafts: "storePilot.incidentDrafts.v1",
    incidents: "storePilot.incidents.v2",
    reports: "storePilot.reports.v6",
    context: "storePilot.shiftContext.v2",
    shift: "storePilot.shift.v6"
  };
  const FIELDS = ["incidentId", "type", "started", "ended", "notified", "summary", "impact", "actions", "delayed", "resolution"];
  let draftTimer = null;
  let hydrateQueued = false;
  let saving = false;

  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function dateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function currentShift() {
    const shift = readJSON(KEYS.shift, "morning");
    return ["morning", "mid", "close"].includes(shift) ? shift : "morning";
  }

  function shiftKey() {
    return `${dateKey()}:${currentShift()}`;
  }

  function incidentFormFrom(target) {
    return target?.closest?.("#command-incident-form, #report-form") || null;
  }

  function formValues(form) {
    const values = {};
    FIELDS.forEach((name) => {
      const control = form.elements?.namedItem(name);
      if (control) values[name] = String(control.value || "");
    });
    return values;
  }

  function saveDraft(form) {
    if (!form) return;
    const drafts = readJSON(KEYS.drafts, {});
    drafts[shiftKey()] = {
      ...formValues(form),
      shift: currentShift(),
      shiftKey: shiftKey(),
      updatedAt: new Date().toISOString()
    };
    writeJSON(KEYS.drafts, drafts);
    form.dataset.incidentDraftSaved = "true";
    ensureDraftHint(form, "Draft saved automatically");
  }

  function scheduleDraft(form) {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => saveDraft(form), 120);
  }

  function getDraft() {
    return readJSON(KEYS.drafts, {})[shiftKey()] || null;
  }

  function clearDraft() {
    const drafts = readJSON(KEYS.drafts, {});
    delete drafts[shiftKey()];
    writeJSON(KEYS.drafts, drafts);
  }

  function ensureDraftHint(form, text = "Draft saves while you type") {
    if (form.querySelector(".incident-draft-hint")) {
      form.querySelector(".incident-draft-hint").textContent = text;
      return;
    }
    const hint = document.createElement("div");
    hint.className = "incident-draft-hint";
    hint.textContent = text;
    const head = form.querySelector(".command-section-head");
    if (head) head.insertAdjacentElement("afterend", hint);
    else form.prepend(hint);
  }

  function restoreDraft(form) {
    if (!form || form.dataset.incidentDraftHydrated === "true") return;
    const draft = getDraft();
    ensureDraftHint(form);
    if (!draft) {
      form.dataset.incidentDraftHydrated = "true";
      return;
    }

    FIELDS.forEach((name) => {
      const control = form.elements?.namedItem(name);
      if (!control || draft[name] === undefined) return;
      control.value = draft[name];
      control.dispatchEvent(new Event("change", { bubbles: false }));
    });
    form.dataset.incidentDraftHydrated = "true";
    ensureDraftHint(form, "Draft restored and still saving");
  }

  function hydrateForms() {
    document.querySelectorAll("#command-incident-form, #report-form").forEach(restoreDraft);
  }

  function queueHydrate() {
    if (hydrateQueued) return;
    hydrateQueued = true;
    requestAnimationFrame(() => {
      hydrateQueued = false;
      hydrateForms();
    });
  }

  function localDateTime(timeValue, fallback = new Date()) {
    if (!/^\d{2}:\d{2}$/.test(String(timeValue || ""))) return fallback.toISOString();
    const [hour, minute] = String(timeValue).split(":").map(Number);
    const value = new Date();
    value.setHours(hour, minute, 0, 0);
    return value.toISOString();
  }

  function incidentSummary(incident) {
    const start = new Date(incident.startedAt).toLocaleString();
    const end = incident.endedAt ? new Date(incident.endedAt).toLocaleString() : "Still active";
    return `Incident update from Jamison - ${new Date(incident.updatedAt).toLocaleString()}\n\nShift: ${incident.shift}\nType: ${incident.type}\nStatus: ${incident.status === "active" ? "Active" : "Resolved"}\nStarted: ${start}\nEnded: ${end}\n\nWhat happened:\n${incident.summary || "No summary entered."}\n\nOperational impact:\n${incident.impact || "Not listed."}\n\nWho was notified:\n${incident.notified || "Not listed."}\n\nActions taken:\n${incident.actions || "Not listed."}\n\nWork delayed or moved:\n${incident.delayed || "Not listed."}\n\nResolution / current status:\n${incident.resolution || "Still being worked."}`;
  }

  function modeForIncident(incident, currentMode) {
    const text = `${incident.type} ${incident.summary}`;
    if (/short staff|call out/i.test(text)) return "short-staffed";
    if (/outage|system|power|register/i.test(text)) return "incident-recovery";
    return currentMode || "normal";
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

  function showConfirmation(form, incident) {
    document.querySelectorAll(".incident-save-confirmation").forEach((item) => item.remove());
    const confirmation = document.createElement("section");
    confirmation.className = "incident-save-confirmation";
    confirmation.innerHTML = `
      <div class="incident-save-check">✓</div>
      <div class="incident-save-copy">
        <span>INCIDENT SAVED</span>
        <strong>${escapeHTML(incident.type)}</strong>
        <p>${incident.status === "active" ? "Saved as active. Your information remains below for updates." : "Saved as resolved. Your information remains below as confirmation."}</p>
      </div>
      <button type="button" data-dismiss-incident-confirmation>Keep editing</button>`;
    form.insertAdjacentElement("beforebegin", confirmation);
    confirmation.querySelector("[data-dismiss-incident-confirmation]")?.addEventListener("click", () => {
      confirmation.remove();
      form.querySelector("textarea, input, select")?.focus();
    });
    form.dataset.savedIncidentId = incident.id;
    const hiddenId = form.elements?.namedItem("incidentId");
    if (hiddenId) hiddenId.value = incident.id;
    ensureDraftHint(form, "Saved. New edits will become a fresh draft");
    confirmation.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function saveIncidentDirect(form, status) {
    if (saving || !form) return;
    saving = true;
    try {
      const data = new FormData(form);
      const incidents = readJSON(KEYS.incidents, []);
      const requestedId = String(data.get("incidentId") || form.dataset.savedIncidentId || "");
      const existingIndex = incidents.findIndex((item) => item.id === requestedId);
      const existing = existingIndex >= 0 ? incidents[existingIndex] : null;
      const now = new Date();
      const id = requestedId || `incident-${Date.now()}`;
      const incident = {
        id,
        shift: currentShift(),
        shiftKey: shiftKey(),
        type: String(data.get("type") || "Other"),
        status,
        startedAt: existing?.startedAt || localDateTime(String(data.get("started") || ""), now),
        endedAt: status === "resolved" ? localDateTime(String(data.get("ended") || ""), now) : "",
        summary: String(data.get("summary") || "").trim(),
        impact: String(data.get("impact") || "").trim(),
        notified: String(data.get("notified") || "").trim(),
        actions: String(data.get("actions") || "").trim(),
        delayed: String(data.get("delayed") || "").trim(),
        resolution: String(data.get("resolution") || "").trim(),
        createdAt: existing?.createdAt || now.toISOString(),
        updatedAt: now.toISOString()
      };

      if (existingIndex >= 0) incidents[existingIndex] = incident;
      else incidents.unshift(incident);
      writeJSON(KEYS.incidents, incidents.slice(0, 50));

      const reports = readJSON(KEYS.reports, []);
      reports.push(incidentSummary(incident));
      writeJSON(KEYS.reports, reports.slice(-50));

      const contexts = readJSON(KEYS.context, {});
      const current = contexts[shiftKey()] || {};
      contexts[shiftKey()] = {
        ...current,
        mode: modeForIncident(incident, current.mode),
        activeIncidentId: status === "active" ? id : (current.activeIncidentId === id ? "" : current.activeIncidentId || "")
      };
      writeJSON(KEYS.context, contexts);

      clearDraft();
      showConfirmation(form, incident);
      setStatus(status === "active" ? "Active incident saved" : "Resolved incident saved");
      navigator.vibrate?.(35);
      window.dispatchEvent(new CustomEvent("storepilot:incident-saved", { detail: incident }));
    } finally {
      setTimeout(() => { saving = false; }, 120);
    }
  }

  window.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-save-incident]");
    if (!button) return;
    const form = incidentFormFrom(button);
    if (!form) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    saveIncidentDirect(form, button.dataset.saveIncident === "resolved" ? "resolved" : "active");
  }, true);

  window.addEventListener("submit", (event) => {
    const form = event.target.closest?.("#command-incident-form");
    if (!form) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    saveIncidentDirect(form, "active");
  }, true);

  document.addEventListener("input", (event) => {
    const form = incidentFormFrom(event.target);
    if (form) scheduleDraft(form);
  }, true);

  document.addEventListener("change", (event) => {
    const form = incidentFormFrom(event.target);
    if (form) scheduleDraft(form);
  }, true);

  const observer = new MutationObserver(queueHydrate);
  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true });
    hydrateForms();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.StorePilotIncidentGuard = {
    saveDraft: () => saveDraft(document.querySelector("#command-incident-form, #report-form")),
    getDraft,
    clearDraft
  };
})();
