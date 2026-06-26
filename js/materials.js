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
    color: 0x030913,
    metalness: 0.76,
    roughness: 0.48,
    map: panelNoise,
    emissive: 0x01040a,
    emissiveIntensity: 0.05
  });

  const hullMid = new THREE.MeshStandardMaterial({
    color: 0x08162a,
    metalness: 0.7,
    roughness: 0.44,
    map: panelNoise,
    emissive: 0x010916,
    emissiveIntensity: 0.06
  });

  const hullWarm = new THREE.MeshStandardMaterial({
    color: 0x0d1828,
    metalness: 0.58,
    roughness: 0.5,
    map: panelNoise,
    emissive: 0x030712,
    emissiveIntensity: 0.05
  });

  const consoleTop = new THREE.MeshStandardMaterial({
    color: 0x0b1a2e,
    metalness: 0.72,
    roughness: 0.38,
    map: panelNoise,
    emissive: 0x03101e,
    emissiveIntensity: 0.1
  });

  const consoleInset = new THREE.MeshStandardMaterial({
    color: 0x020711,
    metalness: 0.46,
    roughness: 0.58,
    emissive: 0x020913,
    emissiveIntensity: 0.09
  });

  const cyanGlow = new THREE.MeshStandardMaterial({
    color: 0x5cc4dd,
    emissive: 0x5cc4dd,
    emissiveIntensity: 0.64,
    roughness: 0.3,
    metalness: 0.18
  });

  const blueGlow = new THREE.MeshStandardMaterial({
    color: 0x4b7ecf,
    emissive: 0x4b7ecf,
    emissiveIntensity: 0.54,
    roughness: 0.32,
    metalness: 0.18
  });

  const amberGlow = new THREE.MeshStandardMaterial({
    color: 0xd99f2a,
    emissive: 0xd99f2a,
    emissiveIntensity: 0.55,
    roughness: 0.3,
    metalness: 0.15
  });

  const redGlow = new THREE.MeshStandardMaterial({
    color: 0xc45a6a,
    emissive: 0xc45a6a,
    emissiveIntensity: 0.46,
    roughness: 0.32,
    metalness: 0.15
  });

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x72d2e3,
    emissive: 0x082033,
    emissiveIntensity: 0.1,
    metalness: 0.04,
    roughness: 0.12,
    transmission: 0.2,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const windowGlass = new THREE.MeshPhysicalMaterial({
    color: 0x030914,
    emissive: 0x000409,
    emissiveIntensity: 0.12,
    metalness: 0.0,
    roughness: 0.06,
    transmission: 0.1,
    transparent: true,
    opacity: 0.18,
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

export function createGlowMaterial(color, intensity = 0.72) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.3,
    metalness: 0.15
  });
}

function createPanelNoiseTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;

  const context = canvas.getContext("2d");
  const image = context.createImageData(canvas.width, canvas.height);

  for (let i = 0; i < image.data.length; i += 4) {
    const value = 8 + Math.random() * 24;
    image.data[i] = value;
    image.data[i + 1] = value + 3;
    image.data[i + 2] = value + 9;
    image.data[i + 3] = 255;
  }

  context.putImageData(image, 0, 0);

  context.globalAlpha = 0.1;
  context.strokeStyle = "#4ba9c4";
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
