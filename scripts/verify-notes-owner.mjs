import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const runtime = read("js/app-runtime.js");
const owner = read("js/notes-screen-controller.js");
const loretta = read("js/loretta-inbox.js");
const scratchpad = read("js/daily-scratchpad.js");
const shell = read("sw.js");

const failures = [];
if (!runtime.includes('import "./notes-screen-controller.js?v=command-center-27"')) failures.push("Notes owner is not loaded by app-runtime.");
if (!runtime.includes('import "./notes-screen-style.js?v=command-center-27"')) failures.push("Notes owner style loader is not loaded.");
if (!owner.includes("data-notes-owner")) failures.push("Notes owner marker is missing.");
if (!owner.includes('id="loretta-notes-screen"')) failures.push("Notes owner must preserve the legacy screen ID.");
if (!owner.includes('id="daily-scratchpad"')) failures.push("Notes owner must render the Daily Scratchpad directly.");
if (!owner.includes('data-notes-add="note"') || !owner.includes('data-notes-add="task"')) failures.push("Notes owner must preserve both capture actions.");

for (const [name, source] of [["Loretta Inbox", loretta], ["Daily Scratchpad", scratchpad]]) {
  if (source.includes("renderNotesScreen") || source.includes("ensureScratchpad")) failures.push(`${name} still contains a Notes-screen renderer.`);
  if (source.includes('insertAdjacentHTML("afterbegin"') || source.includes("content.innerHTML")) failures.push(`${name} still injects Notes markup.`);
  if (/MutationObserver[\s\S]{0,250}document\.body/.test(source)) failures.push(`${name} still observes the entire document body.`);
}
if (!loretta.includes("window.StorePilotLorettaInbox")) failures.push("Loretta capture service API is missing.");
if (!scratchpad.includes("window.StorePilotScratchpad")) failures.push("Scratchpad service API is missing.");
if (!scratchpad.includes('storepilot:notes-rendered')) failures.push("Scratchpad does not react to the owner render event.");

for (const asset of ["./js/notes-screen-controller.js", "./js/notes-screen-style.js", "./css/notes-screen-controller.css"]) {
  if (!shell.includes(`"${asset}"`)) failures.push(`${asset} is missing from the offline shell.`);
}

if (failures.length) {
  console.error("\nNotes ownership verification failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("✓ Notes markup has one owner; Scratchpad and Loretta Inbox are service-only modules");
