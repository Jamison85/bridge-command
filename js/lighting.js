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

  const ambient = new THREE.HemisphereLight(0x9dccff, 0x050814, 0.62);
  group.add(ambient);

  const windowWash = new THREE.DirectionalLight(0x91d8ff, 2.25);
  windowWash.position.set(0, 5.6, -5.8);
  windowWash.target.position.set(0, 1.25, 1.2);
  group.add(windowWash, windowWash.target);

  const consoleGlow = new THREE.PointLight(0x49eaff, 3.9, 11.5, 1.7);
  consoleGlow.position.set(0, 0.45, 2.1);
  group.add(consoleGlow);

  const leftConsoleGlow = new THREE.PointLight(0x60a5fa, 1.8, 7, 1.8);
  leftConsoleGlow.position.set(-3.5, 0.85, 1.1);
  group.add(leftConsoleGlow);

  const rightConsoleGlow = new THREE.PointLight(0x67e8f9, 1.8, 7, 1.8);
  rightConsoleGlow.position.set(3.5, 0.85, 1.1);
  group.add(rightConsoleGlow);

  const overheadGlow = new THREE.PointLight(0x7dd3fc, 2.4, 8.5, 1.7);
  overheadGlow.position.set(0, 3.9, 0.9);
  group.add(overheadGlow);

  const alertGlow = new THREE.PointLight(0xfacc15, 0.4, 8, 1.9);
  alertGlow.position.set(0, 2.1, 2.7);
  group.add(alertGlow);

  function update(delta, elapsed, { throttle = 0, warpActive = false } = {}) {
    const pulse = 0.5 + Math.sin(elapsed * 2.2) * 0.5;
    const slowPulse = 0.5 + Math.sin(elapsed * 0.75) * 0.5;

    consoleGlow.intensity = 3.5 + throttle * 2.0 + pulse * 0.35;
    leftConsoleGlow.intensity = 1.4 + slowPulse * 0.35 + throttle * 0.65;
    rightConsoleGlow.intensity = 1.4 + (1 - slowPulse) * 0.35 + throttle * 0.65;
    overheadGlow.intensity = 2.1 + throttle * 0.45;

    alertGlow.intensity = THREE.MathUtils.lerp(
      alertGlow.intensity,
      warpActive ? 2.25 + pulse * 1.15 : 0.35 + throttle * 0.25,
      1 - Math.exp(-delta * 6)
    );

    windowWash.intensity = 2.0 + throttle * 1.2 + (warpActive ? pulse * 0.8 : 0);
  }

  return {
    group,
    update
  };
}
