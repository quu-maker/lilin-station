// リリンちゃんの部屋を Three.js で立体化する（箱庭メニュー）。
// 失敗時は何もしない（2Dの部屋イラストがフォールバックとして残る）。
(function () {
  const chooser = document.getElementById("chooser");
  if (!chooser || typeof THREE === "undefined") return;

  const mount = document.createElement("div");
  mount.id = "room3d";
  chooser.insertBefore(mount, chooser.firstChild);

  const W = () => chooser.clientWidth, H = () => chooser.clientHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W(), H());
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = false;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d2b23);
  const camera = new THREE.PerspectiveCamera(46, W() / H(), 0.1, 100);
  camera.position.set(0, 2.7, 8.6);

  // ---------- 時間帯で空と光を変える ----------
  const hour = new Date().getHours();
  const slot = hour >= 5 && hour < 11 ? "morning" : hour < 17 ? "day" : hour < 23 ? "evening" : "night";
  const SKY = {
    morning: ["#8fb8e8", "#ffe3b0"], day: ["#6fa8e0", "#d6ecff"],
    evening: ["#2b4a7a", "#e8906a"], night: ["#081a33", "#1d3355"],
  }[slot];
  const dayLight = { morning: 0.55, day: 0.75, evening: 0.35, night: 0.12 }[slot];
  const lampLevel = { morning: 0.7, day: 0.45, evening: 1.25, night: 1.5 }[slot];

  // ---------- ライティング ----------
  scene.add(new THREE.AmbientLight(0x8fa3c7, 0.38));
  const sun = new THREE.DirectionalLight(0xbfd4ff, dayLight);
  sun.position.set(-7, 4.5, 2.5);
  scene.add(sun);
  const lampLight = new THREE.PointLight(0xffb45c, lampLevel, 11, 1.6);
  lampLight.position.set(-3.9, 2.2, -2.2);
  scene.add(lampLight);
  const glowLight = new THREE.PointLight(0xffca7a, 0.5, 8, 1.8);
  glowLight.position.set(0.5, 4.6, -3.4);
  scene.add(glowLight);

  const mat = (color, rough = 0.95) => new THREE.MeshStandardMaterial({ color, roughness: rough });
  const box = (w, h, d, color, x, y, z, parent) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z);
    (parent || scene).add(m);
    return m;
  };

  // ---------- 部屋の箱 ----------
  box(12, 0.3, 9, 0x6b4a2f, 0, -0.15, 0);                    // 床
  box(12, 6.5, 0.3, 0x14453a, 0, 3.25, -4.5);                 // 奥の壁
  box(0.3, 6.5, 9, 0x113a30, 6, 3.25, 0);                     // 右の壁
  box(12, 0.3, 9, 0x0e2f27, 0, 6.6, 0);                       // 天井
  // 左の壁（窓の開口を残して4分割）
  box(0.3, 6.5, 2.6, 0x113a30, -6, 3.25, -3.2);
  box(0.3, 6.5, 2.2, 0x113a30, -6, 3.25, 3.4);
  box(0.3, 1.6, 4.2, 0x113a30, -6, 5.7, -0.1);
  box(0.3, 1.5, 4.2, 0x113a30, -6, 0.75, -0.1);

  // 窓の外の空
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 64; skyCanvas.height = 256;
  const sctx = skyCanvas.getContext("2d");
  const grad = sctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, SKY[0]); grad.addColorStop(1, SKY[1]);
  sctx.fillStyle = grad; sctx.fillRect(0, 0, 64, 256);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.encoding = THREE.sRGBEncoding;
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(7, 5.4),
    new THREE.MeshBasicMaterial({ map: skyTex }));
  sky.position.set(-7.4, 3.4, -0.1);
  sky.rotation.y = Math.PI / 2;
  scene.add(sky);
  // 窓枠とカーテン
  box(0.14, 3.6, 0.14, 0x8a6844, -5.85, 3.35, -2.15);
  box(0.14, 3.6, 0.14, 0x8a6844, -5.85, 3.35, 1.95);
  box(0.14, 0.14, 4.24, 0x8a6844, -5.85, 5.1, -0.1);
  box(0.14, 0.14, 4.24, 0x8a6844, -5.85, 1.6, -0.1);
  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0xf3ead8, transparent: true, opacity: 0.75, roughness: 1, side: THREE.DoubleSide,
  });
  for (const z of [-1.85, 1.65]) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 3.5), curtainMat);
    c.position.set(-5.8, 3.3, z);
    c.rotation.y = Math.PI / 2;
    c.rotation.z = z < 0 ? 0.06 : -0.06;
    scene.add(c);
  }

  // ラグ（キャンバスで柄を描く）
  const rugCanvas = document.createElement("canvas");
  rugCanvas.width = rugCanvas.height = 256;
  const rctx = rugCanvas.getContext("2d");
  rctx.fillStyle = "#1d4a44"; rctx.fillRect(0, 0, 256, 256);
  rctx.strokeStyle = "#c96f2e"; rctx.lineWidth = 7;
  rctx.strokeRect(14, 14, 228, 228);
  rctx.save(); rctx.translate(128, 128); rctx.rotate(Math.PI / 4);
  rctx.strokeRect(-52, -52, 104, 104);
  rctx.strokeStyle = "#e8a34c"; rctx.strokeRect(-30, -30, 60, 60);
  rctx.restore();
  const rugTex = new THREE.CanvasTexture(rugCanvas);
  rugTex.encoding = THREE.sRGBEncoding;
  const rug = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.07, 3.6),
    new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 }));
  rug.position.set(0.4, 0.04, 0.9);
  scene.add(rug);

  // ---------- 机とラジオ（学習室／ラジオ室のホットスポット） ----------
  const deskGroup = new THREE.Group(); scene.add(deskGroup);
  box(2.6, 0.12, 1.2, 0x8a6844, -4.2, 1.5, -2.2, deskGroup);
  for (const [x, z] of [[-5.35, -2.7], [-3.05, -2.7], [-5.35, -1.7], [-3.05, -1.7]])
    box(0.1, 1.5, 0.1, 0x77572f, x, 0.75, z, deskGroup);
  // ラジオ
  const radioGroup = new THREE.Group(); radioGroup.position.set(-4.75, 1.56, -2.35); scene.add(radioGroup);
  box(0.78, 0.52, 0.3, 0x9c5a30, 0, 0.26, 0, radioGroup);
  box(0.66, 0.4, 0.03, 0xe8d9b0, 0, 0.26, 0.16, radioGroup);
  const dialGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.05, 20);
  for (const dx of [-0.18, 0.18]) {
    const d = new THREE.Mesh(dialGeo, mat(0x5a3a20));
    d.rotation.x = Math.PI / 2; d.position.set(dx, 0.14, 0.18); radioGroup.add(d);
  }
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.85, 6), mat(0xcccccc, 0.4));
  antenna.position.set(0.3, 0.85, -0.05); antenna.rotation.z = -0.5; radioGroup.add(antenna);
  // ランプ
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.1, 20), mat(0x77572f));
  lampBase.position.set(-3.55, 1.61, -2.45); scene.add(lampBase);
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.36, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb45c, emissiveIntensity: 0.85, side: THREE.DoubleSide }));
  lampShade.position.set(-3.55, 2.05, -2.45); scene.add(lampShade);
  // 本とマグカップ
  box(0.55, 0.06, 0.4, 0xd8d2c2, -4.05, 1.6, -1.95).rotation.y = 0.25;
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.14, 16), mat(0xe8e2d2));
  mug.position.set(-3.8, 1.63, -2.6); scene.add(mug);

  // 本棚
  const shelfGroup = new THREE.Group(); shelfGroup.position.set(-5.55, 0, -3.9); scene.add(shelfGroup);
  box(0.9, 3.4, 0.12, 0x77572f, 0, 1.7, -0.45, shelfGroup);
  box(0.9, 3.4, 0.12, 0x77572f, 0, 1.7, 0.45, shelfGroup);
  const bookColors = [0xb8563e, 0x3e6fb8, 0x58a06a, 0xd8b34c, 0x8a6fb8, 0xd8d2c2, 0x4ca8a0];
  for (let s = 0; s < 3; s++) {
    box(0.95, 0.09, 1.0, 0x8a6844, 0, 0.55 + s * 1.05, 0, shelfGroup);
    let bx = -0.36;
    while (bx < 0.3) {
      const bw = 0.07 + Math.random() * 0.06, bh = 0.55 + Math.random() * 0.25;
      box(bw, bh, 0.62, bookColors[Math.floor(Math.random() * bookColors.length)],
        bx + bw / 2, 0.6 + s * 1.05 + bh / 2, 0, shelfGroup);
      bx += bw + 0.015;
    }
  }
  shelfGroup.traverse(o => { o.userData.hotspot = "study"; });
  deskGroup.traverse(o => { o.userData.hotspot = "study"; });
  radioGroup.traverse(o => { o.userData.hotspot = "radio"; });

  // ベッド
  const bedGroup = new THREE.Group(); bedGroup.position.set(3.9, 0, -2.6); scene.add(bedGroup);
  box(3.4, 0.35, 2.0, 0x77572f, 0, 0.35, 0, bedGroup);
  box(3.3, 0.3, 1.9, 0x2c5a54, 0, 0.68, 0, bedGroup);
  box(0.85, 0.18, 1.1, 0xe8e2d2, -1.05, 0.9, 0, bedGroup);
  box(0.8, 0.16, 1.0, 0xe8a34c, -0.95, 0.88, 0.25, bedGroup).rotation.z = 0.08;

  // 豆電球ガーランド（奥の壁に2本）
  const bulbGeo = new THREE.SphereGeometry(0.055, 10, 10);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffca7a, emissive: 0xffb45c, emissiveIntensity: 1.6 });
  for (const [y0, sag] of [[5.9, 0.85], [5.0, 0.7]]) {
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, x = -5.4 + t * 10.8;
      const y = y0 - Math.sin(t * Math.PI) * sag;
      const b = new THREE.Mesh(bulbGeo, bulbMat);
      b.position.set(x, y, -4.25);
      scene.add(b);
    }
  }

  // 浮遊する埃
  const dustCount = 130;
  const dustPos = new Float32Array(dustCount * 3);
  const dustBase = [];
  for (let i = 0; i < dustCount; i++) {
    const x = (Math.random() - 0.5) * 10, y = 0.4 + Math.random() * 5, z = -3.5 + Math.random() * 6;
    dustPos.set([x, y, z], i * 3);
    dustBase.push([x, y, z, Math.random() * Math.PI * 2]);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xffd9a0, size: 0.045, transparent: true, opacity: 0.55, depthWrite: false,
  }));
  scene.add(dust);

  // ---------- リリンちゃん（緑背景を抜いて立体の中に立たせる） ----------
  const PACK_W = 896, PACK_H = 768, CHAR_W = 2.35, CHAR_H = CHAR_W * PACK_H / PACK_W;
  const charGroup = new THREE.Group();
  charGroup.position.set(0.55, 0, -1.15);
  scene.add(charGroup);

  function keyedTexture(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i], g = px[i + 1], b = px[i + 2];
          const excess = g - Math.max(r, b);
          if (excess > 10) {
            const a = Math.max(0, 255 - (excess - 10) * 9);
            if (a < px[i + 3]) px[i + 3] = a;
            if (a < 255) px[i + 1] = Math.max(r, b);
          }
        }
        ctx.putImageData(data, 0, 0);
        const tex = new THREE.CanvasTexture(c);
        tex.encoding = THREE.sRGBEncoding;
        resolve({ tex, w: c.width, h: c.height });
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  const parts = {};
  let charReady = false;
  (async () => {
    try {
      const pack = await (await fetch("character/character.json")).json();
      const base = await keyedTexture("character/" + pack.base);
      const baseMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(CHAR_W, CHAR_H),
        new THREE.MeshBasicMaterial({ map: base.tex, transparent: true, side: THREE.DoubleSide }));
      baseMesh.position.y = CHAR_H / 2;
      charGroup.add(baseMesh);
      for (const [key, part] of Object.entries(pack.parts)) {
        const { tex, w, h } = await keyedTexture("character/" + part.src);
        const pw = w / PACK_W * CHAR_W, ph = h / PACK_H * CHAR_H;
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(pw, ph),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
        m.position.set(
          (part.x + w / 2) / PACK_W * CHAR_W - CHAR_W / 2,
          CHAR_H - ((part.y + h / 2) / PACK_H * CHAR_H),
          0.02);
        m.visible = false;
        charGroup.add(m);
        parts[key] = m;
      }
      charGroup.traverse(o => { o.userData.hotspot = "lilin"; });
      charReady = true;
      chooser.classList.add("has-3d");
      talk(3000);
    } catch (e) {
      // 3D化に失敗したら2Dのまま（何もしない）
    }
  })();

  // 表情まわり（character.js と同じタイミング感覚）
  let talkEnd = 0, smileEnd = 0, lastFlap = 0, flapIdx = -1, hopStart = -1;
  function talk(ms) { talkEnd = performance.now() + (ms || 1600); }
  function smile(ms) { smileEnd = performance.now() + (ms || 1500); }
  function bounce() { hopStart = performance.now(); }
  window.LILIN3D = { talk, smile, bounce };
  (function blinkLoop() {
    const blink = parts[pack_eye_blink()], half = parts[pack_eye_half()];
    setTimeout(blinkLoop, 2400 + Math.random() * 3200);
    if (!charReady) return;
    if (half) half.visible = true;
    setTimeout(() => {
      if (half) half.visible = false;
      if (blink) blink.visible = true;
      setTimeout(() => {
        if (blink) blink.visible = false;
        if (half) half.visible = true;
        setTimeout(() => { if (half) half.visible = false; }, 90);
      }, 130);
    }, 90);
  })();
  let PACK = null;
  fetch("character/character.json").then(r => r.json()).then(j => { PACK = j; }).catch(() => {});
  function pack_eye_blink() { return PACK && PACK.eye ? PACK.eye.blink : "blink"; }
  function pack_eye_half() { return PACK && PACK.eye ? PACK.eye.half : "half_blink"; }

  function updateExpressions(now) {
    if (!charReady) return;
    const smileKey = PACK && PACK.expressions ? PACK.expressions.smile.mouth : "smile_mouth";
    const m1 = PACK && PACK.mouth ? PACK.mouth["1"] : "mouth_half";
    const m2 = PACK && PACK.mouth ? PACK.mouth["2"] : "mouth_open";
    const smiling = now < smileEnd;
    if (parts[smileKey]) parts[smileKey].visible = smiling;
    if (smiling) {
      if (parts[m1]) parts[m1].visible = false;
      if (parts[m2]) parts[m2].visible = false;
      return;
    }
    if (now < talkEnd) {
      if (now - lastFlap > 130) {
        lastFlap = now;
        flapIdx = Math.random() < 0.3 ? -1 : Math.floor(Math.random() * 2);
      }
      if (parts[m1]) parts[m1].visible = flapIdx === 0;
      if (parts[m2]) parts[m2].visible = flapIdx === 1;
    } else {
      if (parts[m1]) parts[m1].visible = false;
      if (parts[m2]) parts[m2].visible = false;
    }
  }

  // ---------- ホットスポット ----------
  const tip = document.getElementById("tip");
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const HOTSPOT_LABELS = { radio: "📻 ラジオ室へ", study: "🇩🇪 学習室へ", lilin: "リリンちゃん" };
  function pick(ev) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o) { if (o.userData.hotspot) return o.userData.hotspot; o = o.parent; }
    }
    return null;
  }
  renderer.domElement.addEventListener("pointermove", ev => {
    const spot = pick(ev);
    renderer.domElement.style.cursor = spot ? "pointer" : "default";
    if (tip) {
      if (spot) {
        tip.textContent = HOTSPOT_LABELS[spot];
        tip.style.left = (ev.clientX + 14) + "px";
        tip.style.top = (ev.clientY + 10) + "px";
        tip.style.opacity = "1";
      } else tip.style.opacity = "0";
    }
  });
  renderer.domElement.addEventListener("pointerdown", ev => {
    const spot = pick(ev);
    if (spot === "radio") location.href = "radio/";
    else if (spot === "study") location.href = "study/";
    else if (spot === "lilin") { smile(1300); bounce(); talk(1800); }
  });

  // ---------- カメラの揺れとマウスパララックス ----------
  let mx = 0, my = 0, tx = 0, ty = 0;
  chooser.addEventListener("pointermove", ev => {
    tx = (ev.clientX / window.innerWidth - 0.5) * 2;
    ty = (ev.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener("resize", () => {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
  });

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (chooser.classList.contains("hide")) return;
    const t = clock.getElapsedTime();
    const now = performance.now();
    mx += (tx - mx) * 0.03; my += (ty - my) * 0.03;
    camera.position.x = Math.sin(t * 0.14) * 0.45 + mx * 0.85;
    camera.position.y = 2.7 + Math.sin(t * 0.1) * 0.14 - my * 0.4;
    camera.lookAt(0.2, 1.95, -0.6);
    lampLight.intensity = lampLevel + Math.sin(t * 11) * 0.03 + Math.sin(t * 23.7) * 0.02;
    const pos = dust.geometry.attributes.position;
    for (let i = 0; i < dustCount; i++) {
      const [bx, by, bz, ph] = dustBase[i];
      pos.array[i * 3] = bx + Math.sin(t * 0.12 + ph) * 0.35;
      pos.array[i * 3 + 1] = by + Math.sin(t * 0.07 + ph * 1.7) * 0.3;
      pos.array[i * 3 + 2] = bz;
    }
    pos.needsUpdate = true;
    if (charReady) {
      let hopY = 0;
      if (hopStart > 0) {
        const k = (now - hopStart) / 450;
        if (k >= 1) hopStart = -1; else hopY = Math.sin(k * Math.PI) * 0.16;
      }
      charGroup.position.y = Math.sin(t * 1.6) * 0.03 + hopY;
      charGroup.rotation.z = Math.sin(t * 0.9) * 0.012;
      updateExpressions(now);
    }
    renderer.render(scene, camera);
  }
  animate();
})();
