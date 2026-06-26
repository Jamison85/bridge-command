import * as THREE from "three";
import { createBridgeRefitExtras } from "./bridgeRefitExtras.js";

export function createCinematicLighting(scene) {
  const group = new THREE.Group();
  group.name = "cinematic-lighting-rig";
  scene.add(group);

  const ambient = new THREE.HemisphereLight(0x567196, 0x010308, 0.22);
  const windowWash = new THREE.DirectionalLight(0x7bb2de, 0.86);
  const consoleGlow = new THREE.PointLight(0x2ca3bc, 0.9, 8.5, 1.95);
  const leftConsoleGlow = new THREE.PointLight(0x3e66a8, 0.62, 6.8, 2.1);
  const rightConsoleGlow = new THREE.PointLight(0x3db0c6, 0.62, 6.8, 2.1);
  const overheadGlow = new THREE.PointLight(0x4b8ab2, 0.62, 7.4, 1.95);
  const amberLeft = new THREE.PointLight(0xd19128, 0.18, 5.6, 2.1);
  const amberRight = new THREE.PointLight(0xd19128, 0.18, 5.6, 2.1);
  const alertGlow = new THREE.PointLight(0xe0a12a, 0.14, 7, 2.0);

  windowWash.position.set(0, 5.8, -5.9);
  windowWash.target.position.set(0, 1.15, 1.2);
  consoleGlow.position.set(0, 0.24, 2.05);
  leftConsoleGlow.position.set(-3.75, 0.76, 1.05);
  rightConsoleGlow.position.set(3.75, 0.76, 1.05);
  overheadGlow.position.set(0, 3.86, 0.3);
  amberLeft.position.set(-2.9, 0.66, 2.25);
  amberRight.position.set(2.9, 0.66, 2.25);
  alertGlow.position.set(0, 1.88, 2.7);

  group.add(ambient, windowWash, windowWash.target, consoleGlow, leftConsoleGlow, rightConsoleGlow, overheadGlow, amberLeft, amberRight, alertGlow);

  const refit = createPhysicalRefitLayer();
  const extras = createBridgeRefitExtras(scene);
  scene.add(refit.group);

  function update(delta, elapsed, { throttle = 0, warpActive = false } = {}) {
    const pulse = 0.5 + Math.sin(elapsed * 2.1) * 0.5;
    const slowPulse = 0.5 + Math.sin(elapsed * 0.72) * 0.5;

    consoleGlow.intensity = 0.84 + throttle * 0.65 + pulse * 0.08;
    leftConsoleGlow.intensity = 0.52 + slowPulse * 0.12 + throttle * 0.2;
    rightConsoleGlow.intensity = 0.52 + (1 - slowPulse) * 0.12 + throttle * 0.2;
    overheadGlow.intensity = 0.56 + throttle * 0.14;
    amberLeft.intensity = 0.12 + pulse * 0.06 + throttle * 0.08;
    amberRight.intensity = 0.12 + (1 - pulse) * 0.06 + throttle * 0.08;
    alertGlow.intensity = THREE.MathUtils.lerp(alertGlow.intensity, warpActive ? 0.92 + pulse * 0.34 : 0.12 + throttle * 0.08, 1 - Math.exp(-delta * 6));
    windowWash.intensity = 0.76 + throttle * 0.26 + (warpActive ? pulse * 0.2 : 0);
    refit.update(delta, elapsed, throttle, warpActive);
    extras.update(delta, elapsed, throttle, warpActive);
  }

  return { group, update };
}

