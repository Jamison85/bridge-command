import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const index = read("index.html");
const css = read("css/final-visual-system.css");
const accessibility = read("css/accessibility.css");
const landing = read("css/landing-no-scroll.css");
const shell = read("sw.js");
const packageJson = JSON.parse(read("package.json"));
const failures = [];

function hexToRgb(hex) {
  const clean = String(hex).replace("#", "");
  assert.match(clean, /^[0-9a-f]{6}$/i);
  return [0, 2, 4].map((offset) => Number.parseInt(clean.slice(offset, offset + 2), 16));
}

function luminance(hex) {
  const channels = hexToRgb(hex).map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

function token(name) {
  return css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1] || "";
}

const finalHref = './css/final-visual-system.css?v=command-center-28';
const accessibilityHref = './css/accessibility.css?v=command-center-28';
const appShellHref = './css/app-shell-controller.css?v=command-center-28';
const finalPosition = index.indexOf(finalHref);
const accessibilityPosition = index.indexOf(accessibilityHref);
const appShellPosition = index.indexOf(appShellHref);

if (finalPosition < 0) failures.push("Final visual system is not loaded by index.html.");
if (!(appShellPosition < finalPosition && finalPosition < accessibilityPosition)) {
  failures.push("Final visual system must load after App Shell layout and before accessibility safeguards.");
}
if (!shell.includes('"./css/final-visual-system.css"')) failures.push("Final visual system is missing from the offline shell.");
if (!packageJson.scripts.test.includes("verify-final-visual-system.mjs")) failures.push("Final visual verification is not included in npm test.");

for (const required of [
  "--surface-page",
  "--surface-card",
  "--border-soft",
  "--radius-card",
  ".hero-card",
  ".screen-card",
  ".task-row",
  ".secondary-shell-strip",
  ".notes-capture-panel",
  ".log-summary-card",
  ".bottom-nav",
  ".loretta-capture-card",
  "@media (prefers-contrast: more)"
]) {
  if (!css.includes(required)) failures.push(`Final visual system is missing ${required}.`);
}

for (const forbidden of [
  /height:\s*100dvh/i,
  /min-height:\s*100vh/i,
  /overflow:\s*hidden/i,
  /position:\s*fixed/i,
  /grid-template-rows/i,
  /display:\s*none/i,
  /touch-action/i,
  /user-scalable/i,
  /maximum-scale/i
]) {
  if (forbidden.test(css)) failures.push(`Final visual system contains prohibited behavior rule: ${forbidden}`);
}

if (!landing.includes('body:has(.nav-button[data-screen="next"].active)')) failures.push("Next no-scroll ownership is no longer present in landing-no-scroll.css.");
if (!accessibility.includes(":focus-visible") || !accessibility.includes("min-height: 44px")) failures.push("Accessibility must remain the final owner of focus and touch safeguards.");

for (const legacy of ["#f6efe3", "#efe5d5", "#fffaf1"]) {
  if (css.toLowerCase().includes(legacy)) failures.push(`Final visual system reintroduced legacy cream ${legacy}.`);
}

const ink = token("--ink");
const muted = token("--muted");
const forest = token("--forest");
const copper = token("--copper");
assert.ok(ink && muted && forest && copper, "Core visual tokens must be six-digit hex colors");
assert.ok(contrast(ink, "#ffffff") >= 7, "Primary text must meet enhanced contrast on white");
assert.ok(contrast(muted, "#ffffff") >= 4.5, "Muted text must meet normal text contrast on white");
assert.ok(contrast("#ffffff", forest) >= 4.5, "White action text must contrast against forest green");
assert.ok(contrast(copper, "#ffffff") >= 4.5, "Copper eyebrow text must contrast against white");

if (failures.length) {
  console.error("\nFinal visual system verification failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("✓ Final visual tokens, surfaces, typography, controls, and dialogs use one coherent system");
console.log("✓ Next layout, scrolling, screen visibility, touch behavior, and accessibility remain outside visual ownership");
console.log("✓ Core text and action color pairs meet WCAG contrast targets");
