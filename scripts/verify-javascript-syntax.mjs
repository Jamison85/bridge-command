import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const targets = ["js", "scripts"];
const files = [];

function collect(directory) {
  const absolute = path.join(root, directory);
  if (!fs.existsSync(absolute)) return;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) collect(relative);
    else if (/\.(?:js|mjs)$/.test(entry.name)) files.push(relative);
  }
}

targets.forEach(collect);
files.sort();

const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: root,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    failures.push(`${file}\n${result.stderr || result.stdout || "Unknown parse error"}`);
  }
}

if (failures.length) {
  console.error("\nStore Pilot JavaScript syntax verification failed:\n");
  failures.forEach((failure) => console.error(`${failure}\n`));
  process.exit(1);
}

console.log(`✓ ${files.length} JavaScript files parsed successfully`);
console.log("\nStore Pilot JavaScript syntax verification passed.");
