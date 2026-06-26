import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";

export class BridgeControls {
  constructor({ scene, camera, canvas, config, audio, screenTitle, screenBody }) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    this.config = config;
    this.audio = audio;
    this.screenTitle = screenTitle;
    this.screenBody = screenBody;

    this.controls = [];
    this.levers = [];
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
  }

  create() {
    this.createMainConsole();
    this.createSideConsoles();
  }

  bindEvents() {
    this.canvas.addEventListener("pointerdown", this.handlePointerDown, { passive: true });
  }

  handlePointerDown = (event) => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const meshes = [];
    this.controls.forEach((control) => {
      control.traverse((child) => {
        if (child.isMesh) meshes.push(child);
      });
    });

    const hits = this.raycaster.intersectObjects(meshes, false);
    if (!hits.length) return;

    const control = this.findParentControl(hits[0].object);
    if (control) this.activateControl(control);
  };

  findParentControl(object) {
    let current = object;

    while (current) {
      if (current.userData?.type === "button" || current.userData?.type === "lever") {
        return current;
      }

      current = current.parent;
    }

    return null;
  }

  activateControl(control) {
    const data = control.userData;

    this.screenTitle.textContent = data.screenTitle;
    this.screenBody.textContent = data.screenBody;
    this.audio.playOneShot(data.sound, 0.85);

    if (data.type === "button") {
      data.pressTimer = 0.18;
    }

    if (data.type === "lever") {
      data.thrown = !data.thrown;
      data.targetRotation = data.thrown
        ? -this.config.interaction.leverThrowAngle
        : this.config.interaction.leverThrowAngle * 0.25;
    }
  }

  update(delta) {
    this.controls.forEach((control) => {
      const data = control.userData;

      if (data.type === "button") {
        if (data.pressTimer > 0) {
          data.pressTimer -= delta;
          data.cap.position.y = data.baseY - this.config.interaction.buttonPressDepth;
        } else {
          data.cap.position.y = THREE.MathUtils.lerp(data.cap.position.y, data.baseY, 0.22);
        }
      }

      if (data.type === "lever") {
        data.pivot.rotation.x = THREE.MathUtils.lerp(data.pivot.rotation.x, data.targetRotation, 0.12);
      }
    });
  }

  createMainConsole() {
    const group = new THREE.Group();
    group.position.set(0, 0.72, 2.25);
    group.rotation.x = -0.18;

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: this.config.colors.consoleDark,
      metalness: 0.58,
      roughness: 0.42
    });

    const trimMaterial = new THREE.MeshStandardMaterial({
      color: this.config.colors.consoleTrim,
      emissive: this.config.colors.consoleTrim,
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
        color: this.config.colors.buttonBlue,
        position: [-2.1, 0.38, -0.55],
        screenTitle: "Navigation Online",
        screenBody: "Astrogation path loaded. Suggested heading: forward, because backwards is generally considered poor piloting."
      },
      {
        label: "SCAN",
        color: this.config.colors.buttonGreen,
        position: [-0.7, 0.38, -0.55],
        sound: "scanPing",
        screenTitle: "Long-Range Scan",
        screenBody: "Sensor sweep complete. Three anomalies detected, two probably harmless, one being dramatic for attention."
      },
      {
        label: "COMMS",
        color: this.config.colors.buttonAmber,
        position: [0.7, 0.38, -0.55],
        screenTitle: "Communications Array",
        screenBody: "Encrypted channel open. Diplomacy mode available, against all historical evidence."
      },
      {
        label: "ALERT",
        color: this.config.colors.buttonRed,
        position: [2.1, 0.38, -0.55],
        sound: "panelBeep",
        screenTitle: "Alert Status",
        screenBody: "Soft alert armed. Nothing is exploding yet, which is honestly refreshing."
      }
    ].forEach((data) => {
      const button = this.createButton(data);
      group.add(button);
      this.controls.push(button);
    });

    const warpLever = this.createLever({
      label: "WARP",
      position: [-1.3, 0.42, 0.55],
      screenTitle: "Warp Drive Charging",
      screenBody: "Matter-antimatter balance nominal. Big lever moved. Very satisfying. Engineers pretend this is science.",
      sound: "warpCharge"
    });

    const shieldLever = this.createLever({
      label: "SHIELD",
      position: [1.3, 0.42, 0.55],
      screenTitle: "Deflector Shields",
      screenBody: "Shield emitters synchronized. Hull confidence increased by 42%. That is not a real metric, but it feels official.",
      sound: "leverClunk"
    });

    group.add(warpLever, shieldLever);
    this.levers.push(warpLever, shieldLever);
    this.controls.push(warpLever, shieldLever);
    this.scene.add(group);
  }

  createSideConsoles() {
    const material = new THREE.MeshStandardMaterial({
      color: this.config.colors.consoleMid,
      metalness: 0.52,
      roughness: 0.5
    });

    const left = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.45, 2.6), material);
    left.position.set(-4.15, 0.64, 1.05);
    left.rotation.y = -0.42;
    this.scene.add(left);

    const right = left.clone();
    right.position.x = 4.15;
    right.rotation.y = 0.42;
    this.scene.add(right);

    this.createConsoleLightStrip(-4.15, 1.02, 0.2, -0.42);
    this.createConsoleLightStrip(4.15, 1.02, 0.2, 0.42);
  }

  createConsoleLightStrip(x, y, z, rotationY) {
    const material = new THREE.MeshStandardMaterial({
      color: this.config.colors.consoleTrim,
      emissive: this.config.colors.consoleTrim,
      emissiveIntensity: 1.2
    });

    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.07), material);
    strip.position.set(x, y, z);
    strip.rotation.y = rotationY;
    this.scene.add(strip);
  }

  createButton({ label, color, position, screenTitle, screenBody, sound = "buttonConfirm" }) {
    const group = new THREE.Group();
    group.position.set(...position);

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.4,
      roughness: 0.45
    });

    const capMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.65,
      metalness: 0.2,
      roughness: 0.32
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.16, 32), baseMaterial);
    base.rotation.x = Math.PI / 2;

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.18, 32), capMaterial);
    cap.rotation.x = Math.PI / 2;
    cap.position.y = 0.11;

    group.add(base, cap);
    group.userData = {
      type: "button",
      label,
      sound,
      screenTitle,
      screenBody,
      cap,
      baseY: cap.position.y,
      pressTimer: 0
    };

    return group;
  }

  createLever({ label, position, screenTitle, screenBody, sound = "leverClunk" }) {
    const group = new THREE.Group();
    group.position.set(...position);

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: this.config.colors.leverBase,
      metalness: 0.65,
      roughness: 0.34
    });

    const handleMaterial = new THREE.MeshStandardMaterial({
      color: this.config.colors.buttonAmber,
      emissive: this.config.colors.buttonAmber,
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
    group.userData = {
      type: "lever",
      label,
      sound,
      screenTitle,
      screenBody,
      pivot,
      thrown: false,
      targetRotation: 0
    };

    return group;
  }
}
