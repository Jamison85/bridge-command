import * as THREE from "three";

export function createBridgeRefitExtras(scene) {
  const group = new THREE.Group();
  group.name = "premium-cockpit-composition";
  scene.add(group);

  const dark = mat(0x010309, 0x000102, 0.025, 0.78, 0.6);
  const shell = mat(0x040b15, 0x01040a, 0.04, 0.72, 0.54);
  const panel = mat(0x081524, 0x01070f, 0.045, 0.66, 0.48);
  const inset = mat(0x01050b, 0x000205, 0.035, 0.42, 0.66);
  const blue = glow(0x3f66ad, 0.16);
  const cyan = glow(0x4daec4, 0.16);
  const amber = glow(0xc58c2a, 0.24);
  const glass = new THREE.MeshBasicMaterial({ color: 0x6bcbe0, transparent: true, opacity: 0.04, depthWrite: false, side: THREE.DoubleSide });
  const animated = [];

  foregroundConsole();
  forwardWindow();
  sideWalls();
  overheadArch();
  sideConsoles();
  embeddedCommandDeck();
  smallHoloLayers();

  function foregroundConsole() {
    box(9.2, 0.82, 1.72, [0, -0.82, 4.52], dark, [-0.08, 0, 0]);
    box(6.9, 0.52, 1.32, [0, -0.32, 3.88], shell, [-0.12, 0, 0]);
    box(3.0, 0.3, 0.82, [0, 0.03, 3.36], panel, [-0.18, 0, 0]);
    box(2.15, 0.08, 0.5, [0, 0.23, 3.04], inset, [-0.18, 0, 0]);
    strip([0, 0.3, 2.94], [1.0, 0.014, 0.02], amber, [-0.18, 0, 0]);
    box(1.55, 1.1, 1.3, [-3.5, -0.36, 4.14], dark, [0, 0.22, 0]);
    box(1.55, 1.1, 1.3, [3.5, -0.36, 4.14], dark, [0, -0.22, 0]);
  }

  function forwardWindow() {
    const z = -4.78;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.05), glass);
    pane.position.set(0, 2.2, z + 0.08);
    group.add(pane);
    box(7.6, 0.42, 0.54, [0, 3.46, z], dark);
    box(7.8, 0.42, 0.6, [0, 0.9, z], dark);
    box(0.42, 2.56, 0.56, [-3.86, 2.2, z], dark, [0, 0, -0.12]);
    box(0.42, 2.56, 0.56, [3.86, 2.2, z], dark, [0, 0, 0.12]);
    box(0.18, 2.18, 0.36, [0, 2.2, z + 0.04], shell);
    strip([0, 1.05, z + 0.22], [3.5, 0.012, 0.02], blue);
    strip([0, 3.22, z + 0.22], [2.8, 0.012, 0.02], cyan);
  }

  function sideWalls() {
    for (const side of [-1, 1]) {
      box(1.6, 3.55, 4.9, [side * 4.18, 1.22, 0.9], shell, [0, side * -0.5, 0]);
      box(0.82, 2.9, 3.4, [side * 4.78, 1.52, -1.26], dark, [0, side * -0.24, 0]);
      box(1.15, 1.25, 1.45, [side * 3.55, 0.18, 3.05], dark, [-0.08, side * -0.42, 0]);
      for (let i = 0; i < 6; i += 1) box(0.08, 1.78, 0.3, [side * 4.05, 1.34, -2.72 + i * 0.86], panel, [0, side * -0.42, 0]);
      for (let i = 0; i < 5; i += 1) animated.push(sphere(0.04, [side * 3.62, 0.66 + i * 0.18, 1.84 - i * 0.1], i % 2 ? blue : amber));
    }
  }

  function overheadArch() {
    box(8.6, 0.52, 0.74, [0, 2.78, 2.0], dark, [0.04, 0, 0]);
    box(0.44, 2.0, 0.54, [-3.55, 1.86, 1.86], shell, [0, 0, -0.18]);
    box(0.44, 2.0, 0.54, [3.55, 1.86, 1.86], shell, [0, 0, 0.18]);
    box(5.4, 0.18, 0.38, [0, 2.42, 1.5], panel, [0.02, 0, 0]);
    strip([0, 2.48, 1.24], [1.9, 0.012, 0.018], cyan);
    strip([-2.75, 2.38, 0.92], [0.03, 0.012, 0.55], blue);
    strip([2.75, 2.38, 0.92], [0.03, 0.012, 0.55], blue);
  }

  function sideConsoles() {
    for (const side of [-1, 1]) {
      const root = new THREE.Group();
      root.position.set(side * 3.25, -0.1, 2.52);
      root.rotation.y = side * -0.48;
      group.add(root);
      localBox(root, 2.15, 0.56, 1.85, [0, 0, 0], shell, [-0.12, 0, 0]);
      localBox(root, 1.55, 0.08, 1.05, [0, 0.36, -0.18], inset, [-0.16, 0, 0]);
      localStrip(root, [0, 0.43, -0.58], [0.62, 0.01, 0.016], side < 0 ? blue : amber);
      for (let i = 0; i < 5; i += 1) localBox(root, 0.09, 0.03, 0.18, [-0.44 + i * 0.22, 0.43, 0.14], i % 2 ? cyan : amber);
    }
  }

  function embeddedCommandDeck() {
    box(5.6, 0.2, 0.7, [0, -0.42, 3.28], dark, [-0.1, 0, 0]);
    [-2, -1, 0, 1, 2].forEach((x, i) => {
      box(0.72, 0.055, 0.24, [x, -0.22, 3.08], inset, [-0.12, 0, 0]);
      strip([x, -0.18, 2.96], [0.26, 0.008, 0.014], i === 4 ? amber : blue, [-0.12, 0, 0]);
    });
  }

  function smallHoloLayers() {
    for (const side of [-1, 1]) {
      const root = new THREE.Group();
      root.position.set(side * 1.52, 1.28, -0.55);
      root.rotation.y = side * -0.35;
      group.add(root);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.28), glass.clone());
      root.add(pane);
      localStrip(root, [0, 0.18, 0.02], [0.36, 0.006, 0.006], cyan);
      localStrip(root, [0, -0.18, 0.02], [0.36, 0.006, 0.006], cyan);
      animated.push(root);
    }
  }

  function update(delta, elapsed, throttle, warpActive) {
    animated.forEach((item, index) => {
      item.position.y += Math.sin(elapsed * (0.7 + index * 0.04)) * 0.0005;
      if (item.material?.emissiveIntensity !== undefined) item.material.emissiveIntensity = 0.14 + Math.sin(elapsed * 1.8 + index) * 0.03 + throttle * 0.06;
    });
    group.position.x = warpActive ? Math.sin(elapsed * 13) * 0.004 : 0;
  }

  function box(w, h, d, position, material, rotation = [0, 0, 0]) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(...position); mesh.rotation.set(...rotation); group.add(mesh); return mesh; }
  function localBox(parent, w, h, d, position, material, rotation = [0, 0, 0]) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(...position); mesh.rotation.set(...rotation); parent.add(mesh); return mesh; }
  function strip(position, scale, material, rotation = [0, 0, 0]) { const mesh = box(1, 1, 1, position, material, rotation); mesh.scale.set(...scale); return mesh; }
  function localStrip(parent, position, scale, material, rotation = [0, 0, 0]) { const mesh = localBox(parent, 1, 1, 1, position, material, rotation); mesh.scale.set(...scale); return mesh; }
  function sphere(radius, position, material) { const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), material); mesh.position.set(...position); group.add(mesh); return mesh; }

  return { group, update };
}

function mat(color, emissive, emissiveIntensity, metalness, roughness) { return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity, metalness, roughness }); }
function glow(color, intensity) { return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, metalness: 0.1, roughness: 0.4 }); }
