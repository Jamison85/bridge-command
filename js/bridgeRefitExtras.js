import * as THREE from "three";

export function createBridgeRefitExtras(scene) {
  const group = new THREE.Group();
  group.name = "bridge-refit-extras";
  scene.add(group);

  const dark = mat(0x02050c, 0x000204, 0.04, 0.75, 0.55);
  const panel = mat(0x061324, 0x010710, 0.06, 0.68, 0.48);
  const inset = mat(0x01040a, 0x000409, 0.05, 0.4, 0.65);
  const cyan = glow(0x5ac3d9, 0.32);
  const blue = glow(0x4a78c4, 0.28);
  const amber = glow(0xd5982c, 0.38);
  const glass = new THREE.MeshBasicMaterial({ color: 0x6fd0e8, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide });

  const animated = [];

  addWindowDepth();
  addSideRibs();
  addOverheadDetails();
  addHologramLayers();
  addHardwareNavFacade();

  function addWindowDepth() {
    box(9.4, 0.18, 0.42, [0, 4.18, -5.45], dark);
    box(9.4, 0.18, 0.42, [0, 0.94, -5.45], dark);
    box(0.18, 3.18, 0.4, [-4.72, 2.55, -5.45], dark, [0, 0, -0.1]);
    box(0.18, 3.18, 0.4, [4.72, 2.55, -5.45], dark, [0, 0, 0.1]);
    strip([0, 1.08, -5.18], [5.8, 0.02, 0.035], blue);
    strip([0, 3.98, -5.18], [5.4, 0.02, 0.035], cyan);
  }

  function addSideRibs() {
    [-1, 1].forEach((side) => {
      for (let i = 0; i < 5; i += 1) {
        box(0.08, 2.55, 0.22, [side * 5.48, 1.85, -3.8 + i * 1.08], panel, [0, side * -0.16, 0]);
      }

      for (let i = 0; i < 4; i += 1) {
        const vent = box(0.09, 0.48, 0.86, [side * 5.18, 1.18 + i * 0.55, -0.72 - i * 0.78], inset, [0, side * -0.12, 0]);
        animated.push(vent);
      }
    });
  }

  function addOverheadDetails() {
    box(6.8, 0.16, 0.38, [0, 3.72, 1.05], dark);
    strip([0, 3.6, 1.26], [4.6, 0.02, 0.03], cyan);
    strip([-2.8, 3.58, 0.38], [0.04, 0.02, 1.25], blue);
    strip([2.8, 3.58, 0.38], [0.04, 0.02, 1.25], blue);
  }

  function addHologramLayers() {
    const left = pane([-1.95, 1.26, -0.34], [0, 0.34, 0]);
    const right = pane([1.95, 1.26, -0.34], [0, -0.34, 0]);
    const scan = strip([0, 2.02, -0.34], [1.5, 0.014, 0.02], cyan);
    animated.push(left, right, scan);
  }

  function addHardwareNavFacade() {
    box(4.9, 0.26, 0.5, [0, -0.32, 3.42], dark, [-0.1, 0, 0]);
    [-1.9, -0.95, 0, 0.95, 1.9].forEach((x, i) => {
      box(0.72, 0.08, 0.28, [x, -0.12, 3.28], inset, [-0.12, 0, 0]);
      strip([x, -0.06, 3.12], [0.42, 0.012, 0.02], i === 4 ? cyan : i === 2 ? amber : blue, [-0.12, 0, 0]);
    });
  }

  function pane(pos, rot) {
    const g = new THREE.Group();
    g.position.set(...pos);
    g.rotation.set(...rot);
    group.add(g);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.48), glass.clone());
    g.add(p);
    stripLocal(g, [0, 0.27, 0.02], [0.68, 0.01, 0.01], cyan);
    stripLocal(g, [0, -0.27, 0.02], [0.68, 0.01, 0.01], cyan);
    for (let i = 0; i < 3; i += 1) stripLocal(g, [0, -0.1 + i * 0.1, 0.03], [0.38, 0.006, 0.006], i === 1 ? amber : blue);
    return g;
  }

  function update(delta, elapsed, throttle, warpActive) {
    animated.forEach((obj, index) => {
      obj.position.y += Math.sin(elapsed * (0.7 + index * 0.04)) * 0.0007;
    });
    group.position.x = warpActive ? Math.sin(elapsed * 13) * 0.005 : 0;
  }

  function box(w, h, d, pos, material, rot = [0, 0, 0]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    group.add(mesh);
    return mesh;
  }

  function strip(pos, scale, material, rot = [0, 0, 0]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    mesh.position.set(...pos);
    mesh.scale.set(...scale);
    mesh.rotation.set(...rot);
    group.add(mesh);
    return mesh;
  }

  function stripLocal(parent, pos, scale, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    mesh.position.set(...pos);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }

  return { group, update };
}

function mat(color, emissive, emissiveIntensity, metalness, roughness) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity, metalness, roughness });
}

function glow(color, intensity) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, metalness: 0.12, roughness: 0.34 });
}
