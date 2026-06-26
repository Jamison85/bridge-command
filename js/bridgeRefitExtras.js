import * as THREE from "three";

export function createBridgeRefitExtras(scene) {
  const group = new THREE.Group();
  group.name = "premium-cockpit-composition";
  scene.add(group);

  const dark = mat(0x01040a, 0x000102, 0.03, 0.78, 0.58);
  const shell = mat(0x050d18, 0x01040a, 0.05, 0.72, 0.5);
  const panel = mat(0x0a1828, 0x020812, 0.06, 0.66, 0.44);
  const inset = mat(0x020711, 0x000307, 0.04, 0.42, 0.64);
  const blue = glow(0x4a78c4, 0.22);
  const cyan = glow(0x5abfd6, 0.24);
  const amber = glow(0xd59a2c, 0.3);
  const glass = new THREE.MeshBasicMaterial({ color: 0x6bcbe0, transparent: true, opacity: 0.055, depthWrite: false, side: THREE.DoubleSide });
  const animated = [];

  foregroundConsole();
  forwardWindow();
  sideWalls();
  overheadArch();
  sideConsoles();
  embeddedCommandDeck();
  smallHoloLayers();

  function foregroundConsole() {
    box(8.8, 0.72, 1.55, [0, -0.72, 4.45], dark, [-0.08, 0, 0]);
    box(6.2, 0.42, 1.2, [0, -0.25, 3.74], shell, [-0.12, 0, 0]);
    box(2.6, 0.28, 0.82, [0, 0.08, 3.34], panel, [-0.18, 0, 0]);
    box(2.0, 0.08, 0.5, [0, 0.27, 3.04], inset, [-0.18, 0, 0]);
    strip([0, 0.34, 2.95], [1.42, 0.018, 0.026], amber, [-0.18, 0, 0]);
  }

  function forwardWindow() {
    const z = -4.86;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 2.3), glass);
    pane.position.set(0, 2.28, z + 0.08);
    group.add(pane);
    box(7.8, 0.34, 0.48, [0, 3.62, z], dark);
    box(7.8, 0.36, 0.56, [0, 0.9, z], dark);
    box(0.34, 2.7, 0.5, [-3.98, 2.25, z], dark, [0, 0, -0.12]);
    box(0.34, 2.7, 0.5, [3.98, 2.25, z], dark, [0, 0, 0.12]);
    box(0.16, 2.35, 0.34, [0, 2.25, z + 0.04], shell);
    strip([0, 1.06, z + 0.24], [4.3, 0.016, 0.025], blue);
    strip([0, 3.43, z + 0.24], [3.7, 0.016, 0.025], cyan);
  }

  function sideWalls() {
    for (const side of [-1, 1]) {
      box(1.15, 3.4, 4.6, [side * 4.85, 1.35, 0.65], shell, [0, side * -0.42, 0]);
      box(0.42, 2.8, 3.0, [side * 5.45, 1.65, -1.45], dark, [0, side * -0.16, 0]);
      for (let i = 0; i < 5; i += 1) box(0.08, 1.65, 0.28, [side * 4.66, 1.4, -2.55 + i * 0.95], panel, [0, side * -0.36, 0]);
      for (let i = 0; i < 4; i += 1) animated.push(sphere(0.045, [side * 4.28, 0.62 + i * 0.2, 1.52 - i * 0.08], i % 2 ? blue : amber));
    }
  }

  function overheadArch() {
    box(8.2, 0.42, 0.62, [0, 3.18, 1.38], dark, [0.04, 0, 0]);
    box(0.34, 2.1, 0.46, [-3.7, 2.18, 1.35], shell, [0, 0, -0.18]);
    box(0.34, 2.1, 0.46, [3.7, 2.18, 1.35], shell, [0, 0, 0.18]);
    strip([0, 2.92, 1.12], [3.0, 0.016, 0.024], cyan);
    strip([-2.6, 2.82, 0.72], [0.035, 0.014, 0.7], blue);
    strip([2.6, 2.82, 0.72], [0.035, 0.014, 0.7], blue);
  }

  function sideConsoles() {
    for (const side of [-1, 1]) {
      const root = new THREE.Group();
      root.position.set(side * 3.55, 0, 2.15);
      root.rotation.y = side * -0.42;
      group.add(root);
      localBox(root, 1.9, 0.48, 1.8, [0, 0, 0], shell, [-0.12, 0, 0]);
      localBox(root, 1.48, 0.08, 1.1, [0, 0.32, -0.18], inset, [-0.16, 0, 0]);
      localStrip(root, [0, 0.4, -0.62], [0.84, 0.012, 0.02], side < 0 ? blue : amber);
      for (let i = 0; i < 5; i += 1) localBox(root, 0.1, 0.035, 0.22, [-0.48 + i * 0.24, 0.42, 0.14], i % 2 ? cyan : amber);
    }
  }

  function embeddedCommandDeck() {
    box(5.4, 0.18, 0.62, [0, -0.36, 3.18], dark, [-0.1, 0, 0]);
    [-2, -1, 0, 1, 2].forEach((x, i) => {
      box(0.72, 0.06, 0.26, [x, -0.18, 3.02], inset, [-0.12, 0, 0]);
      strip([x, -0.13, 2.88], [0.34, 0.01, 0.016], i === 4 ? amber : blue, [-0.12, 0, 0]);
    });
  }

  function smallHoloLayers() {
    for (const side of [-1, 1]) {
      const root = new THREE.Group();
      root.position.set(side * 1.7, 1.22, -0.22);
      root.rotation.y = side * -0.35;
      group.add(root);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.36), glass.clone());
      root.add(pane);
      localStrip(root, [0, 0.22, 0.02], [0.48, 0.008, 0.008], cyan);
      localStrip(root, [0, -0.22, 0.02], [0.48, 0.008, 0.008], cyan);
      animated.push(root);
    }
  }

  function update(delta, elapsed, throttle, warpActive) {
    animated.forEach((item, index) => {
      item.position.y += Math.sin(elapsed * (0.7 + index * 0.04)) * 0.0006;
      if (item.material?.emissiveIntensity !== undefined) item.material.emissiveIntensity = 0.18 + Math.sin(elapsed * 1.8 + index) * 0.04 + throttle * 0.08;
    });
    group.position.x = warpActive ? Math.sin(elapsed * 13) * 0.005 : 0;
  }

  function box(w, h, d, position, material, rotation = [0, 0, 0]) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(...position); mesh.rotation.set(...rotation); group.add(mesh); return mesh; }
  function localBox(parent, w, h, d, position, material, rotation = [0, 0, 0]) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(...position); mesh.rotation.set(...rotation); parent.add(mesh); return mesh; }
  function strip(position, scale, material, rotation = [0, 0, 0]) { const mesh = box(1, 1, 1, position, material, rotation); mesh.scale.set(...scale); return mesh; }
  function localStrip(parent, position, scale, material, rotation = [0, 0, 0]) { const mesh = localBox(parent, 1, 1, 1, position, material, rotation); mesh.scale.set(...scale); return mesh; }
  function sphere(radius, position, material) { const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), material); mesh.position.set(...position); group.add(mesh); return mesh; }

  return { group, update };
}

function mat(color, emissive, emissiveIntensity, metalness, roughness) { return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity, metalness, roughness }); }
function glow(color, intensity) { return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, metalness: 0.1, roughness: 0.36 }); }
