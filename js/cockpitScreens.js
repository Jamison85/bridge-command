import * as THREE from "three";

export function createCockpitScreens(scene) {
  const group = new THREE.Group();
  group.name = "cockpit-hologram-screens";
  group.position.set(0, 1.48, -0.72);
  group.rotation.x = -0.08;
  scene.add(group);

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const screenMaterial = new THREE.MeshStandardMaterial({
    color: 0x8ee9ff,
    map: texture,
    emissive: 0x55bfd4,
    emissiveIntensity: 0.26,
    transparent: true,
    opacity: 0.34,
    roughness: 0.24,
    metalness: 0.02,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const glassMaterial = new THREE.MeshBasicMaterial({ color: 0x77d2eb, transparent: true, opacity: 0.045, depthWrite: false, side: THREE.DoubleSide });
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x6ed0e3, transparent: true, opacity: 0.16, depthWrite: false });

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.34, 0.86), screenMaterial);
  screen.position.set(0, 0.02, 0);
  group.add(screen);

  const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.56, 1.0), glassMaterial);
  frontGlass.position.set(0, 0.02, -0.035);
  group.add(frontGlass);

  const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.12, 0.72), glassMaterial.clone());
  rearGlass.material.opacity = 0.03;
  rearGlass.position.set(0, 0.08, 0.055);
  group.add(rearGlass);

  addFrame(2.62, 0.014, [0, 0.54, 0.02]);
  addFrame(2.62, 0.014, [0, -0.5, 0.02]);
  addVerticalFrame(0.014, 1.02, [-1.32, 0.02, 0.02]);
  addVerticalFrame(0.014, 1.02, [1.32, 0.02, 0.02]);

  const scanlines = [];
  for (let i = 0; i < 6; i += 1) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.0035, 0.0035), lineMaterial.clone());
    line.position.set(0, -0.39 + i * 0.14, 0.04);
    line.material.opacity = 0.035;
    group.add(line);
    scanlines.push(line);
  }

  const wingScreens = [];
  [-1, 1].forEach((side) => {
    const wing = new THREE.Group();
    wing.position.set(side * 1.62, -0.02, -0.12);
    wing.rotation.y = side * -0.34;
    group.add(wing);

    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.34), glassMaterial.clone());
    pane.material.opacity = 0.05;
    wing.add(pane);

    const topLine = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.007, 0.007), lineMaterial.clone());
    topLine.position.y = 0.19;
    wing.add(topLine);
    const bottomLine = topLine.clone();
    bottomLine.position.y = -0.19;
    wing.add(bottomLine);
    wingScreens.push({ group: wing, pane });
  });

  let content = { title: "Bridge Command", copy: "Store Pilot systems online.", mode: "Standby", focus: "Stable" };
  updateContent(content);

  function addFrame(w, h, position) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, h), lineMaterial.clone());
    frame.position.set(...position);
    group.add(frame);
  }

  function addVerticalFrame(w, h, position) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), lineMaterial.clone());
    frame.position.set(...position);
    group.add(frame);
  }

  function updateContent(nextContent) {
    content = { ...content, ...nextContent };
    drawScreen();
    texture.needsUpdate = true;
  }

  function drawScreen() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "rgba(8, 20, 34, 0.34)");
    gradient.addColorStop(0.55, "rgba(4, 11, 20, 0.14)");
    gradient.addColorStop(1, "rgba(3, 7, 13, 0.02)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "rgba(92, 196, 221, 0.08)";
    context.lineWidth = 2;
    for (let x = 70; x < canvas.width; x += 100) {
      context.beginPath();
      context.moveTo(x, 52);
      context.lineTo(x, canvas.height - 52);
      context.stroke();
    }

    context.fillStyle = "rgba(92, 196, 221, 0.54)";
    context.font = "800 19px system-ui, sans-serif";
    context.fillText("STORE PILOT // ACTIVE", 64, 62);

    context.fillStyle = "rgba(228, 241, 248, 0.78)";
    context.font = "900 48px system-ui, sans-serif";
    context.fillText(trimText(content.title, 17), 64, 132);

    context.fillStyle = "rgba(190, 206, 222, 0.58)";
    context.font = "500 27px system-ui, sans-serif";
    wrapText(content.copy, 64, 188, 840, 36, 3);

    drawMetric("MODE", content.mode, 64, 382);
    drawMetric("FOCUS", content.focus, 334, 382);
  }

  function drawMetric(label, value, x, y) {
    context.strokeStyle = "rgba(92, 196, 221, 0.16)";
    context.fillStyle = "rgba(3, 8, 15, 0.14)";
    roundRect(x, y, 220, 62, 12);
    context.fill();
    context.stroke();
    context.fillStyle = "rgba(140, 164, 186, 0.64)";
    context.font = "800 16px system-ui, sans-serif";
    context.fillText(label, x + 16, y + 23);
    context.fillStyle = "rgba(230, 241, 248, 0.76)";
    context.font = "900 25px system-ui, sans-serif";
    context.fillText(trimText(value, 12), x + 16, y + 50);
  }

  function wrapText(text, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(text ?? "").split(" ");
    let line = "";
    let lines = 0;
    for (let i = 0; i < words.length; i += 1) {
      const testLine = `${line}${words[i]} `;
      if (context.measureText(testLine).width > maxWidth && i > 0) {
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
    const pulse = 0.5 + Math.sin(elapsed * 2.2) * 0.5;
    const warpLift = warpActive ? Math.sin(elapsed * 8) * 0.01 : 0;
    group.position.y = 1.48 + Math.sin(elapsed * 0.8) * 0.01 + warpLift;
    group.scale.setScalar(1 + throttle * 0.004 + (warpActive ? pulse * 0.008 : 0));
    screenMaterial.opacity = 0.28 + pulse * 0.035 + throttle * 0.02;
    screenMaterial.emissiveIntensity = 0.22 + pulse * 0.05 + throttle * 0.1 + (warpActive ? 0.12 : 0);
    frontGlass.material.opacity = 0.035 + pulse * 0.018;
    rearGlass.material.opacity = 0.025 + pulse * 0.01;
    scanlines.forEach((line, index) => {
      line.position.y += delta * (0.075 + throttle * 0.08);
      if (line.position.y > 0.48) line.position.y = -0.42;
      line.material.opacity = 0.025 + Math.sin(elapsed * 2 + index) * 0.01 + (warpActive ? 0.02 : 0);
    });
    wingScreens.forEach((wing, index) => {
      wing.group.position.y = Math.sin(elapsed * 1.1 + index) * 0.008;
      wing.pane.material.opacity = 0.035 + pulse * 0.018 + throttle * 0.015;
    });
  }

  return { group, update, updateContent };
}
