import * as THREE from "three";

export function createCockpitScreens(scene) {
  const group = new THREE.Group();
  group.name = "cockpit-hologram-screens";
  group.position.set(0, 1.34, -0.12);
  group.rotation.x = -0.1;
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
    emissiveIntensity: 0.38,
    transparent: true,
    opacity: 0.5,
    roughness: 0.22,
    metalness: 0.02,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const glassMaterial = new THREE.MeshBasicMaterial({
    color: 0x77d2eb,
    transparent: true,
    opacity: 0.09,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const lineMaterial = new THREE.MeshBasicMaterial({
    color: 0x6ed0e3,
    transparent: true,
    opacity: 0.24,
    depthWrite: false
  });

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.32), screenMaterial);
  screen.position.set(0, 0.02, 0);
  group.add(screen);

  const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(3.12, 1.54), glassMaterial);
  frontGlass.position.set(0, 0.02, -0.035);
  group.add(frontGlass);

  const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.56, 1.08), glassMaterial.clone());
  rearGlass.material.opacity = 0.05;
  rearGlass.position.set(0, 0.08, 0.055);
  group.add(rearGlass);

  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.014, 0.014), lineMaterial.clone());
  frameTop.position.set(0, 0.8, 0.02);
  group.add(frameTop);

  const frameBottom = frameTop.clone();
  frameBottom.position.y = -0.76;
  group.add(frameBottom);

  const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.014, 1.54, 0.014), lineMaterial.clone());
  frameLeft.position.set(-1.61, 0.02, 0.02);
  group.add(frameLeft);

  const frameRight = frameLeft.clone();
  frameRight.position.x = 1.61;
  group.add(frameRight);

  const scanlines = [];
  for (let i = 0; i < 7; i += 1) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.004, 0.004), lineMaterial.clone());
    line.position.set(0, -0.58 + i * 0.18, 0.04);
    line.material.opacity = 0.06;
    group.add(line);
    scanlines.push(line);
  }

  const wingScreens = [];
  [-1, 1].forEach((side) => {
    const wing = new THREE.Group();
    wing.position.set(side * 1.98, -0.02, -0.14);
    wing.rotation.y = side * -0.34;
    group.add(wing);

    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.56), glassMaterial.clone());
    pane.material.opacity = 0.08;
    wing.add(pane);

    const topLine = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.01, 0.01), lineMaterial.clone());
    topLine.position.y = 0.3;
    wing.add(topLine);

    const bottomLine = topLine.clone();
    bottomLine.position.y = -0.3;
    wing.add(bottomLine);

    for (let i = 0; i < 3; i += 1) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.007, 0.007), lineMaterial.clone());
      strip.position.set(0, -0.1 + i * 0.1, 0.02);
      strip.material.opacity = 0.09 + i * 0.02;
      wing.add(strip);
    }

    wingScreens.push({ group: wing, pane });
  });

  let content = { title: "Bridge Command", copy: "Store Pilot systems online.", mode: "Standby", focus: "Stable" };
  updateContent(content);

  function updateContent(nextContent) {
    content = { ...content, ...nextContent };
    drawScreen();
    texture.needsUpdate = true;
  }

  function drawScreen() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "rgba(8, 20, 34, 0.5)");
    gradient.addColorStop(0.52, "rgba(4, 11, 20, 0.24)");
    gradient.addColorStop(1, "rgba(3, 7, 13, 0.04)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "rgba(92, 196, 221, 0.14)";
    context.lineWidth = 2;
    for (let x = 58; x < canvas.width; x += 82) {
      context.beginPath();
      context.moveTo(x, 48);
      context.lineTo(x, canvas.height - 48);
      context.stroke();
    }

    context.fillStyle = "rgba(92, 196, 221, 0.68)";
    context.font = "800 21px system-ui, sans-serif";
    context.fillText("STORE PILOT // ACTIVE SCREEN", 58, 60);

    context.fillStyle = "rgba(228, 241, 248, 0.9)";
    context.font = "900 54px system-ui, sans-serif";
    context.fillText(trimText(content.title, 18), 58, 134);

    context.fillStyle = "rgba(190, 206, 222, 0.74)";
    context.font = "500 29px system-ui, sans-serif";
    wrapText(content.copy, 58, 190, 860, 38, 4);

    drawMetricBox("MODE", content.mode, 58, 378);
    drawMetricBox("FOCUS", content.focus, 318, 378);
    drawMetricBox("STATUS", "ONLINE", 578, 378);
  }

  function drawMetricBox(label, value, x, y) {
    context.strokeStyle = "rgba(92, 196, 221, 0.26)";
    context.fillStyle = "rgba(3, 8, 15, 0.24)";
    context.lineWidth = 2;
    roundRect(x, y, 226, 72, 14);
    context.fill();
    context.stroke();

    context.fillStyle = "rgba(140, 164, 186, 0.82)";
    context.font = "800 18px system-ui, sans-serif";
    context.fillText(label, x + 18, y + 26);

    context.fillStyle = "rgba(230, 241, 248, 0.9)";
    context.font = "900 27px system-ui, sans-serif";
    context.fillText(trimText(value, 12), x + 18, y + 54);
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
    const warpLift = warpActive ? Math.sin(elapsed * 8) * 0.012 : 0;

    group.position.y = 1.34 + Math.sin(elapsed * 0.8) * 0.012 + warpLift;
    group.scale.setScalar(1 + throttle * 0.006 + (warpActive ? pulse * 0.01 : 0));
    screenMaterial.opacity = 0.42 + pulse * 0.05 + throttle * 0.03;
    screenMaterial.emissiveIntensity = 0.32 + pulse * 0.07 + throttle * 0.15 + (warpActive ? 0.18 : 0);
    frontGlass.material.opacity = 0.06 + pulse * 0.025;
    rearGlass.material.opacity = 0.04 + pulse * 0.015;

    scanlines.forEach((line, index) => {
      line.position.y += delta * (0.1 + throttle * 0.12);
      if (line.position.y > 0.68) line.position.y = -0.62;
      line.material.opacity = 0.04 + Math.sin(elapsed * 2 + index) * 0.015 + (warpActive ? 0.03 : 0);
    });

    wingScreens.forEach((wing, index) => {
      wing.group.position.y = Math.sin(elapsed * 1.1 + index) * 0.01;
      wing.pane.material.opacity = 0.06 + pulse * 0.025 + throttle * 0.02;
    });
  }

  return { group, update, updateContent };
}
