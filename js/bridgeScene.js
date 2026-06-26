import * as THREE from "three";
import { createBridgeMaterials } from "./materials.js";

/**
 * Builds the physical cockpit: bridge shell, forward window, curved console,
 * side stations, floor panels, glow seams, and depth layers.
 */
export function createBridgeEnvironment(scene) {
  const materials = createBridgeMaterials();
  const group = new THREE.Group();
  group.name = "cinematic-bridge-environment";
  scene.add(group);

  const glowStrips = [];
  const screenPanels = [];

  createBridgeShell();
  createForwardWindow();
  createCurvedMainConsole();
  createSideStations();
  createOverheadArch();
  createFloorPanels();
  createRearDepthPanels();

  function createBridgeShell() {
    const rearWall = new THREE.Mesh(new THREE.BoxGeometry(13.2, 5.2, 0.42), materials.hullDark);
    rearWall.position.set(0, 2.15, -5.75);
    group.add(rearWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.42, 4.6, 7.8), materials.hullMid);
    leftWall.position.set(-6.2, 2.0, -1.75);
    leftWall.rotation.y = 0.15;
    group.add(leftWall);

    const rightWall = leftWall.clone();
    rightWall.position.x = 6.2;
    rightWall.rotation.y = -0.15;
    group.add(rightWall);

    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(12.3, 0.38, 7.3), materials.hullWarm);
    ceiling.position.set(0, 4.35, -1.4);
    group.add(ceiling);

    const ceilingInset = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.08, 4.2), materials.consoleInset);
    ceilingInset.position.set(0, 4.08, -0.95);
    group.add(ceilingInset);

    addGlowStrip({ position: [0, 4.0, 0.85], scale: [4.2, 0.035, 0.08], material: materials.cyanGlow });
    addGlowStrip({ position: [-3.15, 3.92, -1.7], scale: [0.08, 0.035, 2.4], material: materials.blueGlow });
    addGlowStrip({ position: [3.15, 3.92, -1.7], scale: [0.08, 0.035, 2.4], material: materials.blueGlow });
  }

  function createForwardWindow() {
    const frameMaterial = materials.hullMid;
    const z = -5.34;

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.45), materials.windowGlass);
    glass.position.set(0, 2.52, z + 0.05);
    group.add(glass);

    const top = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.26, 0.36), frameMaterial);
    top.position.set(0, 3.88, z);
    group.add(top);

    const bottom = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.28, 0.36), frameMaterial);
    bottom.position.set(0, 1.18, z);
    group.add(bottom);

    const left = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.85, 0.36), frameMaterial);
    left.position.set(-4.25, 2.52, z);
    left.rotation.z = -0.08;
    group.add(left);

    const right = left.clone();
    right.position.x = 4.25;
    right.rotation.z = 0.08;
    group.add(right);

    const centerRib = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.52, 0.34), frameMaterial);
    centerRib.position.set(0, 2.52, z + 0.01);
    group.add(centerRib);

    addGlowStrip({ position: [0, 1.36, z + 0.22], scale: [5.9, 0.04, 0.055], material: materials.cyanGlow });
    addGlowStrip({ position: [0, 3.67, z + 0.22], scale: [5.9, 0.04, 0.055], material: materials.blueGlow });
  }

  function createCurvedMainConsole() {
    const deck = new THREE.Group();
    deck.name = "curved-main-console";
    deck.position.set(0, -0.36, 2.0);
    group.add(deck);

    const centerBase = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.72, 1.95), materials.hullDark);
    centerBase.position.set(0, 0.18, 0);
    centerBase.rotation.x = -0.08;
    deck.add(centerBase);

    const centerTop = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.18, 1.55), materials.consoleTop);
    centerTop.position.set(0, 0.62, -0.02);
    centerTop.rotation.x = -0.1;
    deck.add(centerTop);

    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.58, 1.75), materials.hullMid);
    leftWing.position.set(-3.02, 0.22, -0.05);
    leftWing.rotation.set(-0.1, 0.24, 0.02);
    deck.add(leftWing);

    const rightWing = leftWing.clone();
    rightWing.position.x = 3.02;
    rightWing.rotation.y = -0.24;
    deck.add(rightWing);

    const leftTop = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.14, 1.34), materials.consoleTop);
    leftTop.position.set(-3.04, 0.58, -0.06);
    leftTop.rotation.set(-0.1, 0.24, 0.02);
    deck.add(leftTop);

    const rightTop = leftTop.clone();
    rightTop.position.x = 3.04;
    rightTop.rotation.y = -0.24;
    deck.add(rightTop);

    const lowerLip = new THREE.Mesh(new THREE.BoxGeometry(7.9, 0.36, 0.34), materials.hullDark);
    lowerLip.position.set(0, 0.16, 1.04);
    deck.add(lowerLip);

    addGlowStrip({ parent: deck, position: [0, 0.78, -0.88], scale: [2.85, 0.04, 0.055], material: materials.cyanGlow });
    addGlowStrip({ parent: deck, position: [-3.08, 0.73, -0.84], rotation: [0, 0.24, 0], scale: [1.7, 0.035, 0.05], material: materials.blueGlow });
    addGlowStrip({ parent: deck, position: [3.08, 0.73, -0.84], rotation: [0, -0.24, 0], scale: [1.7, 0.035, 0.05], material: materials.blueGlow });

    createInsetPanels(deck);
  }

  function createInsetPanels(parent) {
    const panelPositions = [
      [-1.2, 0.73, -0.17, 0],
      [1.2, 0.73, -0.17, 0],
      [-3.02, 0.69, -0.14, 0.24],
      [3.02, 0.69, -0.14, -0.24]
    ];

    panelPositions.forEach(([x, y, z, ry], index) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.035, 0.52), materials.consoleInset);
      panel.position.set(x, y, z);
      panel.rotation.y = ry;
      parent.add(panel);
      screenPanels.push(panel);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.018, 0.035), index % 2 ? materials.blueGlow : materials.cyanGlow);
      strip.position.set(x, y + 0.04, z - 0.18);
      strip.rotation.y = ry;
      parent.add(strip);
      glowStrips.push(strip);
    });
  }

  function createSideStations() {
    [-1, 1].forEach((side) => {
      const station = new THREE.Group();
      station.position.set(side * 4.85, 0.12, 0.15);
      station.rotation.y = side * -0.48;
      group.add(station);

      const base = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.62, 3.1), materials.hullMid);
      base.position.set(0, 0.28, 0);
      station.add(base);

      const top = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.13, 2.45), materials.consoleTop);
      top.position.set(0, 0.68, -0.06);
      station.add(top);

      const upperScreen = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.06, 0.82), materials.consoleInset);
      upperScreen.position.set(0, 0.78, -0.78);
      station.add(upperScreen);
      screenPanels.push(upperScreen);

      addGlowStrip({ parent: station, position: [0, 0.86, -1.22], scale: [1.05, 0.035, 0.05], material: side < 0 ? materials.blueGlow : materials.cyanGlow });
      addGlowStrip({ parent: station, position: [0, 0.78, 0.92], scale: [1.28, 0.035, 0.05], material: materials.amberGlow });

      for (let i = 0; i < 5; i += 1) {
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 10), i % 2 ? materials.cyanGlow : materials.blueGlow);
        light.position.set(-0.5 + i * 0.25, 0.82, 0.22);
        station.add(light);
        glowStrips.push(light);
      }
    });
  }

  function createOverheadArch() {
    const arch = new THREE.Group();
    arch.name = "overhead-command-arch";
    arch.position.set(0, 3.34, 0.9);
    group.add(arch);

    const beam = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.36, 0.42), materials.hullMid);
    beam.position.set(0, 0, 0);
    arch.add(beam);

    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.1, 0.34), materials.hullDark);
    leftPost.position.set(-3.95, -1.05, 0.05);
    leftPost.rotation.z = -0.16;
    arch.add(leftPost);

    const rightPost = leftPost.clone();
    rightPost.position.x = 3.95;
    rightPost.rotation.z = 0.16;
    arch.add(rightPost);

    addGlowStrip({ parent: arch, position: [0, -0.23, 0.26], scale: [5.6, 0.04, 0.045], material: materials.cyanGlow });
  }

  function createFloorPanels() {
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.6, 0.18, 72), materials.hullDark);
    floor.position.set(0, -1.18, -0.3);
    floor.scale.z = 0.82;
    group.add(floor);

    const ringMaterial = materials.consoleInset;

    [1.8, 3.15, 4.5].forEach((radius) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012, 8, 96), ringMaterial);
      ring.position.set(0, -1.06, 0.0);
      ring.rotation.x = Math.PI / 2;
      ring.scale.y = 0.78;
      group.add(ring);
    });

    addGlowStrip({ position: [0, -0.96, 2.9], scale: [2.7, 0.035, 0.055], material: materials.blueGlow });
  }

  function createRearDepthPanels() {
    [-2.8, 0, 2.8].forEach((x, index) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.1, 0.08), materials.consoleInset);
      panel.position.set(x, 2.05, -5.48);
      group.add(panel);
      screenPanels.push(panel);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.035, 0.035), index === 1 ? materials.cyanGlow : materials.blueGlow);
      strip.position.set(x, 2.62, -5.4);
      group.add(strip);
      glowStrips.push(strip);
    });
  }

  function addGlowStrip({ parent = group, position, rotation = [0, 0, 0], scale, material }) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    strip.position.set(...position);
    strip.rotation.set(...rotation);
    strip.scale.set(...scale);
    parent.add(strip);
    glowStrips.push(strip);
    return strip;
  }

  function update(delta, elapsed, { throttle = 0, warpActive = false } = {}) {
    const pulse = 0.62 + Math.sin(elapsed * 2.1) * 0.38;
    const calmPulse = 0.75 + Math.sin(elapsed * 0.75) * 0.25;

    glowStrips.forEach((strip, index) => {
      const material = strip.material;
      if (!material?.emissiveIntensity) return;
      const variation = Math.sin(elapsed * (0.8 + index * 0.037)) * 0.12;
      material.emissiveIntensity = 0.9 + throttle * 0.65 + variation + (warpActive ? pulse * 0.75 : calmPulse * 0.12);
    });

    screenPanels.forEach((panel, index) => {
      panel.material.emissiveIntensity = 0.16 + Math.sin(elapsed * 1.7 + index) * 0.05 + throttle * 0.08;
    });

    group.position.z = warpActive ? Math.sin(elapsed * 16) * 0.01 : 0;
    group.position.x = warpActive ? Math.sin(elapsed * 13.5) * 0.008 : 0;
  }

  return {
    group,
    materials,
    update
  };
}
