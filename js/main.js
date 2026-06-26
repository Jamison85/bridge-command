import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { createBridgeControls } from "./controls.js";
import { createAudioController } from "./audio.js";
import { createStorePilot } from "./storePilot.js";
import { createBridgeEnvironment } from "./bridgeScene.js";
import { createCinematicLighting } from "./lighting.js";
import { createCockpitScreens } from "./cockpitScreens.js";

const CONFIG = {
  pixelRatioCap: 1.65,
  bloomStrength: 1.18,
  bloomRadius: 0.76,
  bloomThreshold: 0.14,
  starCount: 1100,
  warpLineCount: 160
};

const canvas = document.querySelector("#bridge-canvas");

const ui = {
  bootMessage: document.querySelector("#boot-message"),
  beginButton: document.querySelector("#begin-button"),
  systemStatusText: document.querySelector("#system-status-text"),
  displayTitle: document.querySelector("#display-title"),
  displayCopy: document.querySelector("#display-copy"),
  throttleReadout: document.querySelector("#throttle-readout"),
  modeReadout: document.querySelector("#mode-readout"),
  focusReadout: document.querySelector("#focus-readout"),
  pilotPanel: document.querySelector("#pilot-panel"),
  hudButtons: document.querySelectorAll(".hud-button")
};

const state = {
  width: window.innerWidth,
  height: window.innerHeight,
  clock: new THREE.Clock(),
  throttle: 0,
  warpActive: false,
  activeCommand: "next"
};

let renderer;
let scene;
let camera;
let composer;
let bridgeEnvironment;
let cinematicLighting;
let cockpitScreens;
let bridgeControls;
let storePilot;
let audio;
let starfield;
let warpLines;

init();

function init() {
  try {
    if (!canvas) {
      throw new Error("Bridge canvas was not found.");
    }

    setupRenderer();
    setupScene();
    setupCamera();
    setupPostProcessing();

    bridgeEnvironment = createBridgeEnvironment(scene);
    cinematicLighting = createCinematicLighting(scene);
    createStarfield();
    createWarpStreaks();
    cockpitScreens = createCockpitScreens(scene);

    audio = createAudioController();

    storePilot = createStorePilot({
      panel: ui.pilotPanel,
      onDisplay: applyDisplayContent,
      onStatus: updateStatus
    });

    bridgeControls = createBridgeControls({
      scene,
      canvas,
      camera,
      callbacks: {
        onCommand: handleConsoleCommand,
        onLeverGrab: handleLeverGrab,
        onThrottleChange: handleThrottleChange,
        onWarpEngage: triggerWarp,
        onWarpDisengage: disengageWarp
      }
    });

    bindUIEvents();
    bindResizeEvent();
    storePilot.render("next");
    applyDisplayContent(storePilot.getScreenContent("next"));
    animate();
  } catch (error) {
    console.error("Bridge simulator failed to initialize:", error);
    showFatalError();
  }
}

function setupRenderer() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance"
  });

  renderer.setSize(state.width, state.height);
  renderer.setPixelRatio(getSafePixelRatio());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020612);
  scene.fog = new THREE.FogExp2(0x030711, 0.028);
}

function setupCamera() {
  camera = new THREE.PerspectiveCamera(62, state.width / state.height, 0.1, 320);
  camera.position.set(0, 1.38, 6.35);
  camera.lookAt(0, 1.16, -0.05);
}

function setupPostProcessing() {
  composer = new EffectComposer(renderer);
  composer.setPixelRatio(getSafePixelRatio());
  composer.setSize(state.width, state.height);

  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(state.width, state.height),
    CONFIG.bloomStrength,
    CONFIG.bloomRadius,
    CONFIG.bloomThreshold
  );

  composer.addPass(renderPass);
  composer.addPass(bloomPass);
}

function createStarfield() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(CONFIG.starCount * 3);
  const colors = new Float32Array(CONFIG.starCount * 3);

  for (let i = 0; i < CONFIG.starCount; i += 1) {
    const index = i * 3;

    positions[index] = THREE.MathUtils.randFloatSpread(120);
    positions[index + 1] = THREE.MathUtils.randFloatSpread(64) + 9;
    positions[index + 2] = THREE.MathUtils.randFloat(-210, -18);

    const brightness = THREE.MathUtils.randFloat(0.42, 1);
    colors[index] = brightness * 0.58;
    colors[index + 1] = brightness * 0.84;
    colors[index + 2] = brightness;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.075,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false
  });

  starfield = new THREE.Points(geometry, material);
  scene.add(starfield);
}

