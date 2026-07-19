import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const runtime = read("js/app-runtime.js");
const owner = read("js/notes-screen-controller.js");
const shell = read("sw.js");

const failures = [];
if (!runtime.includes('import "./notes-screen-controller.js?v=command-center-27"')) failures.push("Notes owner is not loaded by app-runtime.");
if (!runtime.includes('import "./notes-screen-style.js?v=command-center-27"')) failures.push("Notes owner style loader is not loaded.");
if (!owner.includes('data-notes-owner')) failures.push("Notes owner marker is missing.");
if (!owner.includes('id="loretta-notes-screen"')) failures.push("Notes owner must preserve the legacy screen ID so older renderers stand down.");
if (!owner.includes('id="daily-scratchpad"')) failures.push("Notes owner must render the Daily Scratchpad directly.");
if (!owner.includes('data-notes-add="note"') || !owner.includes('data-notes-add="task"')) failures.push("Notes owner must preserve both capture actions.");
for (const asset of ["./js/notes-screen-controller.js", "./js/notes-screen-style.js", "./css/notes-screen-controller.css"]) {
  if (!shell.includes(`"${asset}"`)) failures.push(`${asset} is missing from the offline shell.`);
}

if (failures.length) {
  console.error("\nNotes ownership verification failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("✓ Notes screen has one final owner while preserving Scratchpad and Loretta capture contracts");
