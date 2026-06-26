import * as THREE from "three";
import { createBridgeRefitExtras } from "./bridgeRefitExtras.js?v=cockpit-composition-2-5";

export function createCinematicLighting(scene) {
  const group = new THREE.Group();
  group.name = "cinematic-lighting-rig";
  scene.add(group);

  const lights = {
    ambient: new THREE.HemisphereLight(0x567196, 0x010308, 0.2),
    window: new THREE.DirectionalLight(0x7bb2de, 0.76),
    console: new THREE.PointLight(0x2ca3bc, 0.78, 8.5, 1.95),
    left: new THREE.PointLight(0x3e66a8, 0.52, 6.8, 2.1),
    right: new THREE.PointLight(0x3db0c6, 0.52, 6.8, 2.1),
    overhead: new THREE.PointLight(0x4b8ab2, 0.52, 7.4, 1.95),
    amberLeft: new THREE.PointLight(0xd19128, 0.14, 5.6, 2.1),
    amberRight: new THREE.PointLight(0xd19128, 0.14, 5.6, 2.1),
    alert: new THREE.PointLight(0xe0a12a, 0.1, 7, 2.0)
  };

  lights.window.position.set(0, 5.8, -5.9);
  lights.window.target.position.set(0, 1.15, 1.2);
  lights.console.position.set(0, 0.24, 2.05);
  lights.left.position.set(-3.75, 0.76, 1.05);
  lights.right.position.set(3.75, 0.76, 1.05);
  lights.overhead.position.set(0, 3.86, 0.3);
  lights.amberLeft.position.set(-2.9, 0.66, 2.25);
  lights.amberRight.position.set(2.9, 0.66, 2.25);
  lights.alert.position.set(0, 1.88, 2.7);

  group.add(lights.ambient, lights.window, lights.window.target, lights.console, lights.left, lights.right, lights.overhead, lights.amberLeft, lights.amberRight, lights.alert);

  const extras = createBridgeRefitExtras(scene);

  function update(delta, elapsed, { throttle = 0, warpActive = false } = {}) {
    const pulse = 0.5 + Math.sin(elapsed * 2.1) * 0.5;
    const slowPulse = 0.5 + Math.sin(elapsed * 0.72) * 0.5;
    lights.console.intensity = 0.7 + throttle * 0.5 + pulse * 0.06;
    lights.left.intensity = 0.46 + slowPulse * 0.1 + throttle * 0.16;
    lights.right.intensity = 0.46 + (1 - slowPulse) * 0.1 + throttle * 0.16;
    lights.overhead.intensity = 0.48 + throttle * 0.12;
    lights.amberLeft.intensity = 0.1 + pulse * 0.04 + throttle * 0.06;
    lights.amberRight.intensity = 0.1 + (1 - pulse) * 0.04 + throttle * 0.06;
    lights.alert.intensity = THREE.MathUtils.lerp(lights.alert.intensity, warpActive ? 0.82 + pulse * 0.26 : 0.08 + throttle * 0.06, 1 - Math.exp(-delta * 6));
    lights.window.intensity = 0.66 + throttle * 0.2 + (warpActive ? pulse * 0.18 : 0);
    extras.update(delta, elapsed, throttle, warpActive);
  }

  return { group, update };
}
