"""Build reel 001 (PureMac) for one voice: beats from the transcript → phone capture → hook → reel → loudnorm.

usage: python3 scripts/build_v001.py <voice> [accent_slot 0-4]
expects videos/001-puremac/v2/voices/<voice>/{vo.wav,transcripts/vo.json}
"""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VID = ROOT / "videos/001-puremac/v2"
HF = "hyperframes@0.8.176"

voice = sys.argv[1]
accent = int(sys.argv[2]) if len(sys.argv) > 2 else 0
vdir = VID / "voices" / voice
pub_rel = f"v001/{voice}"
pub = ROOT / "studio/public" / pub_rel
pub.mkdir(parents=True, exist_ok=True)


def run(cmd, cwd=ROOT):
    print("  $", " ".join(map(str, cmd))[:160], flush=True)
    subprocess.run(cmd, cwd=cwd, check=True)


# ── 1. words for captions (display text) and anchors (normalised tokens) ──────────────────────
raw = [w for w in json.load(open(vdir / "transcripts/vo.json"))["words"] if w.get("type", "word") == "word"]
words = []
for w in raw:
    text = w["text"].strip()
    if words and (text in ("%",) or text.startswith("-")):  # "100" "%" → "100%", "pop" "-ups." → "pop-ups."
        words[-1]["text"] += text
        words[-1]["end"] = round(w["end"], 3)
        continue
    words.append({"text": text, "start": round(w["start"], 3), "end": round(w["end"], 3)})
for w in words:
    if w["text"] == "40":
        w["text"] = "40"
    if re.sub(r"\W", "", w["text"]).lower() == "mac":
        w["text"] = "MAC" + w["text"][3:]

tok = [re.sub(r"[^a-z0-9]", "", w["text"].lower()) for w in words]


def idx(t, nth=1):
    hits = [i for i, x in enumerate(tok) if x == t]
    if len(hits) < nth:
        sys.exit(f"anchor '{t}' #{nth} not in transcript: {tok}")
    return hits[nth - 1]


def at(t, nth=1, back=0):
    return words[idx(t, nth) - back]["start"]


b = {
    "t40": at("40"), "tThis": at("this"), "tFree1": at("free", 1),
    "tName": at("puremac"), "ghStart": round(at("100", back=1) - 0.06, 3),
    "t100": at("100"), "tFree2": at("free", 2), "tOpen": at("open"), "tSo": at("so"),
    "tCode": at("code"), "tGitHub": at("github"), "tAnd": at("blowing", back=2), "tBlowing": at("blowing"),
    "junkIntro": round(at("finds", 1, back=1) - 0.08, 3),
    "junk": round(at("system") - 0.12, 3),
    "tSystem": at("system"), "tOld": at("old"), "tXcode": at("xcode"), "tDocker": at("docker"),
    "uninstall": round(at("delete") - 0.12, 3), "tEvery": at("every"),
    "dupes": round(at("even", 2, back=1) - 0.12, 3), "tSimilar": at("similar"),
    "promise": round(at("no", 1) - 0.14, 3), "no1": at("no", 1), "no2": at("no", 2), "no3": at("no", 3),
    "install": round(at("install") - 0.12, 3), "tOne": at("one"),
    "cta": round(at("comment") - 0.1, 3), "tComment": at("comment"), "tMac": at("mac"),
    "end": round(words[-1]["end"] + 1.9, 3),
}
print(f"[{voice}] {len(words)} words, {b['end']:.1f}s, github {b['junkIntro'] - b['ghStart']:.1f}s")

# ── 2. GitHub phone capture timed to this voice ───────────────────────────────────────────────
gh_start = b["ghStart"]
hold1 = b["tSo"] - gh_start
hold2 = max(0.4, b["tAnd"] - (b["tSo"] + 1.6))
cap = vdir / "capture"
shots = {
    "out": str(cap), "fps": 30,
    "shots": [{
        "name": "gh-phone", "url": "https://github.com/momenbasel/PureMac", "mobile": True,
        "viewport": [393, 852], "scale": 3, "scheme": "dark", "stepped": True,
        "actions": [{"wait": int(hold1 * 1000)}, {"scroll": 650, "ms": 1600}, {"wait": int(hold2 * 1000)},
                    {"scroll": 1000, "ms": 1800}, {"wait": 1500}],
    }],
}
(vdir / "shots.json").write_text(json.dumps(shots))
run(["node", "capture/capture.mjs", vdir / "shots.json"])
shutil.copy(cap / "gh-phone.mp4", pub / "gh-phone.mp4")

# ── 3. HyperFrames hook timed to this voice, in this accent ───────────────────────────────────
hook = vdir / "hook"
hook.mkdir(exist_ok=True)
html = (ROOT / "hyperframes/index.html").read_text()
html = re.sub(r"const T = \{[^}]*\};", f"const T = {{ t40: {b['t40']}, tThis: {b['tThis']}, tFree: {b['tFree1']}, tName: {b['tName']}, dur: {gh_start} }};", html)
html = re.sub(r'data-duration="[\d.]+"', f'data-duration="{gh_start}"', html)
(hook / "index.html").write_text(html)
shutil.copy(ROOT / "hyperframes/icon.png", hook / "icon.png")
for name in ("hyperframes.json", "meta.json"):
    shutil.copy(ROOT / "hyperframes" / name, hook / name)
run(["node", "scripts/brand-css.mjs", str(accent), str(hook)])
run(["npx", "-y", HF, "render", "-o", str(pub / "hook.mp4"), "-f", "30", "-q", "delivery", "--quiet"], cwd=hook)

# ── 4. Remotion reel ──────────────────────────────────────────────────────────────────────────
shutil.copy(vdir / "vo.wav", pub / "vo.wav")
props = {"accent": accent, "assets": pub_rel, "words": words, "b": b}
props_path = vdir / "props.json"
props_path.write_text(json.dumps(props))
if voice == "af_heart":
    (ROOT / "studio/src/v001-default-props.json").write_text(json.dumps(props))
raw_mp4 = vdir / "reel_raw.mp4"
run(["npx", "remotion", "render", "src/index.ts", "v001-puremac", str(raw_mp4), f"--props={props_path}",
     "--codec=h264", "--crf=18", "--audio-bitrate=320k"], cwd=ROOT / "studio")

# ── 5. loudness to Instagram level ────────────────────────────────────────────────────────────
final = VID / f"puremac_{voice}.mp4"
run(["ffmpeg", "-v", "error", "-y", "-i", raw_mp4, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
     "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-movflags", "+faststart", final])
print(f"[{voice}] done → {final}")

# ── 6. Reel cover thumbnail (same accent) ─────────────────────────────────────────────────────
thumb_props = vdir / "thumb.json"
thumb_props.write_text(json.dumps({"accent": accent, "icon": "v001/icon.png", "paid": "CleanMyMac", "price": "$40/yr",
                                   "big": "FREE", "line1": "CleanMyMac", "line2": "alternative", "repo": "momenbasel/PureMac"}))
thumb = VID / f"thumbnail_{voice}.png"
run(["npx", "remotion", "still", "src/index.ts", "thumb", str(thumb), f"--props={thumb_props}"], cwd=ROOT / "studio")
print(f"[{voice}] thumbnail → {thumb}")