function createPhysicalRefitLayer() {
  const group = new THREE.Group();
  group.name = "physical-bridge-refit-layer";

  const dark = mat(0x030812, 0x010409, 0.05, 0.76, 0.5);
  const mid = mat(0x09192b, 0x020913, 0.07, 0.68, 0.44);
  const inset = mat(0x02060d, 0x01060c, 0.05, 0.42, 0.62);
  const cyan = glow(0x5cc4dd, 0.42);
  const blue = glow(0x4b7ecf, 0.36);
  const amber = glow(0xd99f2a, 0.44);
  const metal = mat(0xaeb9c2, 0x0a1825, 0.06, 0.62, 0.22);
  const transparent = new THREE.MeshBasicMaterial({ color: 0x7bdaf0, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });

  box(group, 1.55, 1.8, 2.0, [-3.7, -0.3, 4.08], dark, [0, 0.28, 0]);
  box(group, 1.55, 1.8, 2.0, [3.7, -0.3, 4.08], dark, [0, -0.28, 0]);
  box(group, 8.0, 0.72, 1.15, [0, -0.62, 4.18], dark, [-0.08, 0, 0]);
  box(group, 3.1, 0.26, 0.74, [0, 0.06, 3.78], mid);
  strip(group, [0, -0.16, 3.5], [2.1, 0.028, 0.04], amber);

  for (const side of [-1, 1]) {
    box(group, 0.18, 2.9, 3.2, [side * 4.95, 1.88, -2.0], dark, [0, side * -0.12, 0]);
    box(group, 0.12, 0.7, 1.05, [side * 5.18, 1.2, -1.0], inset, [0, side * -0.12, 0]);
    box(group, 0.12, 0.7, 1.05, [side * 5.18, 2.0, -2.05], inset, [0, side * -0.12, 0]);
    box(group, 0.12, 0.7, 1.05, [side * 5.18, 2.8, -3.1], inset, [0, side * -0.12, 0]);
    strip(group, [side * 4.52, 0.86, 1.05], [0.9, 0.024, 0.04], amber, [0, side * -0.42, 0]);
  }

  const leftPane = pane([-2.25, 1.24, -0.26], [0, 0.38, 0], 0.72);
  const rightPane = pane([2.25, 1.24, -0.26], [0, -0.38, 0], 0.72);
  const topScan = strip(group, [0, 2.16, -0.38], [1.6, 0.018, 0.026], cyan);

  const lever = new THREE.Group();
  lever.position.set(0.58, -0.02, 2.92);
  lever.rotation.x = -0.22;
  group.add(lever);
  box(lever, 0.62, 0.22, 0.52, [0, 0, 0], inset);
  strip(lever, [0, 0.15, -0.18], [0.48, 0.018, 0.03], cyan);
  box(lever, 0.1, 0.82, 0.1, [0.05, 0.46, 0], metal, [0, 0, -0.16]);
  box(lever, 0.22, 0.36, 0.18, [0.17, 0.88, 0], metal, [0, 0, -0.16]);
  box(lever, 0.28, 0.1, 0.28, [0.14, 1.08, 0], metal, [0, 0, -0.16]);

  function pane(pos, rot, scale) {
    const g = new THREE.Group();
    g.position.set(...pos);
    g.rotation.set(...rot);
    g.scale.setScalar(scale);
    group.add(g);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.62), transparent.clone());
    g.add(p);
    strip(g, [0, 0.34, 0.01], [0.82, 0.012, 0.012], cyan);
    strip(g, [0, -0.34, 0.01], [0.82, 0.012, 0.012], cyan);
    for (let i = 0; i < 3; i += 1) strip(g, [0, -0.12 + i * 0.12, 0.02], [0.42, 0.008, 0.008], i === 1 ? amber : blue);
    return g;
  }

  function update(delta, elapsed, throttle, warpActive) {
    const lift = Math.sin(elapsed * 0.9) * 0.01;
    leftPane.position.y = 1.24 + lift;
    rightPane.position.y = 1.24 - lift;
    topScan.position.x = Math.sin(elapsed * 1.6) * 0.18;
    lever.rotation.z = THREE.MathUtils.lerp(0.22, -0.42, throttle);
    group.position.x = warpActive ? Math.sin(elapsed * 14) * 0.006 : 0;
  }

  return { group, update };
}

function mat(color, emissive, emissiveIntensity, metalness, roughness) { return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity, metalness, roughness }); }
function glow(color, intensity) { return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, metalness: 0.12, roughness: 0.3 }); }
function box(parent, w, h, d, pos, material, rot = [0, 0, 0]) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(...pos); mesh.rotation.set(...rot); parent.add(mesh); return mesh; }
function strip(parent, pos, scale, material, rot = [0, 0, 0]) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material); mesh.position.set(...pos); mesh.scale.set(...scale); mesh.rotation.set(...rot); parent.add(mesh); return mesh; }