function createWarpStreaks() {
  const positions = new Float32Array(CONFIG.warpLineCount * 2 * 3);
  const speeds = [];

  for (let i = 0; i < CONFIG.warpLineCount; i += 1) {
    const index = i * 6;
    const x = THREE.MathUtils.randFloatSpread(88);
    const y = THREE.MathUtils.randFloatSpread(46) + 6;
    const z = THREE.MathUtils.randFloat(-165, -24);
    const length = THREE.MathUtils.randFloat(1.6, 6.2);

    positions[index] = x;
    positions[index + 1] = y;
    positions[index + 2] = z;

    positions[index + 3] = x;
    positions[index + 4] = y;
    positions[index + 5] = z + length;

    speeds.push(THREE.MathUtils.randFloat(24, 64));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.userData.speeds = speeds;

  const material = new THREE.LineBasicMaterial({
    color: 0x9af7ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  warpLines = new THREE.LineSegments(geometry, material);
  scene.add(warpLines);
}

function bindUIEvents() {
  ui.beginButton?.addEventListener("click", async () => {
    await audio.unlock();
    ui.bootMessage?.classList.add("hidden");
    openCommand("next");
  });

  ui.hudButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      await audio.unlock();
      audio.playClick();
      const command = button.dataset.command;
      bridgeControls?.pulseCommand(command);
      openCommand(command);
    });
  });
}

function bindResizeEvent() {
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("orientationchange", onResize, { passive: true });
}

async function handleConsoleCommand(command) {
  await audio.unlock();
  audio.playClick();
  openCommand(command);
}

async function handleLeverGrab() {
  await audio.unlock();
  applyDisplayContent({
    title: "Throttle Control",
    copy: "Drag upward to increase engine output. Push beyond 82% to engage warp streaks and cockpit light surge.",
    mode: "Manual",
    focus: "High"
  });
}

function openCommand(command) {
  state.activeCommand = command;
  const content = storePilot.getScreenContent(command);
  applyDisplayContent(content);
  storePilot.render(command);
}

function handleThrottleChange(value) {
  state.throttle = value;
  audio.setThrottle(value);
  ui.throttleReadout.textContent = `${Math.round(value * 100)}%`;
}

function applyDisplayContent({ title, copy, mode, focus }) {
  ui.displayTitle.textContent = title;
  ui.displayCopy.textContent = copy;
  ui.modeReadout.textContent = mode;
  ui.focusReadout.textContent = focus;

  cockpitScreens?.updateContent({ title, copy, mode, focus });
}

function updateStatus(message) {
  if (!message) return;
  ui.systemStatusText.textContent = message;

  window.clearTimeout(updateStatus.timeoutId);
  updateStatus.timeoutId = window.setTimeout(() => {
    ui.systemStatusText.textContent = state.warpActive ? "Warp Engaged" : "Systems Ready";
  }, 1500);
}

function triggerWarp() {
  state.warpActive = true;
  document.body.classList.add("warping");
  ui.systemStatusText.textContent = "Warp Engaged";
  audio.playWarp();

  applyDisplayContent({
    title: "Warp Threshold",
    copy: "Cockpit lighting surge engaged. Store bridge at full burn. Try not to launch the pizza warmer into Saturn.",
    mode: "Warp",
    focus: "Maximum"
  });
}

function disengageWarp() {
  state.warpActive = false;
  document.body.classList.remove("warping");
  ui.systemStatusText.textContent = "Systems Ready";

  const content = storePilot.getScreenContent(state.activeCommand);
  applyDisplayContent(content);
}

function onResize() {
  state.width = window.innerWidth;
  state.height = window.innerHeight;

  camera.aspect = state.width / state.height;
  camera.updateProjectionMatrix();

  const pixelRatio = getSafePixelRatio();
  renderer.setSize(state.width, state.height);
  renderer.setPixelRatio(pixelRatio);

  composer.setSize(state.width, state.height);
  composer.setPixelRatio(pixelRatio);
}

