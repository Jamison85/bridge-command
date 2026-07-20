import assert from "node:assert/strict";
import fs from "node:fs";
import { shellPolicy } from "../js/app-shell-state-model.js";

const read = (file) => fs.readFileSync(file, "utf8");
const index = read("index.html");
const runtime = read("js/app-runtime.js");
const shell = read("sw.js");
const focused = read("css/focused-product.css");
const packageJson = JSON.parse(read("package.json"));
const failures = [];

const navButtons = [...index.matchAll(/class="nav-button[^"]*"[^>]*data-screen="([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(navButtons, ["next", "tasks", "report", "log"], "Daily navigation must contain only Today, Tasks, Incident, and Log");
assert.equal(shellPolicy("voice").screen, "next", "Retired Notes routes must normalize to Today");
assert.equal(shellPolicy("tasks").showQuickCapture, true, "Tasks must retain the single quick-capture route");

if (!runtime.includes('productMode: "focused-core"')) failures.push("Focused runtime mode is not declared.");
if (!runtime.includes('import "./loretta-inbox.js?v=command-center-28"')) failures.push("Date-aware Task and Loretta Note capture must remain active.");

for (const retired of [
  "feedback-layer",
  "manager-photo-checkin",
  "loretta-ui-fix",
  "daily-scratchpad",
  "notes-screen-style",
  "notes-screen-controller",
  "start-shift-briefing",
  "morning-manager-guidance",
  "loretta-win",
  "proof-of-work-pack"
]) {
  if (runtime.includes(`./${retired}.js`)) failures.push(`${retired} is still loaded by the production runtime.`);
}

for (const retiredStyle of [
  "feedback.css",
  "start-shift-briefing.css",
  "start-shift-briefing-compact.css",
  "proof-of-work-pack.css",
  "manager-photo-checkin.css",
  "daily-scratchpad.css",
  "morning-manager-guidance.css",
  "loretta-win.css"
]) {
  if (index.includes(retiredStyle)) failures.push(`${retiredStyle} is still loaded by index.html.`);
  if (shell.includes(`./css/${retiredStyle}`)) failures.push(`${retiredStyle} is still cached in the active offline shell.`);
}

for (const retiredScript of [
  "feedback-layer.js",
  "manager-photo-checkin.js",
  "loretta-ui-fix.js",
  "daily-scratchpad.js",
  "notes-screen-style.js",
  "notes-screen-controller.js",
  "start-shift-briefing.js",
  "morning-manager-guidance.js",
  "loretta-win.js",
  "proof-of-work-pack.js"
]) {
  if (shell.includes(`./js/${retiredScript}`)) failures.push(`${retiredScript} is still cached in the active offline shell.`);
}

const finalPosition = index.indexOf('./css/final-visual-system.css?v=command-center-28');
const focusedPosition = index.indexOf('./css/focused-product.css?v=command-center-28');
const accessibilityPosition = index.indexOf('./css/accessibility.css?v=command-center-28');
if (!(finalPosition < focusedPosition && focusedPosition < accessibilityPosition)) failures.push("Focused product CSS must load after visual polish and before accessibility safeguards.");
if (!shell.includes('"./css/focused-product.css"')) failures.push("Focused product CSS is missing from the offline shell.");
if (!focused.includes('--focused-nav-count: 4') || !focused.includes('.nav-button[data-screen="voice"]')) failures.push("Focused product CSS does not protect the four-screen boundary.");
if (!packageJson.scripts.test.includes("verify-focused-product.mjs")) failures.push("Focused product verification is not included in npm test.");

for (const key of [
  "storePilot.lorettaNotes.v1",
  "storePilot.dailyScratchpad.v1",
  "storePilot.proofPacks.v1"
]) {
  const repositoryText = [read("js/loretta-inbox.js"), read("js/backup-restore.js"), read("js/store-pilot-event-map.js")].join("\n");
  if (!repositoryText.includes(key)) failures.push(`${key} is no longer preserved by active storage or backup services.`);
}

if (failures.length) {
  console.error("\nFocused product verification failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("✓ Daily navigation is reduced to Today, Tasks, Incident, and Log");
console.log("✓ Duplicate briefing, advice, notes, photo, feedback, and proof modules are not production-reachable");
console.log("✓ Task and Loretta capture remains active while retired feature data stays preserved");