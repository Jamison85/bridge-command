import * as THREE from "three";

/**
 * Cinematic cockpit lighting rig. Built for mobile: a handful of important
 * light sources rather than a thousand expensive fake lamps, because batteries
 * are apparently still a thing in the future.
 */
export function createCinematicLighting(scene) {
  const group = new THREE.Group();
  group.name = "cinematic-lighting-rig";
  scene.add(group);

  const ambient = new THREE.HemisphereLight(0x6f92c0, 0x02040a, 0.28);
  group.add(ambient);

  const windowWash = new THREE.DirectionalLight(0x6dbce8, 1.1);
  windowWash.position.set(0, 5.6, -5.8);
  windowWash.target.position.set(0, 1.15, 1.2);
  group.add(windowWash, windowWash.target);

  const consoleGlow = new THREE.PointLight(0x34b7ce, 1.25, 8.5, 1.9);
  consoleGlow.position.set(0, 0.28, 2.1);
  group.add(consoleGlow);

  const leftConsoleGlow = new THREE.PointLight(0x3d6ebf, 0.85, 6.5, 2.0);
  leftConsoleGlow.position.set(-3.5, 0.72, 0.95);
  group.add(leftConsoleGlow);

  const rightConsoleGlow = new THREE.PointLight(0x44bbd0, 0.85, 6.5, 2.0);
  rightConsoleGlow.position.set(3.5, 0.72, 0.95);
  group.add(rightConsoleGlow);

  const overheadGlow = new THREE.PointLight(0x4d9ec9, 0.9, 7.5, 1.9);
  overheadGlow.position.set(0, 3.9, 0.35);
  group.add(overheadGlow);

  const alertGlow = new THREE.PointLight(0xd99b22, 0.18, 7, 2.1);
  alertGlow.position.set(0, 1.9, 2.7);
  group.add(alertGlow);

  function update(delta, elapsed, { throttle = 0, warpActive = false } = {}) {
    const pulse = 0.5 + Math.sin(elapsed * 2.2) * 0.5;
    const slowPulse = 0.5 + Math.sin(elapsed * 0.75) * 0.5;

    consoleGlow.intensity = 1.05 + throttle * 0.95 + pulse * 0.14;
    leftConsoleGlow.intensity = 0.65 + slowPulse * 0.14 + throttle * 0.28;
    rightConsoleGlow.intensity = 0.65 + (1 - slowPulse) * 0.14 + throttle * 0.28;
    overheadGlow.intensity = 0.72 + throttle * 0.18;

    alertGlow.intensity = THREE.MathUtils.lerp(
      alertGlow.intensity,
      warpActive ? 1.05 + pulse * 0.45 : 0.16 + throttle * 0.12,
      1 - Math.exp(-delta * 6)
    );

    windowWash.intensity = 0.92 + throttle * 0.38 + (warpActive ? pulse * 0.28 : 0);
  }

  return {
    group,
    update
  };
}
