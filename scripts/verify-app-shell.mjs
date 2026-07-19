import assert from "node:assert/strict";
import fs from "node:fs";
import { shellPolicy, screenFromTitle } from "../js/app-shell-state-model.js";

const read = (file) => fs.readFileSync(file, "utf8");
const runtime = read("js/app-runtime.js");
const controller = read("js/app-shell-controller.js");
const css = read("css/app-shell-controller.css");
const index = read("index.html");
const shell = read("sw.js");
const failures = [];

assert.deepEqual(shellPolicy("next"), {
  screen: "next",
  showDashboard: true,
  showPrimaryShiftControls: true,
  showSecondaryStrip: false,
  showQuickCapture: false,
  safeAreaMode: "standard"
});
assert.equal(shellPolicy("tasks").showDashboard, false);
assert.equal(shellPolicy("tasks").showSecondaryStrip, true);
assert.equal(shellPolicy("tasks").showQuickCapture, true);
for (const screen of ["report", "log", "voice", "templates"]) {
  assert.equal(shellPolicy(screen).showDashboard, false, `${screen} must not show the full dashboard`);
  assert.equal(shellPolicy(screen).showSecondaryStrip, true, `${screen} must show the compact strip`);
  assert.equal(shellPolicy(screen).showQuickCapture, false, `${screen} must hide floating capture`);
}
assert.equal(screenFromTitle("Templates"), "templates");
assert.equal(screenFromTitle("End-of-Day"), "log");
assert.equal(screenFromTitle("Incident Report"), "report");

if (!runtime.includes('import "./app-shell-controller.js?v=command-center-28"')) failures.push("App Shell controller is not loaded by app-runtime.");
if (!runtime.includes('"app-shell-state-model"') || !runtime.includes('"app-shell-controller"')) failures.push("App Shell modules are missing from runtime diagnostics.");
if (!index.includes('./css/app-shell-controller.css?v=command-center-28')) failures.push("App Shell stylesheet is not loaded by index.html.");
for (const asset of ["./css/app-shell-controller.css", "./js/app-shell-state-model.js", "./js/app-shell-controller.js"]) {
  if (!shell.includes(`"${asset}"`)) failures.push(`${asset} is missing from the offline shell.`);
}
if (!controller.includes("data-shell-shift") || !controller.includes('.shift-button[data-shift=')) failures.push("Compact shift controls do not proxy to the real shift selector.");
if (!controller.includes("data-shell-context-edit") || !controller.includes("shell-context-open")) failures.push("Compact context editing is not preserved.");
if (controller.includes("setInterval(")) failures.push("App Shell controller must not poll.");
if (/observe\(document\.body/.test(controller)) failures.push("App Shell controller must not observe the full document body.");
if (!css.includes('[data-store-pilot-screen]:not([data-store-pilot-screen="next"]) .dashboard-grid')) failures.push("Secondary screens do not hide the full dashboard.");
if (!css.includes('[data-store-pilot-screen="tasks"] .quick-capture-stack')) failures.push("Tasks does not own the floating capture control.");
if (!css.includes('env(safe-area-inset-bottom)')) failures.push("App Shell safe-area spacing is missing.");

if (failures.length) {
  console.error("\nApp Shell verification failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("✓ Next owns the full dashboard; secondary screens use one compact shift/context strip");
console.log("✓ Floating capture is limited to Tasks with explicit safe-area spacing");
