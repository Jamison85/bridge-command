import * as THREE from "three";

const CONTROL_DEFAULTS = {
  warpThreshold: 0.82,
  throttleSmoothing: 9.5
};

/**
 * Creates the tactile dashboard: buttons, panels, rails, and draggable throttle.
 * All geometry is generated with Three.js primitives. No external models.
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

  const dashboardGroup = new THREE.Group();
  dashboardGroup.position.set(0, -0.95, 1.42);
  dashboardGroup.rotation.x = -0.18;
  scene.add(dashboardGroup);

  let leverHandle;
  let leverKnob;

  createDashboardShell(dashboardGroup);
  createCenterDisplay(dashboardGroup);
  createButtonBanks(dashboardGroup, interactiveObjects);
  createThrottleLever(dashboardGroup, interactiveObjects);
  createSideRails(dashboardGroup);

  canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  canvas.addEventListener("pointermove", onPointerMove, { passive: false });
  canvas.addEventListener("pointerup", onPointerUp, { passive: true });
  canvas.addEventListener("pointercancel", onPointerUp, { passive: true });

  function createDashboardShell(parent) {
    const shellMaterial = new THREE.MeshStandardMaterial({
      color: 0x07101f,
      metalness: 0.72,
      roughness: 0.34
    });

    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f2338,
      metalness: 0.58,
      roughness: 0.29,
      emissive: 0x061c2e,
      emissiveIntensity: 0.18
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.46, 3.05), shellMaterial);
    base.position.set(0, -0.08, 0);
    parent.add(base);

    const upperPanel = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.16, 1.32), topMaterial);
    upperPanel.position.set(0, 0.25, -0.58);
    upperPanel.rotation.x = -0.06;
    parent.add(upperPanel);

    const lip = new THREE.Mesh(new THREE.BoxGeometry(7.9, 0.28, 0.24), shellMaterial);
    lip.position.set(0, 0.28, 1.54);
    parent.add(lip);
  }

  function createCenterDisplay(parent) {
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x0b1729,
      metalness: 0.55,
      roughness: 0.32
    });

    const screenMaterial = new THREE.MeshStandardMaterial({
      color: 0x07182b,
      emissive: 0x19d3ff,
      emissiveIntensity: 0.34,
      metalness: 0.1,
      roughness: 0.18,
      transparent: true,
      opacity: 0.82
    });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.12, 1.12), frameMaterial);
    frame.position.set(0, 0.43, -0.63);
    parent.add(frame);

    const screen = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.055, 0.82), screenMaterial);
    screen.position.set(0, 0.52, -0.62);
    parent.add(screen);

    const gridMaterial = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.18
    });

    for (let i = -3; i <= 3; i += 1) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.012, 0.76), gridMaterial);
      line.position.set(i * 0.32, 0.56, -0.615);
      parent.add(line);
    }

    for (let i = -1; i <= 1; i += 1) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.012, 0.012), gridMaterial);
      line.position.set(0, 0.565, -0.615 + i * 0.22);
      parent.add(line);
    }
  }

  function createButtonBanks(parent, targets) {
    const buttons = [
      { label: "Tasks", command: "tasks", x: -2.75, z: 0.45, color: 0x67e8f9 },
      { label: "Report", command: "report", x: -1.85, z: 0.45, color: 0xfacc15 },
      { label: "History", command: "history", x: -2.75, z: 1.05, color: 0xa78bfa },
      { label: "Voice", command: "voice", x: -1.85, z: 1.05, color: 0x86efac },
      { label: "Open", command: "open", x: 1.8, z: 0.45, color: 0x60a5fa },
      { label: "Focus", command: "focus", x: 2.7, z: 0.45, color: 0x67e8f9 },
      { label: "Notes", command: "notes", x: 1.8, z: 1.05, color: 0xfb7185 },
      { label: "Next", command: "next", x: 2.7, z: 1.05, color: 0x86efac }
    ];

    buttons.forEach((item) => {
      const button = createConsoleButton(item);
      parent.add(button);
      targets.push(button.userData.cap);
    });
  }

  function createConsoleButton({ label, command, x, z, color }) {
    const group = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.12, 0.44),
      new THREE.MeshStandardMaterial({
        color: 0x07101f,
        metalness: 0.6,
        roughness: 0.28
      })
    );

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.24, 0.16, 36),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.45,
        roughness: 0.22,
        metalness: 0.18
      })
    );

    cap.rotation.x = Math.PI / 2;
    cap.position.y = 0.13;
    cap.userData = {
      type: "button",
      command,
      label,
      defaultY: cap.position.y
    };

    group.position.set(x, 0.35, z);
    group.userData = {
      type: "buttonGroup",
      command,
      label,
      cap
    };

    group.add(base);
    group.add(cap);

    return group;
  }

  function createThrottleLever(parent, targets) {
    const leverGroup = new THREE.Group();
    leverGroup.position.set(0, 0.34, 1.03);
    parent.add(leverGroup);

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a1628,
      metalness: 0.72,
      roughness: 0.26
    });

    const glowMaterial = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x67e8f9,
      emissiveIntensity: 0.55,
      roughness: 0.18
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.58, 0.16, 48), baseMaterial);
    base.position.set(0, 0, 0);
    base.rotation.x = Math.PI / 2;
    leverGroup.add(base);

    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.018, 10, 72, Math.PI * 1.1), glowMaterial);
    arc.position.set(0, 0.05, 0);
    arc.rotation.set(Math.PI / 2, 0, Math.PI * 0.95);
    leverGroup.add(arc);

    leverHandle = new THREE.Group();
    leverHandle.rotation.z = getLeverRotationFromThrottle(0);
    leverGroup.add(leverHandle);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.07, 0.95, 24),
      new THREE.MeshStandardMaterial({
        color: 0xd9f8ff,
        metalness: 0.86,
        roughness: 0.2,
        emissive: 0x14384b,
        emissiveIntensity: 0.2
      })
    );

    stem.position.set(0, 0.45, 0);
    stem.rotation.z = 0.16;

    leverKnob = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 32, 20),
      new THREE.MeshStandardMaterial({
        color: 0xf8fdff,
        metalness: 0.3,
        roughness: 0.16,
        emissive: 0x67e8f9,
        emissiveIntensity: 0.48
      })
    );

    leverKnob.position.set(0.08, 0.91, 0);
    leverKnob.userData = {
      type: "lever",
      label: "Throttle"
    };

    leverHandle.add(stem);
    leverHandle.add(leverKnob);
    targets.push(leverKnob);
  }

  function createSideRails(parent) {
    const railMaterial = new THREE.MeshStandardMaterial({
      color: 0x10243a,
      metalness: 0.8,
      roughness: 0.28,
      emissive: 0x071526,
      emissiveIntensity: 0.15
    });

    [-3.6, 3.6].forEach((x) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 3.2), railMaterial);
      rail.position.set(x, 0.28, 0.08);
      rail.rotation.z = x < 0 ? -0.08 : 0.08;
      parent.add(rail);
    });
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
    button.position.y = button.userData.defaultY - 0.045;
    window.setTimeout(() => {
      button.position.y = button.userData.defaultY;
    }, 130);
  }

  function getLeverRotationFromThrottle(throttle) {
    return THREE.MathUtils.lerp(-0.58, 0.72, throttle);
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
    const target = interactiveObjects.find((object) => object.userData.command === command);
    if (!target || target.userData.type !== "button") return;
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
