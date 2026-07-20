export const STORE_PILOT_EVENT_NAMES = Object.freeze({
  storage: "storepilot:storage-changed",
  tasks: "storepilot:tasks-changed",
  shift: "storepilot:shift-changed",
  incidents: "storepilot:incidents-changed",
  interruptions: "storepilot:interruptions-changed",
  notes: "storepilot:notes-changed",
  context: "storepilot:context-changed",
  proof: "storepilot:proof-changed",
  lorettaAway: "storepilot:loretta-away-changed",
  briefing: "storepilot:briefing-changed",
  reset: "storepilot:data-reset",
  screen: "storepilot:screen-changed",
  ready: "storepilot:app-ready"
});

const KEY_EVENTS = new Map([
  ["storePilot.completed.v6", [STORE_PILOT_EVENT_NAMES.tasks]],
  ["storePilot.customTasks.v6", [STORE_PILOT_EVENT_NAMES.tasks]],
  ["storePilot.taskStates.v6", [STORE_PILOT_EVENT_NAMES.tasks]],
  ["storePilot.templates.v7", [STORE_PILOT_EVENT_NAMES.tasks]],
  ["storePilot.taskChecklists.v1", [STORE_PILOT_EVENT_NAMES.tasks]],
  ["storePilot.activeTask.v8", [STORE_PILOT_EVENT_NAMES.tasks]],
  ["storePilot.shift.v6", [STORE_PILOT_EVENT_NAMES.shift, STORE_PILOT_EVENT_NAMES.tasks]],
  ["storePilot.incidents.v2", [STORE_PILOT_EVENT_NAMES.incidents]],
  ["storePilot.incidentDrafts.v1", [STORE_PILOT_EVENT_NAMES.incidents]],
  ["storePilot.incidentReportRefs.v1", [STORE_PILOT_EVENT_NAMES.incidents]],
  ["storePilot.reports.v6", [STORE_PILOT_EVENT_NAMES.incidents]],
  ["storePilot.interruptions.v1", [STORE_PILOT_EVENT_NAMES.interruptions]],
  ["storePilot.notes.v6", [STORE_PILOT_EVENT_NAMES.notes]],
  ["storePilot.lorettaNotes.v1", [STORE_PILOT_EVENT_NAMES.notes]],
  ["storePilot.dailyScratchpad.v1", [STORE_PILOT_EVENT_NAMES.notes]],
  ["storePilot.shiftContext.v2", [STORE_PILOT_EVENT_NAMES.context]],
  ["storePilot.proofPacks.v1", [STORE_PILOT_EVENT_NAMES.proof]],
  ["storePilot.lorettaAway.v1", [STORE_PILOT_EVENT_NAMES.lorettaAway]],
  ["storePilot.shiftBriefings.v1", [STORE_PILOT_EVENT_NAMES.briefing]]
]);

const RESET_EVENTS = Object.freeze([
  STORE_PILOT_EVENT_NAMES.storage,
  STORE_PILOT_EVENT_NAMES.reset,
  STORE_PILOT_EVENT_NAMES.tasks,
  STORE_PILOT_EVENT_NAMES.shift,
  STORE_PILOT_EVENT_NAMES.incidents,
  STORE_PILOT_EVENT_NAMES.interruptions,
  STORE_PILOT_EVENT_NAMES.notes,
  STORE_PILOT_EVENT_NAMES.context,
  STORE_PILOT_EVENT_NAMES.proof,
  STORE_PILOT_EVENT_NAMES.lorettaAway,
  STORE_PILOT_EVENT_NAMES.briefing
]);

export function eventsForStorageKey(key) {
  if (key === null || key === undefined) return [...RESET_EVENTS];
  return [...new Set([STORE_PILOT_EVENT_NAMES.storage, ...(KEY_EVENTS.get(String(key)) || [])])];
}
