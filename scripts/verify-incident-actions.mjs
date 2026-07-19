import assert from "node:assert/strict";
import {
  buildIncidentRecord,
  clearIncidentDraft,
  incidentMode,
  incidentReport,
  updateIncidentContext,
  upsertIncident,
  upsertIncidentReport
} from "../js/incident-state-model.js";

const shift = "close";
const shiftKey = "2026-07-18:close";
const now = new Date(2026, 6, 18, 23, 55, 0, 0);
const values = {
  incidentId: "",
  type: "Power outage",
  started: "23:50",
  ended: "00:15",
  notified: "Loretta, IT",
  summary: "Power failed and registers rebooted.",
  impact: "Registers unavailable.",
  actions: "Called support.",
  delayed: "Closing walk.",
  resolution: "Systems restored."
};

const active = buildIncidentRecord({
  values,
  status: "active",
  shift,
  shiftKey,
  now,
  idFactory: () => "incident-test"
});
assert.equal(active.id, "incident-test");
assert.equal(active.status, "active");
assert.equal(active.endedAt, "");
assert.equal(active.shiftKey, shiftKey);

const resolved = buildIncidentRecord({
  values: { ...values, incidentId: active.id },
  status: "resolved",
  shift,
  shiftKey,
  existing: active,
  now: new Date(2026, 6, 19, 0, 20, 0, 0)
});
assert.equal(resolved.id, active.id);
assert.equal(resolved.createdAt, active.createdAt);
assert.equal(resolved.status, "resolved");
assert.equal((new Date(resolved.endedAt) - new Date(resolved.startedAt)) / 60000, 25);

const incidentList = upsertIncident([active], resolved);
assert.equal(incidentList.length, 1);
assert.equal(incidentList[0].status, "resolved");

assert.equal(incidentMode(active, "normal"), "incident-recovery");
const shortStaffed = { ...active, type: "Short staffed", summary: "Two call outs." };
assert.equal(incidentMode(shortStaffed, "normal"), "short-staffed");

const activeContext = updateIncidentContext({ [shiftKey]: { mode: "normal", role: "manager" } }, shiftKey, active);
assert.equal(activeContext[shiftKey].activeIncidentId, active.id);
assert.equal(activeContext[shiftKey].mode, "incident-recovery");
const resolvedContext = updateIncidentContext(activeContext, shiftKey, resolved);
assert.equal(resolvedContext[shiftKey].activeIncidentId, "");
assert.equal(resolvedContext[shiftKey].mode, "incident-recovery");

const activeReport = incidentReport(active);
const firstReportState = upsertIncidentReport({
  reports: [],
  references: {},
  incident: active,
  report: activeReport
});
assert.equal(firstReportState.reports.length, 1);
assert.equal(firstReportState.references[active.id], activeReport);

const resolvedReport = incidentReport(resolved);
const updatedReportState = upsertIncidentReport({
  reports: [activeReport, activeReport],
  references: { [active.id]: activeReport },
  incident: resolved,
  report: resolvedReport
});
assert.equal(updatedReportState.reports.length, 1);
assert.equal(updatedReportState.reports[0], resolvedReport);
assert.equal(updatedReportState.references[active.id], resolvedReport);

const otherIncident = buildIncidentRecord({
  values: { ...values, type: "Customer incident", started: "22:10" },
  status: "active",
  shift,
  shiftKey,
  now,
  idFactory: () => "incident-other"
});
const otherReport = incidentReport(otherIncident);
const separateReports = upsertIncidentReport({
  reports: [resolvedReport],
  references: { [resolved.id]: resolvedReport },
  incident: otherIncident,
  report: otherReport
});
assert.equal(separateReports.reports.length, 2);

const drafts = clearIncidentDraft({
  [shiftKey]: { summary: "draft" },
  "2026-07-19:morning": { summary: "keep" }
}, shiftKey);
assert.equal(drafts[shiftKey], undefined);
assert.equal(drafts["2026-07-19:morning"].summary, "keep");

console.log("Incident action verification passed.");
