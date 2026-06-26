import * as THREE from "three";

export function createForcedRefitDiagnostic(scene) {
  const group = new THREE.Group();
  group.name = "forced-refit-diagnostic-visible-layer";
  scene.add(group);

  const dark = new THREE.MeshStandardMaterial({ color: 0x02050c, emissive: 0x000204, emissiveIntensity: 0.04, metalness: 0.7, roughness: 0.55 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xd99f2a, emissive: 0xd99f2a, emissiveIntensity: 0.72, metalness: 0.1, roughness: 0.32 });
  const cyan = new THREE.MeshStandardMaterial({ color: 0x5cc4dd, emissive: 0x5cc4dd, emissiveIntensity: 0.54, metalness: 0.1, roughness: 0.34 });

  box(0.34, 2.7, 0.34, [-3.95, 1.25, 2.85], dark, [0, 0.18, 0]);
  box(0.34, 2.7, 0.34, [3.95, 1.25, 2.85], dark, [0, -0.18, 0]);
  box(7.6, 0.24, 0.34, [0, 2.72, 2.7], dark);
  box(7.8, 0.26, 0.4, [0, -0.72, 3.18], dark, [-0.12, 0, 0]);

  strip([-3.95, 1.25, 2.64], [0.04, 1.1, 0.04], amber, [0, 0.18, 0]);
  strip([3.95, 1.25, 2.64], [0.04, 1.1, 0.04], amber, [0, -0.18, 0]);
  strip([0, 2.56, 2.48], [2.1, 0.03, 0.04], cyan);
  strip([0, -0.52, 2.92], [2.0, 0.03, 0.04], amber, [-0.12, 0, 0]);

  const badge = makeBadge();
  badge.position.set(0, 1.86, 2.35);
  badge.scale.set(1.05, 0.3, 1);
  group.add(badge);

  function update(delta, elapsed, throttle, warpActive) {
    badge.material.opacity = 0.55 + Math.sin(elapsed * 2.0) * 0.1;
    group.position.x = warpActive ? Math.sin(elapsed * 12) * 0.01 : 0;
  }

  function box(w, h, d, pos, mat, rot = [0, 0, 0]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    group.add(mesh);
    return mesh;
  }

  function strip(pos, scale, mat, rot = [0, 0, 0]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
    mesh.position.set(...pos);
    mesh.scale.set(...scale);
    mesh.rotation.set(...rot);
    group.add(mesh);
    return mesh;
  }

  function makeBadge() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(2, 6, 14, 0.55)";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "rgba(217, 159, 42, 0.9)";
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, 488, 104);
    ctx.fillStyle = "rgba(255, 224, 154, 0.95)";
    ctx.font = "900 42px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("REFIT 2.2 ACTIVE", 256, 66);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.68, depthWrite: false });
    return new THREE.Sprite(material);
  }

  return { group, update };
}
