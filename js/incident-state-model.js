export const INCIDENT_FIELDS = [
  "incidentId",
  "type",
  "started",
  "ended",
  "notified",
  "summary",
  "impact",
  "actions",
  "delayed",
  "resolution"
];

export const INCIDENT_SHIFT_LABELS = {
  morning: "Morning",
  mid: "Mid",
  close: "Close"
};

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  return String(value ?? "").trim();
}

export function parseLocalTime(timeValue, baseDate = new Date()) {
  const value = clean(timeValue);
  if (!/^\d{2}:\d{2}$/.test(value)) return new Date(baseDate);
  const [hour, minute] = value.split(":").map(Number);
  const result = new Date(baseDate);
  result.setHours(hour, minute, 0, 0);
  return result;
}

export function buildIncidentRecord({
  values,
  status,
  shift,
  shiftKey,
  existing = null,
  now = new Date(),
  idFactory = () => `incident-${Date.now()}-${Math.random().toString(16).slice(2)}`
}) {
  const source = asRecord(values);
  const requestedId = clean(source.incidentId) || clean(existing?.id);
  const startedBase = existing?.startedAt ? new Date(existing.startedAt) : now;
  const started = parseLocalTime(source.started, startedBase);
  let ended = null;

  if (status === "resolved") {
    ended = parseLocalTime(source.ended, started);
    if (ended < started) ended.setDate(ended.getDate() + 1);
  }

  return {
    id: requestedId || idFactory(),
    shift,
    shiftKey,
    type: clean(source.type) || "Other",
    status: status === "resolved" ? "resolved" : "active",
    startedAt: started.toISOString(),
    endedAt: ended ? ended.toISOString() : "",
    summary: clean(source.summary),
    impact: clean(source.impact),
    notified: clean(source.notified),
    actions: clean(source.actions),
    delayed: clean(source.delayed),
    resolution: clean(source.resolution),
    createdAt: existing?.createdAt || now.toISOString(),
    updatedAt: now.toISOString()
  };
}

export function upsertIncident(incidents, incident, limit = 50) {
  const next = [...asArray(incidents)];
  const existingIndex = next.findIndex((item) => item?.id === incident.id);
  if (existingIndex >= 0) next[existingIndex] = incident;
  else next.unshift(incident);
  return next.slice(0, limit);
}

export function incidentMode(incident, currentMode = "normal") {
  const text = `${incident?.type || ""} ${incident?.summary || ""}`;
  if (/short staff|call out/i.test(text)) return "short-staffed";
  if (/outage|system|power|register/i.test(text)) return "incident-recovery";
  return currentMode || "normal";
}

export function updateIncidentContext(contexts, shiftKey, incident) {
  const next = { ...asRecord(contexts) };
  const current = { ...asRecord(next[shiftKey]) };
  next[shiftKey] = {
    ...current,
    mode: incidentMode(incident, current.mode),
    activeIncidentId: incident.status === "active"
      ? incident.id
      : current.activeIncidentId === incident.id
        ? ""
        : current.activeIncidentId || ""
  };
  return next;
}

export function incidentReport(incident, shiftLabels = INCIDENT_SHIFT_LABELS) {
  const start = new Date(incident.startedAt).toLocaleString();
  const end = incident.endedAt ? new Date(incident.endedAt).toLocaleString() : "Still active";
  const shift = shiftLabels[incident.shift] || incident.shift;
  return `Incident update from Jamison - ${new Date(incident.updatedAt).toLocaleString()}\n\nShift: ${shift}\nType: ${incident.type}\nStatus: ${incident.status === "active" ? "Active" : "Resolved"}\nStarted: ${start}\nEnded: ${end}\n\nWhat happened:\n${incident.summary || "No summary entered."}\n\nOperational impact:\n${incident.impact || "Not listed."}\n\nWho was notified:\n${incident.notified || "Not listed."}\n\nActions taken:\n${incident.actions || "Not listed."}\n\nWork delayed or moved:\n${incident.delayed || "Not listed."}\n\nResolution / current status:\n${incident.resolution || "Still being worked."}`;
}

export function reportSignature(incident, shiftLabels = INCIDENT_SHIFT_LABELS) {
  const shift = shiftLabels[incident.shift] || incident.shift;
  return [
    `Shift: ${shift}`,
    `Type: ${incident.type}`,
    `Started: ${new Date(incident.startedAt).toLocaleString()}`
  ];
}

function matchesSignature(report, signature) {
  const text = String(report || "");
  return signature.every((part) => text.includes(part));
}

export function upsertIncidentReport({
  reports,
  references,
  incident,
  report,
  limit = 50,
  shiftLabels = INCIDENT_SHIFT_LABELS
}) {
  const source = [...asArray(reports)];
  const refs = { ...asRecord(references) };
  const previous = refs[incident.id];
  const signature = reportSignature(incident, shiftLabels);
  const matches = [];

  source.forEach((entry, index) => {
    if ((previous && entry === previous) || matchesSignature(entry, signature)) matches.push(index);
  });

  if (matches.length) {
    const replacementIndex = matches[matches.length - 1];
    const duplicateIndexes = new Set(matches.slice(0, -1));
    const nextReports = source
      .filter((_, index) => !duplicateIndexes.has(index))
      .map((entry, index) => {
        const adjustedReplacement = replacementIndex - matches.slice(0, -1).filter((value) => value < replacementIndex).length;
        return index === adjustedReplacement ? report : entry;
      });
    refs[incident.id] = report;
    return { reports: nextReports.slice(-limit), references: refs };
  }

  source.push(report);
  refs[incident.id] = report;
  return { reports: source.slice(-limit), references: refs };
}

export function clearIncidentDraft(drafts, shiftKey) {
  const next = { ...asRecord(drafts) };
  delete next[shiftKey];
  return next;
}
