import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const index = read("index.html");
const manifest = JSON.parse(read("manifest.webmanifest"));
const runtime = read("js/app-runtime.js");
const controller = read("js/accessibility-controller.js");
const css = read("css/accessibility.css");
const shell = read("sw.js");
const packageJson = JSON.parse(read("package.json"));
const failures = [];

function pngSize(file) {
  const buffer = fs.readFileSync(file);
  const signature = buffer.subarray(0, 8).toString("hex");
  assert.equal(signature, "89504e470d0a1a0a", `${file} must be a PNG file`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const viewport = index.match(/<meta name="viewport" content="([^"]+)"/)?.[1] || "";
if (!viewport.includes("width=device-width") || !viewport.includes("viewport-fit=cover")) failures.push("Viewport must preserve device width and safe-area support.");
if (/maximum-scale|user-scalable\s*=\s*no/i.test(viewport)) failures.push("Viewport must not disable pinch-to-zoom.");
if (!index.includes('rel="apple-touch-icon"') || !index.includes("store-pilot-apple-180.png")) failures.push("Apple touch icon is not linked from index.html.");
if (!index.includes('./css/accessibility.css?v=command-center-28')) failures.push("Accessibility stylesheet is not loaded last by index.html.");
if (!index.includes('class="skip-link"') || !index.includes('href="#screen-card"')) failures.push("Keyboard skip link is missing.");
if (!index.includes('role="dialog" aria-modal="true" aria-labelledby="voice-sheet-title"')) failures.push("Quick Voice sheet is not exposed as a labelled modal dialog.");

const iconByPurpose = (purpose) => manifest.icons.filter((icon) => String(icon.purpose || "any").split(/\s+/).includes(purpose));
const anyIcons = iconByPurpose("any");
const maskableIcons = iconByPurpose("maskable");
if (!anyIcons.some((icon) => icon.type === "image/png" && icon.sizes === "192x192")) failures.push("Manifest needs a 192x192 PNG icon.");
if (!anyIcons.some((icon) => icon.type === "image/png" && icon.sizes === "512x512")) failures.push("Manifest needs a 512x512 PNG icon.");
if (!maskableIcons.some((icon) => icon.type === "image/png" && icon.sizes === "512x512")) failures.push("Manifest needs a 512x512 maskable PNG icon.");

assert.deepEqual(pngSize("icons/store-pilot-192.png"), { width: 192, height: 192 });
assert.deepEqual(pngSize("icons/store-pilot-512.png"), { width: 512, height: 512 });
assert.deepEqual(pngSize("icons/store-pilot-maskable-512.png"), { width: 512, height: 512 });
assert.deepEqual(pngSize("icons/store-pilot-apple-180.png"), { width: 180, height: 180 });

for (const asset of [
  "./icons/store-pilot-192.png",
  "./icons/store-pilot-512.png",
  "./icons/store-pilot-maskable-512.png",
  "./icons/store-pilot-apple-180.png",
  "./css/accessibility.css",
  "./js/accessibility-controller.js"
]) {
  if (!shell.includes(`"${asset}"`)) failures.push(`${asset} is missing from the offline shell.`);
}

if (!runtime.startsWith('import "./accessibility-controller.js?v=command-center-28";')) failures.push("Accessibility controller must load before the optional runtime UI modules.");
if (!runtime.includes('"accessibility-controller"')) failures.push("Accessibility controller is missing from runtime diagnostics.");
if (!controller.includes("event.key === \"Tab\"") || !controller.includes("event.key === \"Escape\"")) failures.push("Dialog controller must trap Tab and support Escape.");
if (!controller.includes('window.addEventListener("popstate"')) failures.push("Dialog controller must support the Android/browser back button.");
if (!controller.includes("history.pushState") || !controller.includes("history.back()")) failures.push("Dialog controller must create and remove modal history states.");
if (!controller.includes("returnFocus") || !controller.includes("focus({ preventScroll: true })")) failures.push("Dialog controller must restore and manage focus.");
if (controller.includes("setInterval(")) failures.push("Accessibility controller must not poll.");
if (/observe\(document\.body,\s*\{[^}]*subtree:\s*true/.test(controller)) failures.push("Accessibility controller must not observe the full document subtree.");

if (!css.includes(":focus-visible") || !css.includes("outline: 3px solid")) failures.push("Visible keyboard focus styling is missing.");
if (!css.includes("@media (pointer: coarse)") || !css.includes("min-height: 44px")) failures.push("Coarse-pointer touch target safeguards are missing.");
if (!css.includes("prefers-reduced-motion: reduce")) failures.push("Reduced-motion support is missing.");

for (const file of [
  "js/loretta-inbox.js",
  "js/start-shift-briefing.js",
  "js/proof-of-work-pack.js",
  "js/backup-restore.js",
  "js/interruption-timer.js"
]) {
  const source = read(file);
  if (!source.includes('role="dialog"') || !source.includes('aria-modal="true"') || !source.includes("aria-labelledby")) failures.push(`${file} must keep a labelled modal dialog.`);
}

if (!packageJson.scripts.test.includes("verify-pwa-accessibility.mjs")) failures.push("PWA accessibility verification is not included in npm test.");

if (failures.length) {
  console.error("\nPWA and accessibility verification failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("✓ Install icons include 192, 512, maskable, and Apple PNG assets");
console.log("✓ Pinch-to-zoom, focus visibility, touch targets, reduced motion, and skip navigation are protected");
console.log("✓ Modal focus trapping, Escape, focus restoration, and Android back behavior are centrally owned");
