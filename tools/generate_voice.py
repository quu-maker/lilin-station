#!/usr/bin/env python3
"""リリンちゃんの部屋の声（お迎え・反応・ひとりごと）を COEIROINK で事前生成する。

assets/voice.js が assets/voice/<key>.mp3 をキーで再生する。ここで作る mp3 が
ないキーは無音のまま（テキスト＋口パクだけ）になるので、キーと文言は
index.html（LINES／おかえりなさい）と assets/room3d.js（REACTIONS／TAP_LINES／
CHATTER）の表示テキストと一致させること。文言を変えたらこのファイルも直す。

使い方（COEIROINK のローカルエンジンを先に起動しておくこと）:
  bash radio/tools/prepare_coeiroink.sh   # 初回のみ（COEIROINK＋リリンちゃんの声を準備）
  bash radio/tools/start_coeiroink.sh     # エンジン起動（http://127.0.0.1:50032）
  python3 tools/generate_voice.py         # 25本を assets/voice/ に生成
  python3 tools/generate_voice.py --only greet tap0   # 指定キーだけ作り直す
  python3 tools/generate_voice.py --force             # 全部作り直す

話者はラジオと同じ COEIROINK:リリンちゃん（style 90）。有料APIなし。
"""

from __future__ import annotations

import argparse
import io
import json
import subprocess
import sys
import wave
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
PREFERENCES = ROOT / "radio" / "news-preferences.json"
OUT_DIR = ROOT / "assets" / "voice"
API_URL = "http://127.0.0.1:50032"
SAMPLE_RATE = 24000

# key -> 読み上げテキスト（表示文言と同じ。ただしドイツ語の単語は
# COEIROINK が読めるようにカタカナ読みに置き換えてある: boiler2 / chatter1 / chatter3）
LINES = {
    # 入口の選択画面のお迎え（index.html）
    "greet": "おかえりなさい！ 今日はどっちにしますか？",
    # ハブの時間帯あいさつ（index.html の LINES）
    "morning0": "おはようございます！ 今日もいい一日にしましょう。",
    "morning1": "おはようございます。朝の建築ラジオ、もうすぐ始まりますよ。",
    "day0": "こんにちは！ どの部屋からのぞいてみますか？",
    "day1": "こんにちは。休憩がてら、学習室でクイズでもどうですか？",
    "evening0": "こんばんは！ 今日もおつかれさまでした。",
    "evening1": "こんばんは。作品室の「小さな家」、見ていってくださいね。",
    "night0": "こんな時間までおつかれさまです。無理しないでくださいね。",
    "night1": "夜更かしですね。わたしも、もう少しだけ起きてます。",
    # 部屋の物のクリック反応（room3d.js の REACTIONS）
    "boiler0": "このボイラーがステーションの心臓部です。",
    "boiler1": "圧力は安定してます。今日も絶好調！",
    "boiler2": "ダンプ、蒸気でみんなを温めてます。",
    "fan0": "くるくる回るファン、涼しい風をお届け中です。",
    "fan1": "暑い日はこれが頼りなんです。",
    "panel0": "ランプの点滅は異常じゃなくて通常運転です。",
    "panel1": "計器は全部正常です！",
    # リリンちゃん本人をクリック（room3d.js の TAP_LINES）
    "tap0": "呼んでくれましたね！ 今日はどの部屋に行きますか？",
    "tap1": "わたしはいつもここでお迎えしてます。",
    "tap2": "ボイラー室、今日も温かいですよ。",
    # 放置時のひとこと（room3d.js の CHATTER）
    "chatter0": "暇なときはドイツ語の復習がおすすめです。",
    "chatter1": "グーテン・モルゲンは、おはようって意味ですよ。",
    "chatter2": "今日の放送、もう聴きました？",
    "chatter3": "イヒ・レルネ・アウホ・イェーデン・ターク。私も毎日勉強中です。",
    "chatter4": "なんだかお腹がすきました…。",
    "chatter5": "ボイラーの調子、いい感じです。",
}


def synthesize(session: requests.Session, text: str, prefs: dict) -> bytes:
    payload = {
        "volumeScale": 1.0,
        "pitchScale": 0.0,
        "intonationScale": 1.0,
        "prePhonemeLength": 0.0,
        "postPhonemeLength": 0.0,
        "outputSamplingRate": SAMPLE_RATE,
        "sampledIntervalValue": 0.0,
        "adjustedF0": [],
        "processingAlgorithm": "coeiroink",
        "speakerUuid": prefs["coeiroink_speaker_uuid"],
        "styleId": int(prefs.get("coeiroink_style_id", 90)),
        "text": text,
        "prosodyDetail": [],
        "speedScale": float(prefs.get("coeiroink_speed_scale", 1.0)),
    }
    resp = session.post(f"{API_URL}/v1/synthesis", json=payload, timeout=(10, 300))
    resp.raise_for_status()
    with wave.open(io.BytesIO(resp.content), "rb") as wav:
        if wav.getcomptype() != "NONE" or wav.getsampwidth() != 2:
            raise RuntimeError("COEIROINK から想定外の WAV が返りました")
        pcm = wav.readframes(wav.getnframes())
        rate = wav.getframerate()
        channels = wav.getnchannels()
    if not pcm:
        raise RuntimeError("COEIROINK から空の音声が返りました")
    return pcm, rate, channels


def wav_to_mp3(pcm: bytes, rate: int, channels: int, out_path: Path) -> float:
    proc = subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(rate),
         "-ac", str(channels), "-i", "pipe:0", "-codec:a", "libmp3lame",
         "-b:a", "64k", str(out_path)],
        input=pcm, capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg 失敗: {proc.stderr.decode(errors='replace')}")
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "json", str(out_path)], capture_output=True, text=True)
    return float(json.loads(probe.stdout)["format"]["duration"])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", default=None, help="作るキーを指定（省略時は全部）")
    ap.add_argument("--force", action="store_true", help="既存の mp3 も作り直す")
    args = ap.parse_args()
    keys = args.only or list(LINES)
    unknown = [k for k in keys if k not in LINES]
    if unknown:
        print(f"未知のキー: {unknown}", file=sys.stderr)
        return 2
    prefs = json.loads(PREFERENCES.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    try:
        session.get(f"{API_URL}/docs", timeout=5).raise_for_status()
    except requests.RequestException as exc:
        print(f"COEIROINK エンジンに繋がりません（先に start_coeiroink.sh を実行）: {exc}",
              file=sys.stderr)
        return 1
    done, skipped = [], []
    for key in keys:
        out_path = OUT_DIR / f"{key}.mp3"
        if out_path.exists() and not args.force:
            skipped.append(key)
            continue
        pcm, rate, channels = synthesize(session, LINES[key], prefs)
        seconds = wav_to_mp3(pcm, rate, channels, out_path)
        done.append((key, seconds))
        print(f"{key}: {seconds:.2f}s  {LINES[key]}")
    print(f"生成: {len(done)}本 / スキップ（既存）: {len(skipped)}本 -> {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
