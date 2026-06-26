import * as THREE from "three";

/**
 * Animated cockpit hologram screens. The DOM HUD still exists for reliable input,
 * but this makes the store data feel projected inside the bridge instead of
 * slapped on top of it by a committee with beige carpet.
 */
export function createCockpitScreens(scene) {
  const group = new THREE.Group();
  group.name = "cockpit-hologram-screens";
  group.position.set(0, 1.42, 0.32);
  group.rotation.x = -0.06;
  scene.add(group);

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const screenMaterial = new THREE.MeshStandardMaterial({
    color: 0x9af7ff,
    map: texture,
    emissive: 0x67e8f9,
    emissiveIntensity: 0.7,
    transparent: true,
    opacity: 0.86,
    roughness: 0.18,
    metalness: 0.04,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x67e8f9,
    emissive: 0x14384b,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.22,
    roughness: 0.04,
    metalness: 0.0,
    transmission: 0.2,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.55, 1.78), screenMaterial);
  screen.position.set(0, 0.08, 0);
  group.add(screen);

  const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.76, 1.98), glassMaterial);
  glass.position.set(0, 0.08, -0.018);
  group.add(glass);

  const borderMaterial = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x67e8f9,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.82
  });

  const scanMaterial = new THREE.MeshBasicMaterial({
    color: 0x67e8f9,
    transparent: true,
    opacity: 0.18,
    depthWrite: false
  });

  const top = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.018, 0.018), borderMaterial);
  top.position.set(0, 1.09, 0.02);
  group.add(top);

  const bottom = top.clone();
  bottom.position.y = -0.93;
  group.add(bottom);

  const left = new THREE.Mesh(new THREE.BoxGeometry(0.018, 1.98, 0.018), borderMaterial);
  left.position.set(-1.92, 0.08, 0.02);
  group.add(left);

  const right = left.clone();
  right.position.x = 1.92;
  group.add(right);

  const scanlines = [];
  for (let i = 0; i < 9; i += 1) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.006, 0.006), scanMaterial);
    line.position.set(0, -0.78 + i * 0.2, 0.035);
    group.add(line);
    scanlines.push(line);
  }

  const wingScreens = createWingScreens(borderMaterial, glassMaterial);

  let content = {
    title: "Bridge Command",
    copy: "Store Pilot systems online.",
    mode: "Standby",
    focus: "Stable"
  };

  updateContent(content);

  function createWingScreens(borderMat, glassMat) {
    const screens = [];

    [-1, 1].forEach((side) => {
      const wing = new THREE.Group();
      wing.position.set(side * 2.28, -0.15, -0.1);
      wing.rotation.y = side * -0.4;
      wing.scale.setScalar(0.72);
      group.add(wing);

      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.82), glassMat.clone());
      pane.material.opacity = 0.14;
      wing.add(pane);

      const topLine = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.014, 0.014), borderMat.clone());
      topLine.position.y = 0.45;
      wing.add(topLine);

      const bottomLine = topLine.clone();
      bottomLine.position.y = -0.45;
      wing.add(bottomLine);

      screens.push({ group: wing, pane, topLine, bottomLine });
    });

    return screens;
  }

  function updateContent(nextContent) {
    content = { ...content, ...nextContent };
    drawScreen();
    texture.needsUpdate = true;
  }

  function drawScreen() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "rgba(12, 35, 60, 0.84)");
    gradient.addColorStop(0.55, "rgba(5, 18, 34, 0.7)");
    gradient.addColorStop(1, "rgba(4, 11, 24, 0.92)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "rgba(103, 232, 249, 0.26)";
    context.lineWidth = 2;
    for (let x = 48; x < canvas.width; x += 64) {
      context.beginPath();
      context.moveTo(x, 34);
      context.lineTo(x, canvas.height - 34);
      context.stroke();
    }
    for (let y = 48; y < canvas.height; y += 56) {
      context.beginPath();
      context.moveTo(34, y);
      context.lineTo(canvas.width - 34, y);
      context.stroke();
    }

    context.fillStyle = "rgba(103, 232, 249, 0.95)";
    context.font = "800 26px system-ui, sans-serif";
    context.letterSpacing = "6px";
    context.fillText("STORE PILOT // ACTIVE SCREEN", 54, 62);

    context.fillStyle = "rgba(234, 246, 255, 0.98)";
    context.font = "900 62px system-ui, sans-serif";
    context.fillText(trimText(content.title, 22), 54, 142);

    context.fillStyle = "rgba(199, 215, 230, 0.92)";
    context.font = "500 34px system-ui, sans-serif";
    wrapText(content.copy, 54, 204, 900, 44, 4);

    drawMetricBox("MODE", content.mode, 54, 386);
    drawMetricBox("FOCUS", content.focus, 348, 386);
    drawMetricBox("STATUS", "ONLINE", 642, 386);

    context.fillStyle = "rgba(103, 232, 249, 0.12)";
    context.fillRect(0, 0, canvas.width, 12);
    context.fillRect(0, canvas.height - 12, canvas.width, 12);
  }

  function drawMetricBox(label, value, x, y) {
    context.strokeStyle = "rgba(103, 232, 249, 0.48)";
    context.fillStyle = "rgba(2, 6, 23, 0.54)";
    context.lineWidth = 2;
    roundRect(x, y, 238, 82, 18);
    context.fill();
    context.stroke();

    context.fillStyle = "rgba(143, 168, 189, 0.95)";
    context.font = "800 20px system-ui, sans-serif";
    context.fillText(label, x + 22, y + 30);

    context.fillStyle = "rgba(234, 246, 255, 0.98)";
    context.font = "900 30px system-ui, sans-serif";
    context.fillText(trimText(value, 12), x + 22, y + 62);
  }

  function wrapText(text, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(text ?? "").split(" ");
    let line = "";
    let lines = 0;

    for (let i = 0; i < words.length; i += 1) {
      const testLine = `${line}${words[i]} `;
      const metrics = context.measureText(testLine);

      if (metrics.width > maxWidth && i > 0) {
        context.fillText(line.trim(), x, y);
        line = `${words[i]} `;
        y += lineHeight;
        lines += 1;

        if (lines >= maxLines - 1) {
          context.fillText(`${line.trim()}...`, x, y);
          return;
        }
      } else {
        line = testLine;
      }
    }

    context.fillText(line.trim(), x, y);
  }

  function roundRect(x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  function trimText(text, maxLength) {
    const value = String(text ?? "");
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
  }

  function update(delta, elapsed, { throttle = 0, warpActive = false } = {}) {
    const pulse = 0.5 + Math.sin(elapsed * 2.4) * 0.5;
    const warpLift = warpActive ? Math.sin(elapsed * 9) * 0.018 : 0;

    group.position.y = 1.42 + Math.sin(elapsed * 0.8) * 0.018 + warpLift;
    group.scale.setScalar(1 + throttle * 0.012 + (warpActive ? pulse * 0.018 : 0));

    screenMaterial.opacity = 0.78 + pulse * 0.08 + throttle * 0.04;
    screenMaterial.emissiveIntensity = 0.62 + pulse * 0.16 + throttle * 0.28 + (warpActive ? 0.42 : 0);
    glassMaterial.opacity = 0.18 + pulse * 0.04;

    scanlines.forEach((line, index) => {
      line.position.y += delta * (0.18 + throttle * 0.22);
      if (line.position.y > 0.92) {
        line.position.y = -0.86;
      }
      line.material.opacity = 0.12 + Math.sin(elapsed * 2 + index) * 0.04 + (warpActive ? 0.06 : 0);
    });

    wingScreens.forEach((wing, index) => {
      wing.group.position.y = -0.15 + Math.sin(elapsed * 1.1 + index) * 0.018;
      wing.pane.material.opacity = 0.1 + pulse * 0.04 + throttle * 0.04;
    });
  }

  return {
    group,
    update,
    updateContent
  };
}