function animate() {
  const delta = Math.min(state.clock.getDelta(), 0.033);
  const elapsed = state.clock.elapsedTime;

  const throttle = bridgeControls.update(delta);
  const visualState = { throttle, warpActive: state.warpActive };

  updateStarfield(delta, elapsed, throttle);
  updateWarp(delta, elapsed);
  bridgeEnvironment.update(delta, elapsed, visualState);
  cinematicLighting.update(delta, elapsed, visualState);
  cockpitScreens.update(delta, elapsed, visualState);
  updateCameraMotion(elapsed, throttle);

  composer.render();
  requestAnimationFrame(animate);
}

function updateStarfield(delta, elapsed, throttle) {
  if (!starfield) return;

  const positions = starfield.geometry.attributes.position.array;
  const speed = THREE.MathUtils.lerp(2.6, 34, throttle);

  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 2] += speed * delta;

    if (positions[i + 2] > 7) {
      positions[i] = THREE.MathUtils.randFloatSpread(120);
      positions[i + 1] = THREE.MathUtils.randFloatSpread(64) + 9;
      positions[i + 2] = THREE.MathUtils.randFloat(-210, -150);
    }
  }

  starfield.rotation.z = Math.sin(elapsed * 0.08) * 0.008;
  starfield.geometry.attributes.position.needsUpdate = true;
}

function updateWarp(delta, elapsed) {
  if (!warpLines) return;

  const material = warpLines.material;
  const geometry = warpLines.geometry;
  const positions = geometry.attributes.position.array;
  const speeds = geometry.userData.speeds;

  const targetOpacity = state.warpActive ? 0.88 : 0;
  material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.08);

  if (material.opacity < 0.01) return;

  for (let i = 0; i < speeds.length; i += 1) {
    const index = i * 6;
    const speed = speeds[i] * (state.warpActive ? 3.6 : 0.7);

    positions[index + 2] += speed * delta;
    positions[index + 5] += speed * delta;

    if (positions[index + 2] > 14) {
      const x = THREE.MathUtils.randFloatSpread(88);
      const y = THREE.MathUtils.randFloatSpread(46) + 6;
      const z = THREE.MathUtils.randFloat(-180, -120);
      const length = THREE.MathUtils.randFloat(5, 16);

      positions[index] = x;
      positions[index + 1] = y;
      positions[index + 2] = z;

      positions[index + 3] = x;
      positions[index + 4] = y;
      positions[index + 5] = z + length;
    }
  }

  warpLines.rotation.z = Math.sin(elapsed * 0.6) * 0.018;
  geometry.attributes.position.needsUpdate = true;
}

function updateCameraMotion(elapsed, throttle) {
  const throttleShake = throttle * 0.018;
  const warpShake = state.warpActive ? 0.026 : 0;

  camera.position.x = Math.sin(elapsed * 1.45) * (0.01 + throttleShake);
  camera.position.y = 1.38 + Math.sin(elapsed * 1.95) * (0.008 + warpShake);
  camera.position.z = 6.35 + Math.sin(elapsed * 0.7) * 0.025 - throttle * 0.08;
  camera.lookAt(0, 1.14 + throttle * 0.04, -0.08);
}

function getSafePixelRatio() {
  return Math.min(window.devicePixelRatio || 1, CONFIG.pixelRatioCap);
}

function showFatalError() {
  const errorBox = document.createElement("div");
  errorBox.style.position = "fixed";
  errorBox.style.inset = "16px";
  errorBox.style.zIndex = "999";
  errorBox.style.padding = "18px";
  errorBox.style.border = "1px solid rgba(251, 113, 133, 0.6)";
  errorBox.style.borderRadius = "18px";
  errorBox.style.background = "rgba(15, 23, 42, 0.92)";
  errorBox.style.color = "#eaf6ff";
  errorBox.style.fontFamily = "system-ui, sans-serif";
  errorBox.innerHTML = `
    <strong>Bridge initialization failed.</strong>
    <p>The simulator could not start. Check that the Three.js CDN imports are loading correctly.</p>
  `;
  document.body.appendChild(errorBox);
}
