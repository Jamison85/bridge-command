import assert from "node:assert/strict";
import fs from "node:fs";
import { STORE_PILOT_EVENT_NAMES, eventsForStorageKey } from "../js/store-pilot-event-map.js";

const read = (file) => fs.readFileSync(file, "utf8");
const index = read("index.html");
const runtime = read("js/app-runtime.js");
const service = read("js/store-pilot-events.js");
const finalNav = read("js/final-nav.js");
const taskStates = read("js/task-state-clarity.js");
const appShell = read("js/app-shell-controller.js");
const shell = read("sw.js");
const failures = [];

assert.deepEqual(eventsForStorageKey("storePilot.completed.v6"), [
  STORE_PILOT_EVENT_NAMES.storage,
  STORE_PILOT_EVENT_NAMES.tasks
]);
assert.deepEqual(eventsForStorageKey("storePilot.shift.v6"), [
  STORE_PILOT_EVENT_NAMES.storage,
  STORE_PILOT_EVENT_NAMES.shift,
  STORE_PILOT_EVENT_NAMES.tasks
]);
assert.ok(eventsForStorageKey("storePilot.incidents.v2").includes(STORE_PILOT_EVENT_NAMES.incidents));
assert.ok(eventsForStorageKey("storePilot.shiftContext.v2").includes(STORE_PILOT_EVENT_NAMES.context));
assert.ok(eventsForStorageKey(null).includes(STORE_PILOT_EVENT_NAMES.reset));
assert.deepEqual(eventsForStorageKey("storePilot.unknown.v1"), [STORE_PILOT_EVENT_NAMES.storage]);

const eventsEntry = index.indexOf('./js/store-pilot-events.js?v=command-center-28');
const incidentEntry = index.indexOf('./js/incident-controller.js?v=command-center-28');
const mainEntry = index.indexOf('./js/main-v8.js?v=command-center-28');
if (eventsEntry < 0) failures.push("Runtime event service is not loaded by index.html.");
if (!(eventsEntry < incidentEntry && eventsEntry < mainEntry)) failures.push("Runtime event service must load before application storage writers.");
if (!service.includes('import { STORE_PILOT_EVENT_NAMES, eventsForStorageKey } from "./store-pilot-event-map.js?v=command-center-28"')) failures.push("Runtime event service does not use the versioned event map.");
if (!service.includes("prototype.setItem") || !service.includes("prototype.removeItem") || !service.includes("prototype.clear")) failures.push("Same-window localStorage changes are not bridged.");
if (!service.includes('window.addEventListener("storage"')) failures.push("Cross-window storage changes are not bridged.");
if (!service.includes("new MutationObserver") || service.includes("observe(document.body")) failures.push("Screen events must use one narrow observer, never the full document body.");

for (const moduleName of ["store-pilot-event-map", "store-pilot-events"]) {
  if (!runtime.includes(`"${moduleName}"`)) failures.push(`${moduleName} is missing from runtime diagnostics.`);
}
for (const asset of ["./js/store-pilot-event-map.js", "./js/store-pilot-events.js"]) {
  if (!shell.includes(`"${asset}"`)) failures.push(`${asset} is missing from the offline shell.`);
}

if (finalNav.includes("setInterval(")) failures.push("Navigation accessibility still polls.");
if (!finalNav.includes("storepilot:screen-changed") || !finalNav.includes("storepilot:app-ready")) failures.push("Navigation accessibility is not event-driven.");
if (taskStates.includes("setInterval(")) failures.push("Task-state clarity still polls.");
for (const eventName of ["storepilot:tasks-changed", "storepilot:shift-changed", "storepilot:screen-changed"]) {
  if (!taskStates.includes(eventName)) failures.push(`Task-state clarity does not subscribe to ${eventName}.`);
}
if (appShell.includes("new MutationObserver")) failures.push("App Shell still owns a duplicate screen observer.");
if (!appShell.includes("window.StorePilotEvents.read")) failures.push("App Shell still owns a duplicate JSON reader instead of the shared service.");
for (const eventName of ["storepilot:screen-changed", "storepilot:shift-changed", "storepilot:context-changed", "storepilot:incidents-changed"]) {
  if (!appShell.includes(eventName)) failures.push(`App Shell does not subscribe to ${eventName}.`);
}

if (failures.length) {
  console.error("\nRuntime event verification failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("✓ Store Pilot storage keys map to explicit runtime domain events");
console.log("✓ Same-window and cross-window storage changes share one event bridge");
console.log("✓ Navigation, task-state clarity, and App Shell no longer poll or duplicate screen observers");
