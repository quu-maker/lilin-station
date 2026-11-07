// リリンちゃんの簡易ステージ：キャラパック（myradio/character-1）を読み、
// まばたき・口パク・笑顔を出す。ラジオ室の本格プレーヤーとは別の、軽い実装。
async function createLilinStage(mount, packDir) {
  const pack = await (await fetch(packDir + "character.json")).json();
  const [W, H] = pack.size;
  const stage = document.createElement("div");
  stage.className = "lilin-stage";
  stage.style.background = pack.background || "#161a26";
  const layer = (src, x, y) => {
    const img = document.createElement("img");
    img.src = packDir + src;
    img.alt = "";
    img.draggable = false;
    if (x !== undefined) {
      img.style.left = (x / W * 100) + "%";
      img.style.top = (y / H * 100) + "%";
      img.addEventListener("load", () => {
        img.style.width = (img.naturalWidth / W * 100) + "%";
      });
      img.className = "lilin-part";
    } else {
      img.className = "lilin-base";
    }
    stage.appendChild(img);
    return img;
  };
  layer(pack.base);
  const mouthImgs = {};
  for (const [key, part] of Object.entries(pack.parts)) {
    const img = layer(part.src, part.x, part.y);
    img.style.opacity = "0";
    if (key.startsWith("mouth") || key === (pack.expressions?.smile?.mouth)) mouthImgs[key] = img;
    else mouthImgs[key] = img;
  }
  mount.appendChild(stage);

  const show = (key, on) => { if (mouthImgs[key]) mouthImgs[key].style.opacity = on ? "1" : "0"; };
  const eyeHalf = pack.eye?.half, eyeBlink = pack.eye?.blink;
  function blink() {
    if (eyeHalf) show(eyeHalf, true);
    setTimeout(() => {
      if (eyeHalf) show(eyeHalf, false);
      if (eyeBlink) show(eyeBlink, true);
      setTimeout(() => {
        if (eyeBlink) show(eyeBlink, false);
        if (eyeHalf) show(eyeHalf, true);
        setTimeout(() => { if (eyeHalf) show(eyeHalf, false); }, 90);
      }, 130);
    }, 90);
    setTimeout(blink, 2400 + Math.random() * 3200);
  }
  setTimeout(blink, 1200);

  let talking = null;
  function talk(ms = 1600) {
    const keys = [pack.mouth?.["1"], pack.mouth?.["2"]].filter(Boolean);
    if (!keys.length) return;
    stopTalk();
    let last = null;
    talking = setInterval(() => {
      if (last) show(last, false);
      last = Math.random() < 0.3 ? null : keys[Math.floor(Math.random() * keys.length)];
      if (last) show(last, true);
    }, 130);
    setTimeout(stopTalk, ms);
  }
  function stopTalk() {
    if (talking) clearInterval(talking);
    talking = null;
    for (const k of [pack.mouth?.["1"], pack.mouth?.["2"]]) if (k) show(k, false);
  }
  function smile(ms = 1800) {
    const key = pack.expressions?.smile?.mouth;
    if (!key) return;
    stopTalk();
    show(key, true);
    setTimeout(() => show(key, false), ms);
  }
  return { talk, smile, el: stage };
}
