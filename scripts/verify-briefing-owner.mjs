import fs from "node:fs";

const errors = [];
const note = (message) => console.log(`✓ ${message}`);
const fail = (message) => errors.push(message);
const read = (path) => fs.readFileSync(path, "utf8");

const runtime = read("js/app-runtime.js");
const briefing = read("js/start-shift-briefing.js");
const compactPath = "js/start-shift-briefing-compact.js";

if (fs.existsSync(compactPath)) fail("The superseded compact Briefing renderer still exists.");
if (runtime.includes("start-shift-briefing-compact")) fail("app-runtime.js still loads the compact Briefing renderer.");

const ownerImports = [...runtime.matchAll(/import\s+["']\.\/start-shift-briefing\.js/g)].length;
if (ownerImports !== 1) fail(`Expected one Shift Briefing runtime import; found ${ownerImports}.`);

if (!briefing.includes('const BRIEFING_VERSION = 2')) fail("The consolidated Briefing must use seen-record version 2.");
if (!briefing.includes('data-briefing-owner="${BRIEFING_RELEASE}"')) fail("The final Briefing markup does not declare its renderer owner.");
if (!briefing.includes('class="briefing-native-shell"')) fail("The direct renderer is missing the final compact shell.");
if (!briefing.includes("StorePilotMorningManagerGuidance?.analyze")) fail("The Briefing is not consuming the bookwork-priority analysis API.");
if (!briefing.includes("StorePilotMorningManagerGuidance?.wisdom")) fail("The Briefing is not consuming manager wisdom as data.");
if (!briefing.includes("StorePilotLorettaWin?.current")) fail("The Briefing is not consuming the current Loretta Win as data.");
if (!briefing.includes("data-manager-wisdom")) fail("The final Briefing markup is missing the manager wisdom component.");
if (!briefing.includes("data-loretta-win-card")) fail("The final Briefing markup is missing the Loretta Win component.");
if (!briefing.includes('event.key === "Escape"')) fail("The consolidated Briefing is missing Escape-to-close behavior.");

if (errors.length) {
  console.error("\nStore Pilot Briefing ownership verification failed:\n");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

note("one Shift Briefing renderer is active");
note("bookwork guidance, wisdom, and Loretta Win are rendered from data APIs");
note("Briefing versioning and keyboard close behavior are present");
console.log("\nStore Pilot Briefing ownership verification passed.");
