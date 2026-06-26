import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";
import { AudioEngine } from "./audio.js";
import { BridgeControls } from "./controls.js";

/**
 * BRIDGE COMMAND CONFIG
 * This stays here so the app can be tuned without spelunking through the whole codebase.
 */
const CONFIG = {
  renderer: {
    maxDpr: 2,
    antialias: true,
    powerPreference: "high-performance",
    clearColor: 0x05070d
  },
  camera: {
    fov: 58,
    near: 0.1,
    far: 120,
    position: new THREE.Vector3(0, 2.15, 7.2),
    lookAt: new THREE.Vector3(0, 1.15, 0)
  },
  lights: {
    ambientIntensity: 0.72,
    consoleGlowIntensity: 1.8,
    overheadIntensity: 2.4,
    hologramIntensity: 1.25
  },
  colors: {
    consoleDark: 0x101827,
    consoleMid: 0x1c2b42,
    consoleTrim: 0x4bb8ff,
    buttonBlue: 0x4bb8ff,
    buttonAmber: 0xffb85c,
    buttonGreen: 0x66ffbb,
    buttonRed: 0xff5c7a,
    hologram: 0x72d6ff,
    leverBase: 0x2d3d55
  },
  audio: {
    masterVolume: 0.72,
    useGeneratedFallback: true,
    paths: {
      bridgeAmbience: "./assets/audio/bridge_ambience_loop.mp3",
      enginePulse: "./assets/audio/engine_pulse_loop.mp3",
      buttonConfirm: "./assets/audio/button_confirm_01.wav",
      panelBeep: "./assets/audio/panel_beep_01.wav",
      leverClunk: "./assets/audio/lever_clunk_01.wav",
      scanPing: "./assets/audio/scan_ping_01.wav",
      softAlert: "./assets/audio/alert_soft_loop.mp3",
      warpCharge: "./assets/audio/warp_charge_01.wav"
    }
  },
  interaction: {
    buttonPressDepth: 0.08,
    leverThrowAngle: Math.PI * 0.32
  }
};

const canvas = document.querySelector("#bridge-canvas");
const audioToggle = document.querySelector("#audio-toggle");
const screenTitle = document.querySelector("#screen-title");
const screenBody = document.querySelector("#screen-body");

class RenderLoop {
  constructor({ renderer, scene, camera, update }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.update = update;
    this.clock = new THREE.Clock();
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
  }

  start() {
    const tick = () => {
      this.resizeIfNeeded();
      const delta = this.clock.getDelta();
      const elapsed = this.clock.elapsedTime;

      this.update(delta, elapsed);
      this.renderer.render(this.scene, this.camera);

      requestAnimationFrame(tick);
    };

    tick();
  }

  resizeIfNeeded() {
    const width = Math.floor(canvas.clientWidth);
    const height = Math.floor(canvas.clientHeight);
    const nextDpr = Math.min(window.devicePixelRatio || 1, CONFIG.renderer.maxDpr);

    if (width === this.width && height === this.height && nextDpr === this.dpr) return;

    this.width = width;
    this.height = height;
    this.dpr = nextDpr;

    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(width, height, false);

    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }
}

const audio = new AudioEngine(CONFIG.audio);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: CONFIG.renderer.antialias,
  powerPreference: CONFIG.renderer.powerPreference,
  alpha: false
});

renderer.setClearColor(CONFIG.renderer.clearColor, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x05070d, 16, 70);

const camera = new THREE.PerspectiveCamera(
  CONFIG.camera.fov,
  window.innerWidth / window.innerHeight,
  CONFIG.camera.near,
  CONFIG.camera.far
);

camera.position.copy(CONFIG.camera.position);
camera.lookAt(CONFIG.camera.lookAt);

const bridgeControls = new BridgeControls({
  scene,
  camera,
  canvas,
  config: CONFIG,
  audio,
  screenTitle,
  screenBody
});

initScene();
initEvents();

new RenderLoop({ renderer, scene, camera, update }).start();

function initScene() {
  createLights();
  createBridgeShell();
  createStarfield();
  createHologramScreen();
  bridgeControls.create();
}

function initEvents() {
  bridgeControls.bindEvents();

  audioToggle.addEventListener("click", async () => {
    audioToggle.textContent = "Starting Audio...";

    await audio.resume();

    audio.playLoop("bridgeAmbience", 0.28);
    audio.playLoop("enginePulse", 0.22);
    audio.playOneShot("buttonConfirm", 0.75);

    audioToggle.textContent = "Audio Online";
  });
}

