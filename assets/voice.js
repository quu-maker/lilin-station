// リリンちゃんの声（COEIROINK:リリンちゃんで事前生成した mp3 を再生する小さな仕組み）
// - LilinVoice.play("greet") のようにキーで再生する。ファイルは assets/voice/<key>.mp3
// - ブラウザの自動再生制限で止められた場合は、最初のタップで保留分を再生する
// - 再生が始まったら "lilin-voice" イベント（{key, ms}）を飛ばすので、口パク側はそれで同期する
(() => {
  const audio = new Audio();
  audio.preload = "auto";
  let pending = null;
  let greeted = false;

  function announce() {
    const ms = isFinite(audio.duration) && audio.duration > 0
      ? Math.round(audio.duration * 1000)
      : 1800;
    document.dispatchEvent(new CustomEvent("lilin-voice", {
      detail: { key: audio.dataset.key || "", ms },
    }));
  }
  audio.addEventListener("loadedmetadata", announce);

  function play(key) {
    try {
      audio.pause();
      audio.src = "assets/voice/" + key + ".mp3";
      audio.dataset.key = key;
      const p = audio.play();
      if (p && p.catch) p.catch(() => { pending = key; });
    } catch {
      pending = key;
    }
  }

  document.addEventListener("pointerdown", () => {
    if (pending) {
      const key = pending;
      pending = null;
      play(key);
    }
  });

  window.LilinVoice = {
    play,
    greet() {
      if (greeted) return;
      greeted = true;
      play("greet");
    },
  };
})();
