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
  scene.background = new THREE.Color(0x0e0e10);
  const camera = new THREE.PerspectiveCamera(46, W() / H(), 0.1, 100);
  camera.position.set(0, 2.7, 8.6);

  // ---------- 時間帯で空と光を変える ----------
  const hour = new Date().getHours();
  const slot = hour >= 5 && hour < 11 ? "morning" : hour < 17 ? "day" : hour < 23 ? "evening" : "night";
  const SKY = {
    morning: ["#8fb8e8", "#ffe3b0"], day: ["#6fa8e0", "#d6ecff"],
    evening: ["#3a3f4a", "#c77b4a"], night: ["#0a0d14", "#232a38"],
  }[slot];
  const dayLight = { morning: 0.55, day: 0.75, evening: 0.35, night: 0.12 }[slot];
  const lampLevel = { morning: 0.7, day: 0.45, evening: 1.25, night: 1.5 }[slot];

  // ---------- ライティング ----------
  scene.add(new THREE.AmbientLight(0xa39a8c, 0.34));
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

  // ---------- 部屋の箱（黒×黄色のボイラー室仕様） ----------
  box(12, 0.3, 9, 0x232327, 0, -0.15, 0);                    // 床（鉄板色）
  box(12, 6.5, 0.3, 0x1b1b1e, 0, 3.25, -4.5);                 // 奥の壁
  box(0.3, 6.5, 9, 0x17171a, 6, 3.25, 0);                     // 右の壁
  box(12, 0.3, 9, 0x121214, 0, 6.6, 0);                       // 天井
  // 左の壁（窓の開口を残して4分割）
  box(0.3, 6.5, 2.6, 0x17171a, -6, 3.25, -3.2);
  box(0.3, 6.5, 2.2, 0x17171a, -6, 3.25, 3.4);
  box(0.3, 1.6, 4.2, 0x17171a, -6, 5.7, -0.1);
  box(0.3, 1.5, 4.2, 0x17171a, -6, 0.75, -0.1);

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
  // 窓枠と格子とブラインド
  box(0.14, 3.6, 0.14, 0x3a3a3e, -5.85, 3.35, -2.15);
  box(0.14, 3.6, 0.14, 0x3a3a3e, -5.85, 3.35, 1.95);
  box(0.14, 0.14, 4.24, 0x3a3a3e, -5.85, 5.1, -0.1);
  box(0.14, 0.14, 4.24, 0x3a3a3e, -5.85, 1.6, -0.1);
  box(0.08, 3.5, 0.08, 0x2c2c30, -5.85, 3.35, -0.8);
  box(0.08, 3.5, 0.08, 0x2c2c30, -5.85, 3.35, 0.6);
  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0x2e2e33, transparent: true, opacity: 0.88, roughness: 1, side: THREE.DoubleSide,
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
  rctx.fillStyle = "#222226"; rctx.fillRect(0, 0, 256, 256);
  rctx.strokeStyle = "#e8b400"; rctx.lineWidth = 7;
  rctx.strokeRect(14, 14, 228, 228);
  rctx.save(); rctx.translate(128, 128); rctx.rotate(Math.PI / 4);
  rctx.strokeRect(-52, -52, 104, 104);
  rctx.strokeStyle = "#8a7200"; rctx.strokeRect(-30, -30, 60, 60);
  rctx.restore();
  const rugTex = new THREE.CanvasTexture(rugCanvas);
  rugTex.encoding = THREE.sRGBEncoding;
  const rug = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.07, 3.6),
    new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 }));
  rug.position.set(0.4, 0.04, 0.9);
  scene.add(rug);

  // ---------- 机とラジオ（学習室／ラジオ室のホットスポット） ----------
  const deskGroup = new THREE.Group(); scene.add(deskGroup);
  box(2.6, 0.12, 1.2, 0x333338, -4.2, 1.5, -2.2, deskGroup);
  for (const [x, z] of [[-5.35, -2.7], [-3.05, -2.7], [-5.35, -1.7], [-3.05, -1.7]])
    box(0.1, 1.5, 0.1, 0x2a2a2e, x, 0.75, z, deskGroup);
  // ラジオ（黄色ボディ）
  const radioGroup = new THREE.Group(); radioGroup.position.set(-4.75, 1.56, -2.35); scene.add(radioGroup);
  box(0.78, 0.52, 0.3, 0xe8b400, 0, 0.26, 0, radioGroup);
  box(0.66, 0.4, 0.03, 0x1c1c1f, 0, 0.26, 0.16, radioGroup);
  const dialGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.05, 20);
  for (const dx of [-0.18, 0.18]) {
    const d = new THREE.Mesh(dialGeo, mat(0x111111));
    d.rotation.x = Math.PI / 2; d.position.set(dx, 0.14, 0.18); radioGroup.add(d);
  }
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.85, 6), mat(0xcccccc, 0.4));
  antenna.position.set(0.3, 0.85, -0.05); antenna.rotation.z = -0.5; radioGroup.add(antenna);
  // ランプ
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.1, 20), mat(0x222226));
  lampBase.position.set(-3.55, 1.61, -2.45); scene.add(lampBase);
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.36, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xe8b400, emissive: 0xffb45c, emissiveIntensity: 0.85, side: THREE.DoubleSide }));
  lampShade.position.set(-3.55, 2.05, -2.45); scene.add(lampShade);
  // 本とマグカップ
  box(0.55, 0.06, 0.4, 0xd8d2c2, -4.05, 1.6, -1.95).rotation.y = 0.25;
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.14, 16), mat(0xe8e2d2));
  mug.position.set(-3.8, 1.63, -2.6); scene.add(mug);

  // 本棚
  const shelfGroup = new THREE.Group(); shelfGroup.position.set(-5.55, 0, -3.9); scene.add(shelfGroup);
  box(0.9, 3.4, 0.12, 0x2c2c30, 0, 1.7, -0.45, shelfGroup);
  box(0.9, 3.4, 0.12, 0x2c2c30, 0, 1.7, 0.45, shelfGroup);
  const bookColors = [0x8a4a3a, 0x3a5a8a, 0x4a7a58, 0xe8b400, 0x6a5a8a, 0xd8d2c2, 0x3a7a76];
  for (let s = 0; s < 3; s++) {
    box(0.95, 0.09, 1.0, 0x35353a, 0, 0.55 + s * 1.05, 0, shelfGroup);
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

  // ベッド（ボイラーに場所を譲って右の壁沿いへ）
  const bedGroup = new THREE.Group();
  bedGroup.position.set(4.85, 0, 0.9); bedGroup.rotation.y = Math.PI / 2;
  scene.add(bedGroup);
  box(3.4, 0.35, 2.0, 0x2a2a2e, 0, 0.35, 0, bedGroup);
  box(3.3, 0.3, 1.9, 0x2e2e33, 0, 0.68, 0, bedGroup);
  box(0.85, 0.18, 1.1, 0xe8e2d2, -1.05, 0.9, 0, bedGroup);
  box(0.8, 0.16, 1.0, 0xe8b400, -0.95, 0.88, 0.25, bedGroup).rotation.z = 0.08;

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

  // ---------- 部屋のおめかし（ポスター・ぬいぐるみ・小物） ----------
  function canvasTex(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }
  const poster = (tex, w, h, x, y, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    m.position.set(x, y, z); m.rotation.y = ry || 0;
    scene.add(m); return m;
  };
  // ポスター2枚（星／月）
  poster(canvasTex(128, 160, (g, w, h) => {
    g.fillStyle = "#202024"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#f5c518"; g.beginPath();
    const cx = w / 2, cy = h / 2 - 8, R = 38, r = 16;
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R;
      g[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    g.closePath(); g.fill();
    g.fillStyle = "#f5c518"; g.font = "bold 17px sans-serif"; g.textAlign = "center";
    g.fillText("my star", cx, h - 18);
  }), 0.85, 1.06, 1.9, 4.35, -4.32);
  poster(canvasTex(128, 160, (g, w, h) => {
    g.fillStyle = "#141416"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#d8d8d8";
    for (let i = 0; i < 22; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    g.fillStyle = "#f5c518"; g.beginPath(); g.arc(w / 2, h / 2 - 10, 30, 0, 7); g.fill();
    g.fillStyle = "#141416"; g.beginPath(); g.arc(w / 2 + 14, h / 2 - 18, 26, 0, 7); g.fill();
    g.fillStyle = "#e8e2d2"; g.font = "bold 15px sans-serif"; g.textAlign = "center";
    g.fillText("good night", w / 2, h - 16);
  }), 0.85, 1.06, 2.95, 4.3, -4.32);
  // ON AIR サイン（黄色ネオン）
  poster(canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = "#101012"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#ffd23d"; g.lineWidth = 5; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = "#ff4444"; g.beginPath(); g.arc(38, h / 2, 11, 0, 7); g.fill();
    g.fillStyle = "#ffd23d"; g.font = "bold 44px sans-serif"; g.textAlign = "center";
    g.fillText("ON AIR", w / 2 + 18, h / 2 + 16);
  }), 1.5, 0.56, -1.6, 4.9, -4.32);
  // 壁掛け時計（左の壁寄りへ移動）
  const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.07, 28), mat(0xf3ead8));
  clockFace.rotation.x = Math.PI / 2; clockFace.position.set(-3.45, 4.5, -4.3); scene.add(clockFace);
  box(0.05, 0.3, 0.03, 0x333333, -3.45, 4.63, -4.25).rotation.z = -0.5;
  box(0.04, 0.24, 0.03, 0x333333, -3.38, 4.45, -4.25).rotation.z = -1.2;
  // ベッドのぬいぐるみ（くま）
  const plush = new THREE.Group(); plush.position.set(0.85, 0.86, 0.25); bedGroup.add(plush);
  const plushMat = mat(0xd9a0b8);
  const sph = (r, x, y, z, parent, material) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), material || plushMat);
    m.position.set(x, y, z); parent.add(m); return m;
  };
  sph(0.21, 0, 0.18, 0, plush); sph(0.16, 0, 0.48, 0, plush);
  sph(0.07, -0.12, 0.62, 0, plush); sph(0.07, 0.12, 0.62, 0, plush);
  sph(0.09, 0, 0.42, 0.14, plush, mat(0xf3d9e2));
  // ラグの上のクッション
  for (const [x, z, col, rz] of [[2.15, 1.75, 0xe8b400, 0.4], [-1.5, 2.05, 0x3a3a3e, -0.3]]) {
    const cu = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.2, 22), mat(col));
    cu.position.set(x, 0.14, z); cu.rotation.y = rz; scene.add(cu);
  }
  // ベッド脇のサイドテーブルと観葉植物（ベッドの移動に合わせて）
  const sideTop = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.07, 22), mat(0x333338));
  sideTop.position.set(3.5, 0.85, 2.15); scene.add(sideTop);
  const sideLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.85, 10), mat(0x2a2a2e));
  sideLeg.position.set(3.5, 0.42, 2.15); scene.add(sideLeg);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.16, 14), mat(0xb8563e));
  pot.position.set(3.5, 0.97, 2.15); scene.add(pot);
  sph(0.17, 3.5, 1.22, 2.15, scene, mat(0x3f7d4e));
  sph(0.12, 3.35, 1.12, 2.25, scene, mat(0x4c9159));
  sph(0.12, 3.65, 1.14, 2.05, scene, mat(0x4c9159));
  // 天井のペンダントライト
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 6), mat(0x222222));
  cord.position.set(0.4, 6.15, 0.3); scene.add(cord);
  const pendant = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.4, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xe8b400, emissive: 0xffb45c, emissiveIntensity: 0.7, side: THREE.DoubleSide }));
  pendant.position.set(0.4, 5.55, 0.3); scene.add(pendant);
  // 右の壁の写真ストリング
  for (let i = 0; i < 5; i++) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.42),
      mat([0xf5c518, 0xe8e2d2, 0x3a3a3e, 0xf5e9c8, 0x8a8a8a][i]));
    card.position.set(5.8, 3.75 - Math.sin(i / 4 * Math.PI) * 0.18, -1.7 + i * 0.62);
    card.rotation.y = -Math.PI / 2; card.rotation.z = (i % 2 ? -1 : 1) * 0.07;
    scene.add(card);
  }
  // 床の本と収納ボックス（左手前の隅へ）
  box(0.5, 0.05, 0.36, 0x8a4a3a, -2.3, 0.05, 1.3).rotation.y = 0.5;
  box(0.44, 0.05, 0.32, 0xe8b400, -2.25, 0.1, 1.28).rotation.y = 0.2;
  box(0.9, 0.62, 0.7, 0x3a3a3e, -5.25, 0.31, 2.45);
  box(0.75, 0.5, 0.6, 0xe8b400, -5.25, 0.87, 2.45);
  // 窓辺の小さい鉢植え
  for (const z of [-1.3, 0.7]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.12, 12), mat(0xe8e2d2));
    p.position.set(-5.8, 1.72, z); scene.add(p);
    sph(0.1, -5.8, 1.88, z, scene, mat(0x4c9159));
  }

  // ---------- ボイラーと配管と制御盤 ----------
  const hazardTex = canvasTex(128, 32, (g, w, h) => {
    g.fillStyle = "#151517"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#f5c518";
    for (let x = -h; x < w + h; x += 32) {
      g.beginPath();
      g.moveTo(x, h); g.lineTo(x + 16, 0); g.lineTo(x + 32, 0); g.lineTo(x + 16, h);
      g.closePath(); g.fill();
    }
  });
  hazardTex.wrapS = THREE.RepeatWrapping; hazardTex.repeat.set(3, 1);
  const metal = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 });
  const boiler = new THREE.Group(); boiler.position.set(4.35, 0, -3.15); scene.add(boiler);
  const bBody = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 3.3, 28), metal(0x2b2b30));
  bBody.position.y = 1.65; boiler.add(bBody);
  const bCap = new THREE.Mesh(new THREE.SphereGeometry(1.05, 24, 12), metal(0x2b2b30));
  bCap.scale.y = 0.42; bCap.position.y = 3.3; boiler.add(bCap);
  const bBandLow = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.32, 28),
    new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.7 }));
  bBandLow.position.y = 0.38; boiler.add(bBandLow);
  const bBandTop = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.16, 28), metal(0xe8b400));
  bBandTop.position.y = 2.62; boiler.add(bBandTop);
  const bDoor = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.07, 24), metal(0x17171a));
  bDoor.rotation.x = Math.PI / 2; bDoor.position.set(0, 1.05, 1.06); boiler.add(bDoor);
  const bRim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 10, 28), metal(0xe8b400));
  bRim.position.set(0, 1.05, 1.1); boiler.add(bRim);
  box(0.2, 0.05, 0.05, 0xe8b400, 0, 1.05, 1.14, boiler);
  const bGauge = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 20), mat(0xf3ead8));
  bGauge.rotation.x = Math.PI / 2; bGauge.position.set(0, 2.12, 1.06); boiler.add(bGauge);
  box(0.03, 0.11, 0.02, 0xc23b2e, 0.02, 2.16, 1.1, boiler).rotation.z = -0.6;
  // バルブ（赤ハンドル）
  const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 10), metal(0x3d3d42));
  stub.rotation.z = Math.PI / 2; stub.position.set(3.12, 1.8, -3.15); scene.add(stub);
  const valve = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.032, 10, 24), metal(0xc23b2e));
  valve.rotation.y = Math.PI / 2; valve.position.set(2.9, 1.8, -3.15); scene.add(valve);
  // 配管
  const pipe = (r, len, x, y, z, axis) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), metal(0x3d3d42));
    if (axis === "x") p.rotation.z = Math.PI / 2;
    if (axis === "z") p.rotation.x = Math.PI / 2;
    p.position.set(x, y, z); scene.add(p); return p;
  };
  pipe(0.09, 3.3, 4.35, 4.95, -3.15, "y");
  pipe(0.09, 6.4, 1.15, 6.2, -3.15, "x");
  pipe(0.07, 1.7, -2.05, 5.35, -3.15, "y");
  pipe(0.07, 8.6, 0.2, 5.55, -4.18, "x");
  for (const bx of [-3, 0.5, 3.5]) pipe(0.088, 0.16, bx, 5.55, -4.18, "x");
  for (const bx of [-1.2, 2.2]) pipe(0.105, 0.14, bx, 6.2, -3.15, "x");
  // 床のハザードライン
  const hazardFloor = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.55),
    new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.8 }));
  hazardFloor.rotation.x = -Math.PI / 2; hazardFloor.position.set(4.35, 0.02, -1.5);
  scene.add(hazardFloor);
  // 制御盤（ランプが点滅する）
  const panelBox = box(1.5, 1.0, 0.14, 0x1b1b1f, -3.1, 2.6, -4.32);
  panelBox.userData.hotspot = "panel";
  const lampCols = [0x3fe08a, 0xffd23d, 0x3fe08a, 0x8a8a8a, 0xffd23d, 0x3fe08a];
  lampCols.forEach((c, i) => {
    const dot = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1),
      new THREE.MeshBasicMaterial({ color: c }));
    dot.position.set(-3.62 + (i % 3) * 0.52, 2.82 - Math.floor(i / 3) * 0.42, -4.24);
    scene.add(dot);
  });
  const panelLight = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.13),
    new THREE.MeshBasicMaterial({ color: 0xff3333 }));
  panelLight.position.set(-2.32, 2.28, -4.24);
  panelLight.userData.hotspot = "panel";
  scene.add(panelLight);
  boiler.traverse(o => { o.userData.hotspot = "boiler"; });
  // ドラム缶とクレート
  const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.85, 18), metal(0xd8a800));
  barrel1.position.set(-5.35, 0.43, 0.75); scene.add(barrel1);
  const barrel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.85, 18), metal(0x2e2e33));
  barrel2.position.set(-4.6, 0.43, 1.08); scene.add(barrel2);
  const barrelBand = new THREE.Mesh(new THREE.CylinderGeometry(0.335, 0.335, 0.12, 18), metal(0xe8b400));
  barrelBand.position.set(-4.6, 0.55, 1.08); scene.add(barrelBand);
  box(0.72, 0.6, 0.72, 0x35353a, -4.35, 0.3, -3.95);
  box(0.55, 0.45, 0.55, 0xe8b400, -4.35, 0.83, -3.95).rotation.y = 0.3;

  // ---------- 手前の放送カウンター（彼女が上半身だけ見える構図に） ----------
  const desk2 = new THREE.Group(); desk2.position.set(0.45, 0, 1.75); scene.add(desk2);
  box(4.4, 0.12, 0.85, 0x242428, 0, 1.22, 0, desk2);
  box(4.4, 1.16, 0.08, 0x1b1b1f, 0, 0.6, 0.38, desk2);
  box(0.08, 1.16, 0.85, 0x1b1b1f, -2.16, 0.6, 0, desk2);
  box(0.08, 1.16, 0.85, 0x1b1b1f, 2.16, 0.6, 0, desk2);
  box(4.4, 0.07, 0.03, 0xe8b400, 0, 1.12, 0.43, desk2);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.36),
    new THREE.MeshStandardMaterial({ map: canvasTex(256, 80, (g, w, h) => {
      g.fillStyle = "#101012"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#ffd23d"; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10);
      g.fillStyle = "#ff4444"; g.beginPath(); g.arc(34, h / 2, 9, 0, 7); g.fill();
      g.fillStyle = "#ffd23d"; g.font = "bold 38px sans-serif"; g.textAlign = "center";
      g.fillText("ON AIR", w / 2 + 14, h / 2 + 14);
    }), roughness: 0.9 }));
  plate.position.set(0, 0.62, 0.43); desk2.add(plate);
  // カウンターの上の小物：ノートPC・紙・ヘッドホン・マグ
  box(0.55, 0.03, 0.38, 0x2c2c30, -1.55, 1.3, -0.05, desk2);
  const lapScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.34),
    new THREE.MeshBasicMaterial({ color: 0x86c5c0 }));
  lapScreen.position.set(-1.55, 1.47, -0.26); lapScreen.rotation.x = -0.28; desk2.add(lapScreen);
  box(0.55, 0.36, 0.02, 0x2c2c30, -1.55, 1.46, -0.28, desk2).rotation.x = -0.28;
  box(0.42, 0.015, 0.3, 0xf0ead8, -0.55, 1.29, 0.1, desk2).rotation.y = 0.3;
  box(0.42, 0.015, 0.3, 0xe8e2d2, 0.15, 1.29, 0.16, desk2).rotation.y = -0.2;
  const phones = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.032, 8, 20, Math.PI), mat(0x1c1c1f));
  phones.position.set(-1.05, 1.29, 0.18); phones.rotation.x = -Math.PI / 2; phones.rotation.z = 0.5;
  desk2.add(phones);
  const mug2 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.14, 16), mat(0xe8b400));
  mug2.position.set(1.75, 1.35, 0.15); desk2.add(mug2);
  desk2.traverse(o => { o.userData.hotspot = "radio"; });
  // マイク（スタンド＋ブーム＋本体）※シーンスペースで組み立て
  const micStand = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.05, 18), mat(0x1c1c1f));
  micStand.position.set(1.3, 1.3, 1.6); scene.add(micStand);
  const micPole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.5, 8), mat(0x2c2c30));
  micPole.position.set(1.3, 1.55, 1.6); scene.add(micPole);
  const micArm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.62, 8), mat(0x2c2c30));
  micArm.position.set(1.13, 1.83, 1.38);
  micArm.lookAt(0.98, 1.9, 1.14); micArm.rotateX(Math.PI / 2);
  scene.add(micArm);
  const micBody = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.24, 14), mat(0x242428));
  micBody.position.set(0.95, 1.88, 1.08); micBody.rotation.z = 0.7; micBody.rotation.x = 0.4;
  scene.add(micBody);
  const micRing = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.012, 8, 18), mat(0xe8b400));
  micRing.position.set(0.99, 1.95, 1.13); micRing.rotation.x = Math.PI / 2 - 0.4; micRing.rotation.y = 0.7;
  scene.add(micRing);
  for (const m of [micStand, micPole, micArm, micBody, micRing]) m.userData.hotspot = "radio";

  // ---------- 小物を増やす（作業台・ファン・はしご・消火器ほか） ----------
  // 作業台とツールボード
  box(2.3, 0.1, 0.8, 0x333338, -0.6, 0.95, -4.0);
  for (const [lx, lz] of [[-1.65, -4.3], [0.45, -4.3], [-1.65, -3.7], [0.45, -3.7]])
    box(0.08, 0.95, 0.08, 0x2a2a2e, lx, 0.48, lz);
  box(1.9, 1.1, 0.05, 0x242428, -0.6, 2.25, -4.3);
  box(0.08, 0.5, 0.04, 0xe8b400, -1.25, 2.3, -4.26);
  box(0.07, 0.42, 0.04, 0x8a8a8a, -0.85, 2.26, -4.26);
  box(0.16, 0.3, 0.04, 0xc23b2e, -0.35, 2.32, -4.26);
  const canGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.18, 12);
  for (const [cx, cc] of [[-1.4, 0xe8b400], [-1.2, 0x3a3a3e], [0.25, 0x8a4a3a]]) {
    const can = new THREE.Mesh(canGeo, mat(cc));
    can.position.set(cx, 1.09, -4.05); scene.add(can);
  }
  const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.07, 18), mat(0xe8b400));
  stoolSeat.position.set(-0.15, 0.56, -3.25); scene.add(stoolSeat);
  const stoolLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.53, 10), mat(0x2a2a2e));
  stoolLeg.position.set(-0.15, 0.27, -3.25); scene.add(stoolLeg);
  const toolbox = box(0.55, 0.28, 0.3, 0xc23b2e, 0.15, 1.14, -4.0);
  const tbHandle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 8, 16, Math.PI), mat(0x1c1c1f));
  tbHandle.position.set(0.15, 1.29, -4.0); scene.add(tbHandle);
  // 壁のファン（回る）
  const fanGroup = new THREE.Group(); fanGroup.position.set(0.55, 4.65, -4.3); scene.add(fanGroup);
  const fanRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 10, 28), metal(0x2c2c30));
  fanGroup.add(fanRing);
  const fanBlades = new THREE.Group(); fanGroup.add(fanBlades);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xd8a800, roughness: 0.6, side: THREE.DoubleSide }));
    blade.position.y = 0.22;
    const holder = new THREE.Group();
    holder.rotation.z = i * Math.PI * 2 / 3;
    holder.add(blade); fanBlades.add(holder);
  }
  const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 14), metal(0x2c2c30));
  fanHub.rotation.x = Math.PI / 2; fanGroup.add(fanHub);
  fanGroup.traverse(o => { o.userData.hotspot = "fan"; });
  // 追加の計器
  for (const [gx, gy, gr] of [[-2.2, 3.45, 0.13], [-1.82, 3.36, 0.1]]) {
    const gg = new THREE.Mesh(new THREE.CylinderGeometry(gr, gr, 0.04, 18), mat(0xf3ead8));
    gg.rotation.x = Math.PI / 2; gg.position.set(gx, gy, -4.32); scene.add(gg);
  }
  // ボイラーへのはしご
  const ladder = new THREE.Group(); ladder.position.set(3.28, 1.45, -1.8); ladder.rotation.x = -0.22;
  scene.add(ladder);
  box(0.05, 3.1, 0.04, 0xd8a800, -0.26, 0, 0, ladder);
  box(0.05, 3.1, 0.04, 0xd8a800, 0.26, 0, 0, ladder);
  for (let i = 0; i < 5; i++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.5, 8), metal(0xd8a800));
    rung.rotation.z = Math.PI / 2; rung.position.y = -1.2 + i * 0.6; ladder.add(rung);
  }
  // 消火器
  const extBody = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.42, 14), mat(0xc23b2e));
  extBody.position.set(3.05, 0.21, 1.0); scene.add(extBody);
  const extTop = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), mat(0x1c1c1f));
  extTop.position.set(3.05, 0.48, 1.0); scene.add(extTop);
  // 追加配管とホースのコイル
  pipe(0.05, 3.2, 5.56, 1.6, -3.0, "y");
  const hose = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 10, 26), mat(0x1c1c1f));
  hose.position.set(5.82, 2.9, -1.9); hose.rotation.y = Math.PI / 2; scene.add(hose);
  // 天井を横切る電球のスワッグ
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, x = -4.6 + t * 9.2;
    const b = new THREE.Mesh(bulbGeo, bulbMat);
    b.position.set(x, 5.7 - Math.sin(t * Math.PI) * 0.5, 1.3);
    scene.add(b);
  }
  // 警告サイン（右の壁）
  poster(canvasTex(96, 96, (g, w, h) => {
    g.fillStyle = "#f5c518"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#151517"; g.font = "bold 62px sans-serif"; g.textAlign = "center";
    g.fillText("!", w / 2, h / 2 + 16);
    g.font = "bold 15px sans-serif"; g.fillText("CAUTION", w / 2, h - 10);
  }), 0.52, 0.52, 5.82, 2.3, -3.1, -Math.PI / 2);

  // ---------- リリンちゃん（緑背景を抜いて立体の中に立たせる） ----------
  const PACK_W = 896, PACK_H = 768, CHAR_W = 2.75, CHAR_H = CHAR_W * PACK_H / PACK_W;
  const charGroup = new THREE.Group();
  charGroup.position.set(0.45, 0, 0.55);
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
      talk(3000);
    } catch (e) {
      // 3D化に失敗したら2Dのまま（何もしない）
    }
  })();

  // 表情まわり（character.js と同じタイミング感覚）
  // PACK は blinkLoop より前に宣言する（後ろだと TDZ で ReferenceError になり全体が止まる）
  let PACK = null;
  fetch("character/character.json").then(r => r.json()).then(j => { PACK = j; }).catch(() => {});
  function pack_eye_blink() { return PACK && PACK.eye ? PACK.eye.blink : "blink"; }
  function pack_eye_half() { return PACK && PACK.eye ? PACK.eye.half : "half_blink"; }
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
  const HOTSPOT_LABELS = {
    radio: "📻 ラジオ室へ", study: "🇩🇪 学習室へ", lilin: "リリンちゃん",
    boiler: "ボイラー", fan: "ファン", panel: "制御盤",
  };
  const REACTIONS = {
    boiler: ["このボイラーがステーションの心臓部です。", "圧力は安定してます。今日も絶好調！", "Dampf（蒸気）でみんなを温めてます。"],
    fan: ["くるくる回るファン、涼しい風をお届け中です。", "暑い日はこれが頼りなんです。"],
    panel: ["ランプの点滅は異常じゃなくて通常運転です。", "計器は全部正常です！"],
  };
  let lastInteract = Date.now();
  chooser.addEventListener("pointerdown", () => { lastInteract = Date.now(); });
  // 声が再生されたら、その長さだけ口パクする
  document.addEventListener("lilin-voice", e => {
    if (e.detail && e.detail.ms) talk(e.detail.ms);
  });
  function react(spot) {
    const lines = REACTIONS[spot];
    if (!lines) return;
    lastInteract = Date.now();
    const idx = Math.floor(Math.random() * lines.length);
    const bubble = document.getElementById("bubbleText");
    if (bubble) bubble.textContent = lines[idx];
    if (window.LilinVoice) LilinVoice.play(spot + idx);
    talk(1900); smile(1100);
  }
  // リリンちゃん本人をクリックしたときのセリフ
  const TAP_LINES = [
    "呼んでくれましたね！ 今日はどの部屋に行きますか？",
    "わたしはいつもここでお迎えしてます。",
    "ボイラー室、今日も温かいですよ。",
  ];
  function tapLilin() {
    const idx = Math.floor(Math.random() * TAP_LINES.length);
    const bubble = document.getElementById("bubbleText");
    if (bubble) bubble.textContent = TAP_LINES[idx];
    if (window.LilinVoice) LilinVoice.play("tap" + idx);
  }
  // 放置してるとたまにひとこと（ドイツ語まじり）
  const CHATTER = [
    "暇なときはドイツ語の復習がおすすめです。",
    "「Guten Morgen」は、おはようって意味ですよ。",
    "今日の放送、もう聴きました？",
    "Ich lerne auch jeden Tag. 私も毎日勉強中です。",
    "なんだかお腹がすきました…。",
    "ボイラーの調子、いい感じです。",
  ];
  setInterval(() => {
    if (chooser.classList.contains("hide") || !chooser.classList.contains("has-3d")) return;
    if (Date.now() - lastInteract < 45000) return;
    lastInteract = Date.now();
    const idx = Math.floor(Math.random() * CHATTER.length);
    const bubble = document.getElementById("bubbleText");
    if (bubble) bubble.textContent = CHATTER[idx];
    if (window.LilinVoice) LilinVoice.play("chatter" + idx);
    talk(2000);
  }, 20000);
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
    else if (spot === "lilin") { smile(1300); bounce(); talk(1800); tapLilin(); lastInteract = Date.now(); }
    else if (spot) react(spot);
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
    if (typeof panelLight !== "undefined") panelLight.visible = (t % 1.4) < 1.0;
    if (typeof fanBlades !== "undefined") fanBlades.rotation.z = -t * 2.6;
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
    // 2Dフォールバックを隠すのは「キャラ読み込み済み＋実際に1フレーム描けた」後だけ。
    // 先に隠すと、描画が失敗したときに真っ黒になる。
    if (charReady && !chooser.classList.contains("has-3d")) {
      chooser.classList.add("has-3d");
    }
  }
  animate();
})();
