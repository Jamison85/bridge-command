import assert from "node:assert/strict";
import {
  appendCustomTask,
  clearChecklistRecord,
  completeTaskRecords,
  normalizeTaskTitle,
  removeTaskArtifacts,
  reopenTaskRecords,
  setTaskStateRecord
} from "../js/task-action-model.js";

const shiftKey = "2026-07-18:morning";

assert.equal(normalizeTaskTitle("  Bookwork / SmartSafe match  "), "bookwork smartsafe match");
assert.equal(normalizeTaskTitle("BOOKWORK—SmartSafe match"), "bookwork smartsafe match");

const completedStart = { [shiftKey]: ["morning-walk"] };
const statesStart = {
  [shiftKey]: {
    bookwork: { type: "delayed", reason: "Register coverage" },
    lto: { type: "carry", reason: "Next shift" }
  }
};

const completed = completeTaskRecords(completedStart, statesStart, shiftKey, ["bookwork", "bookwork"]);
assert.deepEqual(completed.completedStore[shiftKey], ["morning-walk", "bookwork"]);
assert.equal(completed.stateStore[shiftKey].bookwork, undefined);
assert.equal(completed.stateStore[shiftKey].lto.type, "carry");
assert.deepEqual(completedStart[shiftKey], ["morning-walk"], "input completion records must not be mutated");

const reopened = reopenTaskRecords(completed.completedStore, completed.stateStore, shiftKey, "bookwork");
assert.deepEqual(reopened.completedStore[shiftKey], ["morning-walk"]);
assert.equal(reopened.stateStore[shiftKey].bookwork, undefined);

const delayed = setTaskStateRecord(reopened.stateStore, shiftKey, "bookwork", {
  type: "delayed",
  reason: "Customer rush",
  updatedAt: "2026-07-18T10:00:00.000Z"
});
assert.equal(delayed[shiftKey].bookwork.type, "delayed");
assert.equal(delayed[shiftKey].bookwork.reason, "Customer rush");

const checklists = {
  [shiftKey]: {
    lto: [true, true, true, true, true, true],
    "another-checklist": [true, false]
  }
};
const cleared = clearChecklistRecord(checklists, shiftKey, "lto");
assert.equal(cleared[shiftKey].lto, undefined);
assert.deepEqual(cleared[shiftKey]["another-checklist"], [true, false]);
assert.ok(checklists[shiftKey].lto, "input checklist records must not be mutated");

const artifacts = removeTaskArtifacts({
  completed: { [shiftKey]: ["custom-1", "morning-walk"] },
  states: { [shiftKey]: { "custom-1": { type: "carry" }, bookwork: { type: "delayed" } } },
  checklists: { [shiftKey]: { "custom-1": [true], lto: [false] } }
}, shiftKey, "custom-1");
assert.deepEqual(artifacts.completed[shiftKey], ["morning-walk"]);
assert.equal(artifacts.states[shiftKey]["custom-1"], undefined);
assert.equal(artifacts.states[shiftKey].bookwork.type, "delayed");
assert.equal(artifacts.checklists[shiftKey]["custom-1"], undefined);
assert.deepEqual(artifacts.checklists[shiftKey].lto, [false]);

const custom = appendCustomTask({}, "2026-07-18:mid", {
  id: "custom-carry",
  title: "Carry forward: Bookwork",
  area: "Carry Forward",
  minutes: 8
});
assert.equal(custom["2026-07-18:mid"].length, 1);
assert.equal(custom["2026-07-18:mid"][0].id, "custom-carry");

console.log("✓ completion is idempotent and clears task state");
console.log("✓ undo, delay, checklist cleanup, and deletion artifacts are stable");
console.log("✓ carry-forward custom task records preserve the expected shape");
console.log("\nStore Pilot task action verification passed.");
