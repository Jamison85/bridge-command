import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";

/**
 * BRIDGE COMMAND CONFIG
 * Change values here instead of digging through the code like a gremlin in engineering.
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

const state = {
  controls: [],
  levers: [],
  elapsed: 0
};

class AudioEngine {
  constructor(config) {
    this.config = config;
    this.context = null;
    this.buffers = new Map();
    this.loopSources = new Map();
    this.masterGain = null;
    this.ready = false;
  }

  async init() {
    if (this.ready) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.config.masterVolume;
    this.masterGain.connect(this.context.destination);

    await Promise.allSettled(
      Object.entries(this.config.paths).map(async ([name, path]) => {
        try {
          const response = await fetch(path);

          if (!response.ok) {
            console.warn(`Audio missing or unavailable: ${path}`);
            return;
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = await this.context.decodeAudioData(arrayBuffer);
          this.buffers.set(name, buffer);
        } catch (error) {
          console.warn(`Could not load audio: ${path}`, error);
        }
      })
    );

    this.ready = true;
  }

  async resume() {
    if (!this.context) {
      await this.init();
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  playOneShot(name, volume = 1) {
    if (!this.ready || !this.buffers.has(name)) return;

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffers.get(name);
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  playLoop(name, volume = 0.45) {
    if (!this.ready || !this.buffers.has(name) || this.loopSources.has(name)) return;

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffers.get(name);
    source.loop = true;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
    this.loopSources.set(name, { source, gain });
  }
}

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

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

initScene();
initEvents();

new RenderLoop({ renderer, scene, camera, update }).start();

function initScene() {
  createLights();
  createBridgeShell();
  createStarfield();
  createMainConsole();
  createSideConsoles();
  createHologramScreen();
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
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x080d16, metalness: 0.45, roughness: 0.58 });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x0d1422, metalness: 0.35, roughness: 0.72 });

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

function createMainConsole() {
  const group = new THREE.Group();
  group.position.set(0, 0.72, 2.25);
  group.rotation.x = -0.18;

  const baseMaterial = new THREE.MeshStandardMaterial({ color: CONFIG.colors.consoleDark, metalness: 0.58, roughness: 0.42 });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: CONFIG.colors.consoleTrim,
    emissive: CONFIG.colors.consoleTrim,
    emissiveIntensity: 0.55,
    metalness: 0.2,
    roughness: 0.38
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.55, 2.1), baseMaterial);
  group.add(base);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(5.95, 0.06, 2.16), trimMaterial);
  trim.position.y = 0.3;
  group.add(trim);

  [
    {
      label: "NAV",
      color: CONFIG.colors.buttonBlue,
      position: [-2.1, 0.38, -0.55],
      screenTitle: "Navigation Online",
      screenBody: "Astrogation path loaded. Suggested heading: forward, because backwards is generally considered poor piloting."
    },
    {
      label: "SCAN",
      color: CONFIG.colors.buttonGreen,
      position: [-0.7, 0.38, -0.55],
      sound: "scanPing",
      screenTitle: "Long-Range Scan",
      screenBody: "Sensor sweep complete. Three anomalies detected, two probably harmless, one being dramatic for attention."
    },
    {
      label: "COMMS",
      color: CONFIG.colors.buttonAmber,
      position: [0.7, 0.38, -0.55],
      screenTitle: "Communications Array",
      screenBody: "Encrypted channel open. Diplomacy mode available, against all historical evidence."
    },
    {
      label: "ALERT",
      color: CONFIG.colors.buttonRed,
      position: [2.1, 0.38, -0.55],
      sound: "panelBeep",
      screenTitle: "Alert Status",
      screenBody: "Soft alert armed. Nothing is exploding yet, which is honestly refreshing."
    }
  ].forEach((data) => {
    const button = createButton(data);
    group.add(button);
    state.controls.push(button);
  });

  const warpLever = createLever({
    label: "WARP",
    position: [-1.3, 0.42, 0.55],
    screenTitle: "Warp Drive Charging",
    screenBody: "Matter-antimatter balance nominal. Big lever moved. Very satisfying. Engineers pretend this is science.",
    sound: "warpCharge"
  });

  const shieldLever = createLever({
    label: "SHIELD",
    position: [1.3, 0.42, 0.55],
    screenTitle: "Deflector Shields",
    screenBody: "Shield emitters synchronized. Hull confidence increased by 42%. That is not a real metric, but it feels official.",
    sound: "leverClunk"
  });

  group.add(warpLever, shieldLever);
  state.levers.push(warpLever, shieldLever);
  state.controls.push(warpLever, shieldLever);

  scene.add(group);
}

function createSideConsoles() {
  const material = new THREE.MeshStandardMaterial({ color: CONFIG.colors.consoleMid, metalness: 0.52, roughness: 0.5 });

  const left = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.45, 2.6), material);
  left.position.set(-4.15, 0.64, 1.05);
  left.rotation.y = -0.42;
  scene.add(left);

  const right = left.clone();
  right.position.x = 4.15;
  right.rotation.y = 0.42;
  scene.add(right);

  createConsoleLightStrip(-4.15, 1.02, 0.2, -0.42);
  createConsoleLightStrip(4.15, 1.02, 0.2, 0.42);
}

function createConsoleLightStrip(x, y, z, rotationY) {
  const material = new THREE.MeshStandardMaterial({
    color: CONFIG.colors.consoleTrim,
    emissive: CONFIG.colors.consoleTrim,
    emissiveIntensity: 1.2
  });

  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.07), material);
  strip.position.set(x, y, z);
  strip.rotation.y = rotationY;
  scene.add(strip);
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

function createButton({ label, color, position, screenTitle, screenBody, sound = "buttonConfirm" }) {
  const group = new THREE.Group();
  group.position.set(...position);

  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.4, roughness: 0.45 });
  const capMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.65, metalness: 0.2, roughness: 0.32 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.16, 32), baseMaterial);
  base.rotation.x = Math.PI / 2;

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.18, 32), capMaterial);
  cap.rotation.x = Math.PI / 2;
  cap.position.y = 0.11;

  group.add(base, cap);
  group.userData = { type: "button", label, sound, screenTitle, screenBody, cap, baseY: cap.position.y, pressTimer: 0 };

  return group;
}

function createLever({ label, position, screenTitle, screenBody, sound = "leverClunk" }) {
  const group = new THREE.Group();
  group.position.set(...position);

  const baseMaterial = new THREE.MeshStandardMaterial({ color: CONFIG.colors.leverBase, metalness: 0.65, roughness: 0.34 });
  const handleMaterial = new THREE.MeshStandardMaterial({
    color: CONFIG.colors.buttonAmber,
    emissive: CONFIG.colors.buttonAmber,
    emissiveIntensity: 0.35,
    metalness: 0.32,
    roughness: 0.4
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.16, 32), baseMaterial);
  base.rotation.x = Math.PI / 2;

  const pivot = new THREE.Group();
  pivot.position.y = 0.1;

  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.75, 0.13), handleMaterial);
  stem.position.y = 0.38;

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 16), handleMaterial);
  knob.position.y = 0.8;

  pivot.add(stem, knob);
  group.add(base, pivot);
  group.userData = { type: "lever", label, sound, screenTitle, screenBody, pivot, thrown: false, targetRotation: 0 };

  return group;
}

function initEvents() {
  canvas.addEventListener("pointerdown", handlePointerDown, { passive: true });

  audioToggle.addEventListener("click", async () => {
    await audio.resume();
    audio.playLoop("bridgeAmbience", 0.28);
    audio.playLoop("enginePulse", 0.22);
    audio.playOneShot("buttonConfirm", 0.75);
    audioToggle.textContent = "Audio Online";
  });
}

function handlePointerDown(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(pointer, camera);

  const meshes = [];
  state.controls.forEach((control) => {
    control.traverse((child) => {
      if (child.isMesh) meshes.push(child);
    });
  });

  const hits = raycaster.intersectObjects(meshes, false);
  if (!hits.length) return;

  const control = findParentControl(hits[0].object);
  if (control) activateControl(control);
}

function findParentControl(object) {
  let current = object;

  while (current) {
    if (current.userData?.type === "button" || current.userData?.type === "lever") return current;
    current = current.parent;
  }

  return null;
}

function activateControl(control) {
  const data = control.userData;

  screenTitle.textContent = data.screenTitle;
  screenBody.textContent = data.screenBody;
  audio.playOneShot(data.sound, 0.85);

  if (data.type === "button") {
    data.pressTimer = 0.18;
  }

  if (data.type === "lever") {
    data.thrown = !data.thrown;
    data.targetRotation = data.thrown ? -CONFIG.interaction.leverThrowAngle : CONFIG.interaction.leverThrowAngle * 0.25;
  }
}

function update(delta, elapsed) {
  state.elapsed = elapsed;
  updateStars(delta);
  updateControls(delta);
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

function updateControls(delta) {
  state.controls.forEach((control) => {
    const data = control.userData;

    if (data.type === "button") {
      if (data.pressTimer > 0) {
        data.pressTimer -= delta;
        data.cap.position.y = data.baseY - CONFIG.interaction.buttonPressDepth;
      } else {
        data.cap.position.y = THREE.MathUtils.lerp(data.cap.position.y, data.baseY, 0.22);
      }
    }

    if (data.type === "lever") {
      data.pivot.rotation.x = THREE.MathUtils.lerp(data.pivot.rotation.x, data.targetRotation, 0.12);
    }
  });
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
