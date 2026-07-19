import fs from "node:fs";

const fixturePath = "tests/fixtures/store-pilot-storage.json";
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

assert(fixture.format === "store-pilot-storage-fixture", "Fixture format is invalid.");
assert(fixture.schemaVersion === 1, "Fixture schemaVersion must be 1.");
assert(/^\d{4}-\d{2}-\d{2}:(morning|mid|close)$/.test(fixture.shiftKey || ""), "Fixture shiftKey is invalid.");
assert(isRecord(fixture.storage), "Fixture storage must be an object of raw localStorage strings.");

const requiredKeys = [
  "storePilot.shift.v6",
  "storePilot.templates.v7",
  "storePilot.completed.v6",
  "storePilot.customTasks.v6",
  "storePilot.taskStates.v6",
  "storePilot.shiftContext.v2",
  "storePilot.incidents.v2",
  "storePilot.incidentDrafts.v1",
  "storePilot.reports.v6",
  "storePilot.dailyScratchpad.v1",
  "storePilot.taskChecklists.v1",
  "storePilot.lorettaNotes.v1",
  "storePilot.interruptions.v1",
  "storePilot.proofPacks.v1",
  "storePilot.lorettaWin.v1",
  "storePilot.lorettaAway.v1",
  "storePilot.lastBackupAt.v1"
];

for (const key of requiredKeys) assert(key in fixture.storage, `Fixture is missing ${key}.`);

const parsed = {};
for (const [key, raw] of Object.entries(fixture.storage || {})) {
  assert(key.startsWith("storePilot."), `Unexpected non-Store-Pilot key: ${key}`);
  assert(typeof raw === "string", `${key} must contain the raw localStorage string.`);
  try {
    parsed[key] = JSON.parse(raw);
  } catch (error) {
    errors.push(`${key} contains malformed JSON: ${error.message}`);
  }
}

assert(["morning", "mid", "close"].includes(parsed["storePilot.shift.v6"]), "Saved shift is invalid.");
const templates = parsed["storePilot.templates.v7"];
assert(isRecord(templates), "Templates must be an object.");
for (const shift of ["morning", "mid", "close"]) {
  assert(Array.isArray(templates?.[shift]), `Templates must include a ${shift} array.`);
}
assert(Array.isArray(parsed["storePilot.completed.v6"]?.[fixture.shiftKey]), "Completed IDs must be an array for the fixture shift.");
assert(Array.isArray(parsed["storePilot.customTasks.v6"]?.[fixture.shiftKey]), "Custom tasks must be an array for the fixture shift.");
assert(isRecord(parsed["storePilot.taskStates.v6"]?.[fixture.shiftKey]), "Task states must be an object for the fixture shift.");
assert(isRecord(parsed["storePilot.shiftContext.v2"]?.[fixture.shiftKey]), "Shift context must be an object for the fixture shift.");
assert(Array.isArray(parsed["storePilot.incidents.v2"]), "Incidents must be an array.");
assert(Array.isArray(parsed["storePilot.reports.v6"]), "Reports must be an array.");
assert(typeof parsed["storePilot.dailyScratchpad.v1"]?.[fixture.shiftKey]?.text === "string", "Scratchpad text must survive parsing.");
const checklist = parsed["storePilot.taskChecklists.v1"]?.[fixture.shiftKey]?.lto;
assert(Array.isArray(checklist) && checklist.length === 6 && checklist.every((value) => typeof value === "boolean"), "Photo checklist must contain six booleans.");
assert(Array.isArray(parsed["storePilot.lorettaNotes.v1"]), "Loretta notes must be an array.");
assert(Array.isArray(parsed["storePilot.interruptions.v1"]), "Interruptions must be an array.");
assert(Array.isArray(parsed["storePilot.proofPacks.v1"]), "Proof packs must be an array.");
assert(isRecord(parsed["storePilot.lorettaAway.v1"]), "Loretta Away data must be an object.");
assert(!Number.isNaN(new Date(parsed["storePilot.lastBackupAt.v1"]).getTime()), "Last backup timestamp must be valid.");

const blockedKeys = new Set(["__proto__", "prototype", "constructor"]);
function inspectObject(value, trail = "storage") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert(!blockedKeys.has(key), `Blocked object key found at ${trail}.${key}.`);
    inspectObject(child, `${trail}.${key}`);
  }
}
inspectObject(parsed);

function checksum(storage) {
  const text = JSON.stringify(storage);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

const sortedStorage = Object.fromEntries(Object.entries(fixture.storage).sort(([left], [right]) => left.localeCompare(right)));
const payload = {
  format: "store-pilot-backup",
  schemaVersion: 1,
  appVersion: "command-center-fixture",
  createdAt: "2026-07-18T14:10:00.000Z",
  kind: "test",
  source: "Store Pilot quality check",
  checksum: checksum(sortedStorage),
  storage: sortedStorage
};
const restoredPayload = JSON.parse(JSON.stringify(payload));
assert(restoredPayload.checksum === checksum(restoredPayload.storage), "Backup checksum changed during JSON round trip.");
assert(JSON.stringify(restoredPayload.storage) === JSON.stringify(sortedStorage), "Backup storage changed during JSON round trip.");
for (const raw of Object.values(restoredPayload.storage)) JSON.parse(raw);

if (errors.length) {
  console.error("\nStore Pilot storage verification failed:\n");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`✓ ${Object.keys(sortedStorage).length} Store Pilot data groups parsed`);
console.log("✓ Core task, incident, notes, checklist, and proof shapes are valid");
console.log(`✓ Backup round trip preserved checksum ${payload.checksum}`);
console.log("\nStore Pilot storage verification passed.");
