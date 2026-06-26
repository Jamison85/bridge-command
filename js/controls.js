import * as THREE from "three";

const CONTROL_DEFAULTS = {
  warpThreshold: 0.82,
  throttleSmoothing: 9.5
};

/**
 * Large tactile physical controls for the cockpit foreground.
 * The store workflow stays digital, but the interaction should feel like
 * grabbing a real starship console instead of poking a sad rectangle.
 */
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
  let leverKnob;
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
      deck: new THREE.MeshStandardMaterial({
        color: 0x081322,
        metalness: 0.78,
        roughness: 0.28,
        emissive: 0x04101d,
        emissiveIntensity: 0.18
      }),
      deckRaised: new THREE.MeshStandardMaterial({
        color: 0x11263d,
        metalness: 0.68,
        roughness: 0.25,
        emissive: 0x06192a,
        emissiveIntensity: 0.2
      }),
      inset: new THREE.MeshStandardMaterial({
        color: 0x030914,
        metalness: 0.38,
        roughness: 0.54,
        emissive: 0x061426,
        emissiveIntensity: 0.24
      }),
      cyan: createGlowMaterial(0x67e8f9, 1.1),
      blue: createGlowMaterial(0x60a5fa, 1.0),
      amber: createGlowMaterial(0xfacc15, 1.0),
      red: createGlowMaterial(0xfb7185, 1.0),
      green: createGlowMaterial(0x86efac, 1.0),
      white: new THREE.MeshStandardMaterial({
        color: 0xecfeff,
        metalness: 0.52,
        roughness: 0.16,
        emissive: 0x67e8f9,
        emissiveIntensity: 0.28
      })
    };
  }

  function createGlowMaterial(color, intensity) {
    return new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.2,
      metalness: 0.16
    });
  }

  function createPhysicalDeck() {
    const lower = new THREE.Mesh(new THREE.BoxGeometry(7.45, 0.36, 1.65), materials.deck);
    lower.position.set(0, 0, 0.24);
    controlDeck.add(lower);

    const centerPlate = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.16, 1.22), materials.deckRaised);
    centerPlate.position.set(0, 0.26, 0.0);
    controlDeck.add(centerPlate);

    const leftPlate = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.15, 1.25), materials.deckRaised);
    leftPlate.position.set(-2.55, 0.22, 0.0);
    leftPlate.rotation.y = 0.18;
    controlDeck.add(leftPlate);

    const rightPlate = leftPlate.clone();
    rightPlate.position.x = 2.55;
    rightPlate.rotation.y = -0.18;
    controlDeck.add(rightPlate);

    const lowerLip = new THREE.Mesh(new THREE.BoxGeometry(7.75, 0.26, 0.22), materials.deck);
    lowerLip.position.set(0, 0.05, 0.98);
    controlDeck.add(lowerLip);

    addGlowBar({ position: [0, 0.38, -0.68], scale: [2.2, 0.03, 0.04], material: materials.cyan });
    addGlowBar({ position: [-2.55, 0.34, -0.65], rotationY: 0.18, scale: [1.42, 0.03, 0.04], material: materials.blue });
    addGlowBar({ position: [2.55, 0.34, -0.65], rotationY: -0.18, scale: [1.42, 0.03, 0.04], material: materials.blue });
  }

  function createCommandButtons() {
    const buttons = [
      { label: "NEXT", command: "next", position: [-3.04, 0.42, 0.1], material: materials.green, size: 0.28 },
      { label: "TASK", command: "tasks", position: [-2.3, 0.42, -0.18], material: materials.cyan, size: 0.24 },
      { label: "RPT", command: "report", position: [-1.64, 0.42, 0.16], material: materials.amber, size: 0.24 },
      { label: "LOG", command: "history", position: [-2.26, 0.42, 0.46], material: materials.blue, size: 0.22 },
      { label: "VOICE", command: "voice", position: [3.04, 0.42, 0.1], material: materials.cyan, size: 0.28 },
      { label: "OPEN", command: "open", position: [2.3, 0.42, -0.18], material: materials.blue, size: 0.24 },
      { label: "FOCUS", command: "focus", position: [1.64, 0.42, 0.16], material: materials.green, size: 0.24 },
      { label: "NOTE", command: "notes", position: [2.26, 0.42, 0.46], material: materials.red, size: 0.22 }
    ];

    buttons.forEach((button) => createButton(button));
  }

  function createButton({ label, command, position, material, size }) {
    const group = new THREE.Group();
    group.position.set(...position);
    group.rotation.y = position[0] < -0.9 ? 0.16 : position[0] > 0.9 ? -0.16 : 0;
    controlDeck.add(group);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(size * 1.16, size * 1.32, 0.13, 36), materials.inset);
    base.rotation.x = Math.PI / 2;
    group.add(base);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.82, size * 0.98, 0.17, 40), material);
    cap.rotation.x = Math.PI / 2;
    cap.position.y = 0.1;
    cap.userData = {
      type: "button",
      command,
      label,
      defaultY: cap.position.y,
      material
    };
    group.add(cap);

    const labelSprite = createLabelSprite(label, size > 0.25 ? 0.36 : 0.28);
    labelSprite.position.set(0, 0.27, 0.36);
    labelSprite.rotation.x = Math.PI / 2;
    group.add(labelSprite);

    interactiveObjects.push(cap);
    commandObjects.set(command, cap);
  }

  function createThrottleCluster() {
    const cluster = new THREE.Group();
    cluster.position.set(0, 0.42, 0.2);
    controlDeck.add(cluster);

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 0.88), materials.inset);
    base.position.set(0, -0.03, 0.05);
    cluster.add(base);

    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.018, 10, 88, Math.PI * 1.12), materials.cyan);
    arc.position.set(0, 0.1, 0.02);
    arc.rotation.set(Math.PI / 2, 0, Math.PI * 0.94);
    cluster.add(arc);
    throttleRailGlow = arc;

    const railLeft = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.05, 0.78), materials.blue);
    railLeft.position.set(-0.72, 0.12, 0.04);
    cluster.add(railLeft);

    const railRight = railLeft.clone();
    railRight.position.x = 0.72;
    cluster.add(railRight);

    leverHandle = new THREE.Group();
    leverHandle.rotation.z = getLeverRotationFromThrottle(0);
    cluster.add(leverHandle);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.98, 28), materials.white);
    stem.position.set(0, 0.47, 0);
    stem.rotation.z = 0.08;
    leverHandle.add(stem);

    leverKnob = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 20), materials.white);
    leverKnob.position.set(0.06, 0.98, 0);
    leverKnob.userData = {
      type: "lever",
      label: "Throttle"
    };
    leverHandle.add(leverKnob);

    const labelSprite = createLabelSprite("THROTTLE", 0.44);
    labelSprite.position.set(0, 0.22, 0.52);
    labelSprite.rotation.x = Math.PI / 2;
    cluster.add(labelSprite);

    interactiveObjects.push(leverKnob);
  }

  function createToggleBanks() {
    const banks = [
      { x: -0.78, label: "AUX" },
      { x: 0.78, label: "SYS" }
    ];

    banks.forEach((bank) => {
      const label = createLabelSprite(bank.label, 0.22);
      label.position.set(bank.x, 0.49, -0.42);
      label.rotation.x = Math.PI / 2;
      controlDeck.add(label);

      for (let i = 0; i < 3; i += 1) {
        const toggle = new THREE.Group();
        toggle.position.set(bank.x - 0.22 + i * 0.22, 0.45, -0.2);
        controlDeck.add(toggle);

        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.28), materials.inset);
        toggle.add(slot);

        const lever = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.045), i % 2 ? materials.cyan : materials.amber);
        lever.position.set(0, 0.12, 0.03);
        lever.rotation.x = i % 2 ? -0.35 : 0.35;
        toggle.add(lever);
      }
    });
  }

  function createIndicatorLights() {
    for (let i = 0; i < 12; i += 1) {
      const colorMaterial = i % 4 === 0 ? materials.red : i % 3 === 0 ? materials.amber : i % 2 === 0 ? materials.blue : materials.cyan;
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.055, 18, 12), colorMaterial);
      light.position.set(-1.42 + i * 0.26, 0.45, -0.48);
      light.userData.baseIntensity = colorMaterial.emissiveIntensity;
      controlDeck.add(light);
    }
  }

  function addGlowBar({ position, rotationY = 0, scale, material }) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    bar.position.set(...position);
    bar.rotation.y = rotationY;
    bar.scale.set(...scale);
    controlDeck.add(bar);
    return bar;
  }

  function createLabelSprite(text, width = 0.3) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(6, 17, 31, 0.72)";
    roundRect(ctx, 12, 22, 232, 52, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(103, 232, 249, 0.42)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "rgba(234, 246, 255, 0.96)";
    ctx.font = "900 28px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 49);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });

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

    const hits = raycaster.intersectObjects(interactiveObjects, true);
    const hit = hits[0]?.object;

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

    state.targetThrottle = THREE.MathUtils.clamp(
      state.dragStartThrottle + dragDistance / sensitivity,
      0,
      1
    );
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
    button.position.y = button.userData.defaultY - 0.06;
    button.material.emissiveIntensity = 1.85;

    window.setTimeout(() => {
      button.position.y = button.userData.defaultY;
      button.material.emissiveIntensity = 1.05;
    }, 140);
  }

  function getLeverRotationFromThrottle(throttle) {
    return THREE.MathUtils.lerp(-0.62, 0.78, throttle);
  }

  function update(delta) {
    state.previousThrottle = state.currentThrottle;
    state.currentThrottle = THREE.MathUtils.damp(
      state.currentThrottle,
      state.targetThrottle,
      config.throttleSmoothing,
      delta
    );

    if (leverHandle) {
      leverHandle.rotation.z = getLeverRotationFromThrottle(state.currentThrottle);
    }

    if (throttleRailGlow) {
      throttleRailGlow.material.emissiveIntensity = 1.1 + state.currentThrottle * 1.25 + Math.sin(performance.now() * 0.006) * 0.12;
    }

    if (Math.abs(state.currentThrottle - state.previousThrottle) > 0.002) {
      callbacks.onThrottleChange?.(state.currentThrottle);
    }

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