function createLights() {
  scene.add(new THREE.HemisphereLight(0x9dccff, 0x0b1020, CONFIG.lights.ambientIntensity));

  const overhead = new THREE.PointLight(0x8fd6ff, CONFIG.lights.overheadIntensity, 14);
  overhead.position.set(0, 4.8, 3.4);
  scene.add(overhead);

  const consoleGlow = new THREE.PointLight(CONFIG.colors.consoleTrim, CONFIG.lights.consoleGlowIntensity, 8);
  consoleGlow.position.set(0, 1.2, 2.5);
  scene.add(consoleGlow);

  const hologramGlow = new THREE.PointLight(CONFIG.colors.hologram, CONFIG.lights.hologramIntensity, 7);
  hologramGlow.position.set(0, 2.45, -1.8);
  scene.add(hologramGlow);
}

function createBridgeShell() {
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x080d16,
    metalness: 0.45,
    roughness: 0.58
  });

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d1422,
    metalness: 0.35,
    roughness: 0.72
  });

  const floor = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.22, 48), floorMaterial);
  floor.position.y = -0.15;
  scene.add(floor);

  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 0.35), wallMaterial);
  rearWall.position.set(0, 2.15, -5.4);
  scene.add(rearWall);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.25, 9.5), wallMaterial);
  ceiling.position.set(0, 4.8, -0.9);
  scene.add(ceiling);

  createWindowFrame();
}

function createWindowFrame() {
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x17263d,
    metalness: 0.72,
    roughness: 0.38,
    emissive: 0x07111f,
    emissiveIntensity: 0.45
  });

  const outer = new THREE.Group();
  outer.position.set(0, 2.45, -5.18);

  const top = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.22, 0.22), frameMaterial);
  top.position.y = 1.25;

  const bottom = top.clone();
  bottom.position.y = -1.25;

  const left = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.7, 0.22), frameMaterial);
  left.position.x = -4.1;

  const right = left.clone();
  right.position.x = 4.1;

  outer.add(top, bottom, left, right);
  scene.add(outer);
}

function createStarfield() {
  const starCount = isMobile() ? 420 : 700;
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i += 1) {
    const index = i * 3;
    positions[index] = THREE.MathUtils.randFloatSpread(42);
    positions[index + 1] = THREE.MathUtils.randFloat(-2, 18);
    positions[index + 2] = THREE.MathUtils.randFloat(-48, -8);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xdff7ff,
    size: 0.055,
    sizeAttenuation: true
  });

  const stars = new THREE.Points(geometry, material);
  stars.name = "starfield";
  scene.add(stars);
}

function createHologramScreen() {
  const material = new THREE.MeshStandardMaterial({
    color: CONFIG.colors.hologram,
    transparent: true,
    opacity: 0.18,
    emissive: CONFIG.colors.hologram,
    emissiveIntensity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.65), material);
  screen.name = "hologram-screen";
  screen.position.set(0, 2.22, -2.2);
  screen.rotation.x = -0.08;
  scene.add(screen);

  const borderMaterial = new THREE.MeshStandardMaterial({
    color: CONFIG.colors.hologram,
    emissive: CONFIG.colors.hologram,
    emissiveIntensity: 1.3
  });

  const top = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.025, 0.025), borderMaterial);
  top.position.set(0, 3.06, -2.19);

  const bottom = top.clone();
  bottom.position.y = 1.38;

  const left = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.65, 0.025), borderMaterial);
  left.position.set(-1.8, 2.22, -2.19);

  const right = left.clone();
  right.position.x = 1.8;

  scene.add(top, bottom, left, right);
}

function update(delta, elapsed) {
  updateStars(delta);
  bridgeControls.update(delta);
  updateCameraBreathing(elapsed);
  updateHologramPulse(elapsed);
}

function updateStars(delta) {
  const stars = scene.getObjectByName("starfield");
  if (!stars) return;

  stars.position.z += delta * 0.38;

  if (stars.position.z > 5) {
    stars.position.z = 0;
  }
}

function updateCameraBreathing(elapsed) {
  camera.position.y = CONFIG.camera.position.y + Math.sin(elapsed * 0.6) * 0.018;
  camera.position.x = CONFIG.camera.position.x + Math.sin(elapsed * 0.34) * 0.012;
  camera.lookAt(CONFIG.camera.lookAt);
}

function updateHologramPulse(elapsed) {
  const hologram = scene.getObjectByName("hologram-screen");
  if (!hologram) return;

  hologram.material.opacity = 0.16 + Math.sin(elapsed * 2.4) * 0.035;
}

function isMobile() {
  return window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
}
