import fs from "node:fs";
import assert from "node:assert/strict";
import { buildLogState, logRiskStatus, logStatusSummary } from "../js/log-state-model.js";

const read = (file) => fs.readFileSync(file, "utf8");
const runtime = read("js/app-runtime.js");
const reviewLayer = read("js/review-layer.js");
const controller = read("js/log-screen-controller.js");
const shell = read("sw.js");
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

const sixOpen = buildLogState({
  shift: "morning",
  dateKey: "2026-07-19",
  templates: { morning: Array.from({ length: 6 }, (_, index) => ({ id: `task-${index + 1}`, title: `Task ${index + 1}` })) },
  customTasks: {},
  completed: {},
  taskStates: {}
});
assert.equal(sixOpen.counts.open, 6);
assert.equal(sixOpen.counts.documented, 0);
assert.equal(logStatusSummary(sixOpen), "0 done • 0 documented • 6 still open");

const mixed = buildLogState({
  shift: "morning",
  dateKey: "2026-07-19",
  templates: {
    morning: [
      { id: "done", title: "Done" },
      { id: "delayed", title: "Delayed" },
      { id: "carry", title: "Carry" },
      { id: "open", title: "Open" },
      { id: "stale", title: "Completed with stale state" }
    ]
  },
  completed: { "2026-07-19:morning": ["done", "stale"] },
  taskStates: {
    "2026-07-19:morning": {
      delayed: { type: "delayed", reason: "Coverage" },
      carry: { type: "carry", reason: "Tomorrow" },
      stale: { type: "delayed", reason: "Old state" }
    }
  }
});
assert.deepEqual(mixed.counts, { total: 5, done: 2, delayed: 1, carried: 1, documented: 2, open: 1, followups: 3 });
assert.equal(mixed.done.some((task) => task.id === "stale"), true);
assert.equal(mixed.delayed.some((task) => task.id === "stale"), false);

const duplicate = buildLogState({
  shift: "morning",
  dateKey: "2026-07-19",
  templates: { morning: [{ id: "same", title: "Template title" }] },
  customTasks: { "2026-07-19:morning": [{ id: "same", title: "Custom title" }] }
});
assert.equal(duplicate.tasks.length, 1);
assert.equal(duplicate.tasks[0].title, "Custom title");

const urgent = buildLogState({
  shift: "morning",
  dateKey: "2026-07-19",
  templates: { morning: [{ id: "outage", title: "Register down" }] }
});
assert.equal(logRiskStatus(urgent), "red");
assert.equal(logRiskStatus(buildLogState({ shift: "morning", dateKey: "2026-07-19" })), "green");

check(runtime.includes('import "./log-screen-controller.js?v=command-center-28"'), "The single Log controller is not loaded by app-runtime.");
check(!runtime.includes("review-layer-variety"), "The duplicate review renderer is still loaded by app-runtime.");
check(!runtime.includes("runtime-clean-bridge"), "The polling Log bridge is still loaded by app-runtime.");
check(!runtime.includes('import "./shift-brain.js'), "The old Smart Shift Brain DOM injector is still loaded.");
check(!reviewLayer.includes("review-template-aware"), "review-layer still loads the old Log renderer.");
check(controller.includes("data-log-owner"), "The Log owner marker is missing.");
check(controller.includes("counts.documented"), "The Log controller does not use the tested documented count.");
check(!controller.includes("documented ||"), "The Log controller contains the open-as-documented fallback.");
check(!controller.includes("setInterval("), "The Log owner must not poll on an interval.");
check(shell.includes('"./js/log-state-model.js"'), "The Log state model is missing from the offline shell.");
check(shell.includes('"./js/log-screen-controller.js"'), "The Log controller is missing from the offline shell.");

if (failures.length) {
  console.error("\nLog ownership verification failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("✓ Log status math keeps open work separate from documented work");
console.log("✓ Log markup has one production owner without polling patch layers");
