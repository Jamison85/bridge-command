import * as THREE from "three";

/**
 * Shared procedural materials for the cinematic bridge scene.
 * Everything is generated in-browser so the app stays asset-light and GitHub Pages friendly.
 */
export function createBridgeMaterials() {
  const panelNoise = createPanelNoiseTexture();
  panelNoise.wrapS = THREE.RepeatWrapping;
  panelNoise.wrapT = THREE.RepeatWrapping;
  panelNoise.repeat.set(6, 6);

  const hullDark = new THREE.MeshStandardMaterial({
    color: 0x07101f,
    metalness: 0.72,
    roughness: 0.34,
    map: panelNoise,
    emissive: 0x020814,
    emissiveIntensity: 0.14
  });

  const hullMid = new THREE.MeshStandardMaterial({
    color: 0x0f1f34,
    metalness: 0.64,
    roughness: 0.38,
    map: panelNoise,
    emissive: 0x03101f,
    emissiveIntensity: 0.12
  });

  const hullWarm = new THREE.MeshStandardMaterial({
    color: 0x142235,
    metalness: 0.52,
    roughness: 0.42,
    map: panelNoise,
    emissive: 0x07111f,
    emissiveIntensity: 0.1
  });

  const consoleTop = new THREE.MeshStandardMaterial({
    color: 0x10263d,
    metalness: 0.68,
    roughness: 0.26,
    map: panelNoise,
    emissive: 0x051a2d,
    emissiveIntensity: 0.2
  });

  const consoleInset = new THREE.MeshStandardMaterial({
    color: 0x050b16,
    metalness: 0.42,
    roughness: 0.48,
    emissive: 0x061426,
    emissiveIntensity: 0.2
  });

  const cyanGlow = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x67e8f9,
    emissiveIntensity: 1.35,
    roughness: 0.2,
    metalness: 0.15
  });

  const blueGlow = new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    emissive: 0x60a5fa,
    emissiveIntensity: 1.15,
    roughness: 0.22,
    metalness: 0.16
  });

  const amberGlow = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xfacc15,
    emissiveIntensity: 1.05,
    roughness: 0.25,
    metalness: 0.12
  });

  const redGlow = new THREE.MeshStandardMaterial({
    color: 0xfb7185,
    emissive: 0xfb7185,
    emissiveIntensity: 1.05,
    roughness: 0.24,
    metalness: 0.12
  });

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x8ee9ff,
    emissive: 0x16394f,
    emissiveIntensity: 0.22,
    metalness: 0.05,
    roughness: 0.08,
    transmission: 0.28,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const windowGlass = new THREE.MeshPhysicalMaterial({
    color: 0x091627,
    emissive: 0x010712,
    emissiveIntensity: 0.3,
    metalness: 0.0,
    roughness: 0.02,
    transmission: 0.18,
    transparent: true,
    opacity: 0.26,
    depthWrite: false
  });

  return {
    hullDark,
    hullMid,
    hullWarm,
    consoleTop,
    consoleInset,
    cyanGlow,
    blueGlow,
    amberGlow,
    redGlow,
    glass,
    windowGlass
  };
}

export function createGlowMaterial(color, intensity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.22,
    metalness: 0.12
  });
}

function createPanelNoiseTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;

  const context = canvas.getContext("2d");
  const image = context.createImageData(canvas.width, canvas.height);

  for (let i = 0; i < image.data.length; i += 4) {
    const value = 18 + Math.random() * 36;
    image.data[i] = value;
    image.data[i + 1] = value + 4;
    image.data[i + 2] = value + 11;
    image.data[i + 3] = 255;
  }

  context.putImageData(image, 0, 0);

  context.globalAlpha = 0.18;
  context.strokeStyle = "#7dd3fc";
  context.lineWidth = 1;

  for (let x = 0; x < canvas.width; x += 32) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }

  for (let y = 0; y < canvas.height; y += 32) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
