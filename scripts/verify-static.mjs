import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const note = (message) => console.log(`✓ ${message}`);
const fail = (message) => errors.push(message);
const exists = (file) => fs.existsSync(path.join(root, file));
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function localPath(reference, fromFile) {
  const value = String(reference || "").trim();
  if (!value || /^(?:https?:|data:|mailto:|tel:|#)/i.test(value)) return null;
  const clean = value.split(/[?#]/, 1)[0];
  if (!clean || clean === "./") return null;
  const base = clean.startsWith("/") ? clean.slice(1) : path.posix.join(path.posix.dirname(fromFile), clean);
  return path.posix.normalize(base).replace(/^\.\//, "");
}

function referencesFromHTML(html) {
  return [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
}

function importsFromJavaScript(source) {
  const imports = [];
  const staticPattern = /\bimport\s+(?:[^"'();]+?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicPattern = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const pattern of [staticPattern, dynamicPattern]) {
    for (const match of source.matchAll(pattern)) imports.push(match[1]);
  }
  return imports;
}

const index = read("index.html");
const runtime = read("js/app-runtime.js");
const pwa = read("js/pwa.js");
const serviceWorker = read("sw.js");
const manifest = JSON.parse(read("manifest.webmanifest"));

const release = runtime.match(/version:\s*["'](command-center-\d+)["']/)?.[1];
if (!release) fail("js/app-runtime.js does not declare a command-center release.");
else note(`Runtime release is ${release}`);

const cacheName = serviceWorker.match(/CACHE_NAME\s*=\s*["']([^"']+)["']/)?.[1];
if (release && cacheName !== `store-pilot-${release}`) {
  fail(`Service-worker cache is ${cacheName || "missing"}; expected store-pilot-${release}.`);
}

if (release && !pwa.includes(`./sw.js?v=${release}`)) fail("PWA registration version does not match the runtime release.");
if (release && !pwa.includes(`storePilot.pwaReloaded.${release}`)) fail("PWA reload guard does not match the runtime release.");

const indexReleaseTags = [...index.matchAll(/\?v=(command-center-\d+)/g)].map((match) => match[1]);
for (const version of indexReleaseTags) {
  if (release && version !== release) fail(`index.html contains stale asset version ${version}.`);
}

const shellBlock = serviceWorker.match(/const APP_SHELL\s*=\s*\[([\s\S]*?)\];/)?.[1] || "";
const shellReferences = [...shellBlock.matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
const shellAssets = shellReferences.map((reference) => localPath(reference, "sw.js")).filter(Boolean);
const shellSet = new Set(shellAssets);
if (shellSet.size !== shellAssets.length) fail("Service-worker APP_SHELL contains duplicate assets.");

for (const asset of shellAssets) {
  if (!exists(asset)) fail(`APP_SHELL references missing file: ${asset}`);
}

const indexAssets = referencesFromHTML(index)
  .map((reference) => localPath(reference, "index.html"))
  .filter(Boolean);
for (const asset of indexAssets) {
  if (!exists(asset)) fail(`index.html references missing file: ${asset}`);
  if (!shellSet.has(asset)) fail(`Index asset is not available in the offline shell: ${asset}`);
}

for (const icon of manifest.icons || []) {
  const asset = localPath(icon.src, "manifest.webmanifest");
  if (asset && !exists(asset)) fail(`Manifest icon is missing: ${asset}`);
  if (asset && !shellSet.has(asset)) fail(`Manifest icon is not available in the offline shell: ${asset}`);
}
if (manifest.display !== "standalone") fail("Manifest display mode must remain standalone.");
if (!manifest.start_url || !manifest.scope) fail("Manifest must define both start_url and scope.");

const entryJavaScript = indexAssets.filter((asset) => asset.endsWith(".js"));
const visited = new Set();
function crawlJavaScript(file) {
  if (visited.has(file)) return;
  visited.add(file);
  if (!exists(file)) return;
  const source = read(file);
  for (const reference of importsFromJavaScript(source)) {
    const imported = localPath(reference, file);
    if (!imported || !imported.endsWith(".js")) continue;
    if (!exists(imported)) {
      fail(`${file} imports missing module: ${imported}`);
      continue;
    }
    const taggedRelease = reference.match(/\?v=(command-center-\d+)/)?.[1];
    if (taggedRelease && release && taggedRelease !== release) {
      fail(`${file} imports ${imported} with stale version ${taggedRelease}.`);
    }
    crawlJavaScript(imported);
  }
}
entryJavaScript.forEach(crawlJavaScript);

for (const file of visited) {
  if (!shellSet.has(file)) fail(`Runtime JavaScript is missing from APP_SHELL: ${file}`);
}

if (!index.includes('link rel="manifest"')) fail("index.html is missing its manifest link.");
if (!index.includes('viewport-fit=cover')) fail("index.html must preserve viewport-fit=cover for the installed PWA.");

if (errors.length) {
  console.error("\nStore Pilot static verification failed:\n");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

note(`${indexAssets.length} index assets exist and are cached`);
note(`${visited.size} reachable JavaScript modules exist and are cached`);
note(`${shellAssets.length} offline-shell entries are valid`);
console.log("\nStore Pilot static verification passed.");
