import * as THREE from "three";

export function createCinematicLighting(scene) {
  const group = new THREE.Group();
  group.name = "cinematic-lighting-rig";
  scene.add(group);

  const ambient = new THREE.HemisphereLight(0x567196, 0x010308, 0.22);
  group.add(ambient);

  const windowWash = new THREE.DirectionalLight(0x7bb2de, 0.86);
  windowWash.position.set(0, 5.8, -5.9);
  windowWash.target.position.set(0, 1.15, 1.2);
  group.add(windowWash, windowWash.target);

  const consoleGlow = new THREE.PointLight(0x2ca3bc, 0.9, 8.5, 1.95);
  consoleGlow.position.set(0, 0.24, 2.05);
  group.add(consoleGlow);

  const leftConsoleGlow = new THREE.PointLight(0x3e66a8, 0.62, 6.8, 2.1);
  leftConsoleGlow.position.set(-3.75, 0.76, 1.05);
  group.add(leftConsoleGlow);

  const rightConsoleGlow = new THREE.PointLight(0x3db0c6, 0.62, 6.8, 2.1);
  rightConsoleGlow.position.set(3.75, 0.76, 1.05);
  group.add(rightConsoleGlow);

  const overheadGlow = new THREE.PointLight(0x4b8ab2, 0.62, 7.4, 1.95);
  overheadGlow.position.set(0, 3.86, 0.3);
  group.add(overheadGlow);

  const amberLeft = new THREE.PointLight(0xd19128, 0.18, 5.6, 2.1);
  amberLeft.position.set(-2.9, 0.66, 2.25);
  group.add(amberLeft);

  const amberRight = new THREE.PointLight(0xd19128, 0.18, 5.6, 2.1);
  amberRight.position.set(2.9, 0.66, 2.25);
  group.add(amberRight);

  const alertGlow = new THREE.PointLight(0xe0a12a, 0.14, 7, 2.0);
  alertGlow.position.set(0, 1.88, 2.7);
  group.add(alertGlow);

  function update(delta, elapsed, { throttle = 0, warpActive = false } = {}) {
    const pulse = 0.5 + Math.sin(elapsed * 2.1) * 0.5;
    const slowPulse = 0.5 + Math.sin(elapsed * 0.72) * 0.5;

    consoleGlow.intensity = 0.84 + throttle * 0.65 + pulse * 0.08;
    leftConsoleGlow.intensity = 0.52 + slowPulse * 0.12 + throttle * 0.2;
    rightConsoleGlow.intensity = 0.52 + (1 - slowPulse) * 0.12 + throttle * 0.2;
    overheadGlow.intensity = 0.56 + throttle * 0.14;
    amberLeft.intensity = 0.12 + pulse * 0.06 + throttle * 0.08;
    amberRight.intensity = 0.12 + (1 - pulse) * 0.06 + throttle * 0.08;

    alertGlow.intensity = THREE.MathUtils.lerp(
      alertGlow.intensity,
      warpActive ? 0.92 + pulse * 0.34 : 0.12 + throttle * 0.08,
      1 - Math.exp(-delta * 6)
    );

    windowWash.intensity = 0.76 + throttle * 0.26 + (warpActive ? pulse * 0.2 : 0);
  }

  return { group, update };
}
