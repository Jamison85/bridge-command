import * as THREE from "three";

const CONTROL_DEFAULTS = {
  warpThreshold: 0.82,
  throttleSmoothing: 9.5
};

export function createBridgeControls({ scene, canvas, camera, callbacks = {}, options = {} }) {
  const config = { ...CONTROL_DEFAULTS, ...options };

  const state = {
    currentThrottle: 0,
    targetThrottle: 0,
    previousThrottle: 0,
    isDraggingLever: false,
    dragStartY: 0,
    dragStartThrottle: 0,
    warpActive: false,
    pointer: new THREE.Vector2()
  };

  const raycaster = new THREE.Raycaster();
  const interactiveObjects = [];
  const commandObjects = new Map();

  const controlDeck = new THREE.Group();
  controlDeck.name = "cinematic-tactile-controls";
  controlDeck.position.set(0, -0.5, 2.26);
  controlDeck.rotation.x = -0.24;
  scene.add(controlDeck);

  let leverHandle;
  let leverGrip;
  let throttleRailGlow;

  const materials = createControlMaterials();

  createPhysicalDeck();
  createCommandButtons();
  createThrottleCluster();
  createToggleBanks();
  createIndicatorLights();

  canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  canvas.addEventListener("pointermove", onPointerMove, { passive: false });
  canvas.addEventListener("pointerup", onPointerUp, { passive: true });
  canvas.addEventListener("pointercancel", onPointerUp, { passive: true });

  function createControlMaterials() {
    return {
      deck: material(0x050d18, 0x020814, 0.08, 0.76, 0.44),
      deckRaised: material(0x0b1c30, 0x04101d, 0.1, 0.68, 0.38),
      inset: material(0x020711, 0x010611, 0.08, 0.42, 0.58),
      cyan: glow(0x5cc4dd, 0.54),
      blue: glow(0x4b7ecf, 0.46),
      amber: glow(0xd99f2a, 0.5),
      red: glow(0xc45a6a, 0.42),
      green: glow(0x79d1a0, 0.42),
      metal: material(0x9fb2bf, 0x071827, 0.08, 0.62, 0.28),
      darkGrip: material(0x111927, 0x030710, 0.06, 0.58, 0.42)
    };
  }

  function material(color, emissive, emissiveIntensity, metalness, roughness) {
    return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity, metalness, roughness });
  }

  function glow(color, intensity) {
    return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.28, metalness: 0.14 });
  }

  function createPhysicalDeck() {
    mesh(controlDeck, new THREE.BoxGeometry(7.45, 0.36, 1.65), materials.deck, [0, 0, 0.24]);
    mesh(controlDeck, new THREE.BoxGeometry(2.55, 0.16, 1.22), materials.deckRaised, [0, 0.26, 0]);
    mesh(controlDeck, new THREE.BoxGeometry(2.05, 0.15, 1.25), materials.deckRaised, [-2.55, 0.22, 0], [0, 0.18, 0]);
    mesh(controlDeck, new THREE.BoxGeometry(2.05, 0.15, 1.25), materials.deckRaised, [2.55, 0.22, 0], [0, -0.18, 0]);
    mesh(controlDeck, new THREE.BoxGeometry(7.75, 0.26, 0.22), materials.deck, [0, 0.05, 0.98]);
    bar([0, 0.38, -0.68], [2.2, 0.03, 0.04], materials.cyan);
    bar([-2.55, 0.34, -0.65], [1.42, 0.03, 0.04], materials.blue, [0, 0.18, 0]);
    bar([2.55, 0.34, -0.65], [1.42, 0.03, 0.04], materials.blue, [0, -0.18, 0]);
  }

  function createCommandButtons() {
    const buttons = [
      ["NEXT", "next", -3.04, 0.1, materials.green, 0.3, 0.22],
      ["TASK", "tasks", -2.3, -0.18, materials.cyan, 0.28, 0.2],
      ["RPT", "report", -1.64, 0.16, materials.amber, 0.28, 0.2],
      ["LOG", "history", -2.26, 0.46, materials.blue, 0.25, 0.18],
      ["VOICE", "voice", 3.04, 0.1, materials.cyan, 0.34, 0.22],
      ["OPEN", "open", 2.3, -0.18, materials.blue, 0.28, 0.2],
      ["FOCUS", "focus", 1.64, 0.16, materials.green, 0.28, 0.2],
      ["NOTE", "notes", 2.26, 0.46, materials.red, 0.25, 0.18]
    ];
    buttons.forEach(([label, command, x, z, mat, w, d]) => createButton(label, command, x, z, mat, w, d));
  }

  function createButton(label, command, x, z, mat, w, d) {
    const group = new THREE.Group();
    group.position.set(x, 0.42, z);
    group.rotation.y = x < -0.9 ? 0.16 : x > 0.9 ? -0.16 : 0;
    controlDeck.add(group);

    mesh(group, new THREE.BoxGeometry(w * 1.25, 0.09, d * 1.2), materials.inset, [0, 0, 0]);
    const cap = mesh(group, new THREE.BoxGeometry(w, 0.15, d), mat, [0, 0.12, 0]);
    cap.userData = { type: "button", command, label, defaultY: cap.position.y, material: mat };
    interactiveObjects.push(cap);
    commandObjects.set(command, cap);

    const labelSprite = createLabelSprite(label, w > 0.3 ? 0.36 : 0.28);
    labelSprite.position.set(0, 0.27, 0.34);
    labelSprite.rotation.x = Math.PI / 2;
    group.add(labelSprite);
  }

  function createThrottleCluster() {
    const cluster = new THREE.Group();
    cluster.position.set(0, 0.42, 0.2);
    controlDeck.add(cluster);

    mesh(cluster, new THREE.BoxGeometry(1.78, 0.18, 0.9), materials.inset, [0, -0.03, 0.05]);
    mesh(cluster, new THREE.BoxGeometry(0.18, 0.08, 0.82), materials.blue, [-0.58, 0.12, 0.04]);
    mesh(cluster, new THREE.BoxGeometry(0.18, 0.08, 0.82), materials.blue, [0.58, 0.12, 0.04]);
    throttleRailGlow = mesh(cluster, new THREE.BoxGeometry(0.8, 0.035, 0.055), materials.cyan, [0, 0.16, -0.3]);
    mesh(cluster, new THREE.BoxGeometry(0.72, 0.16, 0.42), materials.deck, [0, 0.1, 0.24]);
    mesh(cluster, new THREE.BoxGeometry(0.26, 0.12, 0.32), materials.inset, [0, 0.18, 0.24]);

    leverHandle = new THREE.Group();
    leverHandle.rotation.z = getLeverRotationFromThrottle(0);
    cluster.add(leverHandle);

    mesh(leverHandle, new THREE.BoxGeometry(0.1, 0.82, 0.1), materials.metal, [0.02, 0.45, 0], [0, 0, 0.06]);
    mesh(leverHandle, new THREE.BoxGeometry(0.16, 0.28, 0.16), materials.metal, [0.05, 0.78, 0]);
    leverGrip = mesh(leverHandle, new THREE.BoxGeometry(0.28, 0.42, 0.22), materials.darkGrip, [0.08, 1.0, 0]);
    mesh(leverHandle, new THREE.BoxGeometry(0.32, 0.08, 0.26), materials.metal, [0.08, 1.25, 0]);
    leverGrip.userData = { type: "lever", label: "Throttle" };
    interactiveObjects.push(leverGrip);

    const labelSprite = createLabelSprite("THROTTLE", 0.44);
    labelSprite.position.set(0, 0.22, 0.52);
    labelSprite.rotation.x = Math.PI / 2;
    cluster.add(labelSprite);
  }

  function createToggleBanks() {
    [[-0.78, "AUX"], [0.78, "SYS"]].forEach(([x, labelText]) => {
      const label = createLabelSprite(labelText, 0.22);
      label.position.set(x, 0.49, -0.42);
      label.rotation.x = Math.PI / 2;
      controlDeck.add(label);
      for (let i = 0; i < 3; i += 1) {
        const g = new THREE.Group();
        g.position.set(x - 0.22 + i * 0.22, 0.45, -0.2);
        controlDeck.add(g);
        mesh(g, new THREE.BoxGeometry(0.12, 0.05, 0.28), materials.inset, [0, 0, 0]);
        mesh(g, new THREE.BoxGeometry(0.045, 0.18, 0.045), i % 2 ? materials.cyan : materials.amber, [0, 0.12, 0.03], [i % 2 ? -0.35 : 0.35, 0, 0]);
      }
    });
  }

  function createIndicatorLights() {
    for (let i = 0; i < 12; i += 1) {
      const mat = i % 4 === 0 ? materials.red : i % 3 === 0 ? materials.amber : i % 2 === 0 ? materials.blue : materials.cyan;
      mesh(controlDeck, new THREE.SphereGeometry(0.045, 14, 10), mat, [-1.42 + i * 0.26, 0.45, -0.48]);
    }
  }

  function mesh(parent, geometry, mat, position, rotation = [0, 0, 0]) {
    const item = new THREE.Mesh(geometry, mat);
    item.position.set(...position);
    item.rotation.set(...rotation);
    parent.add(item);
    return item;
  }

  function bar(position, scale, mat, rotation = [0, 0, 0]) {
    const item = mesh(controlDeck, new THREE.BoxGeometry(1, 1, 1), mat, position, rotation);
    item.scale.set(...scale);
    return item;
  }

  function createLabelSprite(text, width = 0.3) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 256, 96);
    ctx.fillStyle = "rgba(4, 12, 22, 0.66)";
    roundRect(ctx, 12, 22, 232, 52, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(92, 196, 221, 0.28)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "rgba(234, 246, 255, 0.9)";
    ctx.font = "900 28px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 49);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(width, width * 0.38, 1);
    return sprite;
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function onPointerDown(event) {
    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    updatePointerFromEvent(event);
    raycaster.setFromCamera(state.pointer, camera);
    const hit = raycaster.intersectObjects(interactiveObjects, true)[0]?.object;
    if (!hit) return;
    if (hit.userData.type === "lever") {
      state.isDraggingLever = true;
      state.dragStartY = event.clientY;
      state.dragStartThrottle = state.targetThrottle;
      callbacks.onLeverGrab?.();
      return;
    }
    if (hit.userData.type === "button") {
      pressButton(hit);
      callbacks.onCommand?.(hit.userData.command, hit.userData.label);
    }
  }

  function onPointerMove(event) {
    if (!state.isDraggingLever) return;
    event.preventDefault();
    const dragDistance = state.dragStartY - event.clientY;
    const sensitivity = Math.min(window.innerHeight * 0.42, 320);
    state.targetThrottle = THREE.MathUtils.clamp(state.dragStartThrottle + dragDistance / sensitivity, 0, 1);
  }

  function onPointerUp() {
    state.isDraggingLever = false;
  }

  function updatePointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function pressButton(button) {
    button.position.y = button.userData.defaultY - 0.05;
    button.material.emissiveIntensity = 0.8;
    window.setTimeout(() => {
      button.position.y = button.userData.defaultY;
      button.material.emissiveIntensity = 0.45;
    }, 140);
  }

  function getLeverRotationFromThrottle(throttle) {
    return THREE.MathUtils.lerp(-0.62, 0.78, throttle);
  }

  function update(delta) {
    state.previousThrottle = state.currentThrottle;
    state.currentThrottle = THREE.MathUtils.damp(state.currentThrottle, state.targetThrottle, config.throttleSmoothing, delta);
    if (leverHandle) leverHandle.rotation.z = getLeverRotationFromThrottle(state.currentThrottle);
    if (throttleRailGlow) throttleRailGlow.material.emissiveIntensity = 0.42 + state.currentThrottle * 0.46 + Math.sin(performance.now() * 0.006) * 0.04;
    if (Math.abs(state.currentThrottle - state.previousThrottle) > 0.002) callbacks.onThrottleChange?.(state.currentThrottle);

    const shouldWarp = state.currentThrottle >= config.warpThreshold;
    if (shouldWarp && !state.warpActive) {
      state.warpActive = true;
      callbacks.onWarpEngage?.();
    }
    if (!shouldWarp && state.warpActive) {
      state.warpActive = false;
      callbacks.onWarpDisengage?.();
    }
    return state.currentThrottle;
  }

  function pulseCommand(command) {
    const target = commandObjects.get(command);
    if (!target) return;
    pressButton(target);
  }

  function dispose() {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
  }

  return {
    update,
    dispose,
    pulseCommand,
    getThrottle: () => state.currentThrottle,
    setThrottle: (value) => {
      state.targetThrottle = THREE.MathUtils.clamp(value, 0, 1);
    }
  };
}
