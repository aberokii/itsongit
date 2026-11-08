"""Build one itsongit reel end to end from videos/<slug>/video.json.

usage: pipeline/.venv/bin/python pipeline/make.py videos/<slug> [--slot N] [--skip-capture] [--skip-tts]

Steps: script → Kokoro voice (af_heart) → faster-whisper word times → script/transcript alignment → beats →
phone captures (GitHub + install page) → HyperFrames price-slash hook → Remotion reel → loudnorm → thumbnail →
post.json → QA contact sheet (verify/sheet.png: LOOK AT IT before publishing).
video.json format: see PLAYBOOK.md §5 and .claude/skills/itsongit-reel/SKILL.md.
"""
import argparse
import difflib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PY = sys.executable
HF = "hyperframes@0.8.176"
BRAND = json.loads((ROOT / "brand.json").read_text())
GITHUB_LINE = ("It's a hundred percent free and open source, so anyone can read the code, right here on GitHub. "
               "And it's blowing up right now.")
INSTALL_LINE = "Install it with one command, or just grab the download."


def run(cmd, cwd=ROOT, env=None):
    print("  $", " ".join(map(str, cmd))[:170], flush=True)
    subprocess.run(list(map(str, cmd)), cwd=cwd, check=True, env=env)


VDIR = ROOT  # set to the video folder in main()


def fetch(url, dest: Path, max_side=2200):
    """Download an image, convert to PNG (first frame for GIF/WebP), cap its size. Returns (w, h).
    A plain path ("assets/x.png") is read relative to the video folder, so specs work in any checkout."""
    if "://" not in url:
        data = (VDIR / url).read_bytes()
    else:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 itsongit"})
        data = urllib.request.urlopen(req, timeout=60).read()
    im = Image.open(io.BytesIO(data))
    im.seek(0)
    im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
    im.thumbnail((max_side, max_side))
    im.save(dest, "PNG")
    return im.size


def round_icon(path: Path):
    """An opaque square icon (no transparency, e.g. a flat App Store PNG) reads as a box on the dark canvas:
    give it the iOS-style rounded corners (22.5% radius). Icons that already have transparent corners are untouched."""
    from PIL import ImageDraw
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    if abs(w - h) > 2 or im.getpixel((1, 1))[3] < 250:
        return
    mask = Image.new("L", (w * 4, h * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w * 4 - 1, h * 4 - 1), radius=int(w * 4 * 0.225), fill=255)
    im.putalpha(mask.resize((w, h), Image.LANCZOS))
    im.save(path, "PNG")


def gh_api(path):
    out = subprocess.run(["gh", "api", path], capture_output=True, text=True)
    if out.returncode == 0:
        return json.loads(out.stdout)
    token = os.environ.get("GITHUB_TOKEN")
    req = urllib.request.Request(f"https://api.github.com/{path}", headers={"User-Agent": "itsongit", **({"Authorization": f"Bearer {token}"} if token else {})})
    return json.loads(urllib.request.urlopen(req, timeout=30).read())


def price_short(V):
    return V["paid"]["price"] + V["paid"]["per"].replace("/year", "/yr").replace("/month", "/mo")


def probe_wh(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True).stdout.strip().split(",")
    return int(out[0]), int(out[1])


def build_demo(V, pub, pub_rel, features, dur):
    """Media for hook B. video.json "demo": {"url": <mp4|mov|webm|gif|png|jpg>, "start": s} or {"images": [url, url]}.
    A clip/GIF becomes a muted, looped 30 fps H.264 of the hook's length. With no "demo", the first screenshot of
    the first two features is used (still moving: the hook pushes in and cuts on "This")."""
    d = V.get("demo") or {}
    url = d.get("url")
    if url and re.search(r"\.(mp4|mov|webm|gif)(\?|$)", url, re.I):
        src = VDIR / "work" / ("demo_src" + re.search(r"\.(mp4|mov|webm|gif)", url, re.I).group(0).lower())
        if "://" in url:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 itsongit"})
            src.write_bytes(urllib.request.urlopen(req, timeout=120).read())
        else:
            src.write_bytes((VDIR / url).read_bytes())
        run(["ffmpeg", "-v", "error", "-y", "-stream_loop", "-1", "-ss", str(d.get("start", 0)), "-i", src, "-t", f"{dur:.2f}", "-an",
             "-vf", "scale=1080:-2:flags=lanczos,fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "18", "-preset", "medium", pub / "demo.mp4"])
        w, h = probe_wh(pub / "demo.mp4")
        return {"video": f"{pub_rel}/demo.mp4", "w": w, "h": h}
    urls = d.get("images") or ([url] if url else [])
    imgs = []
    for j, u in enumerate(urls[:2]):
        w, h = fetch(u, pub / f"demo_{j}.png")
        imgs.append({"src": f"{pub_rel}/demo_{j}.png", "w": w, "h": h})
    if not imgs:  # fallback: first card of each of the first two features
        imgs = [{k: fe["cards"][0][k] for k in ("src", "w", "h")} for fe in features[:2] if fe["cards"]]
    return {"images": imgs, "w": imgs[0]["w"], "h": imgs[0]["h"]}


def norm(t):
    return re.sub(r"[^a-z0-9]", "", t.lower())


def voice_and_align(V, vdir, pub, work, sections, skip_tts):
    """Kokoro voice + whisper word times, then align the script tokens to the speech. Returns (toks, times, words)."""
    script = " ".join(t for _, t in sections)
    (vdir / "script.txt").write_text(script + "\n")
    toks = [(sec, w, norm(w)) for sec, text in sections for w in text.split()]
    vo = pub / "vo.wav"
    if not (skip_tts and vo.exists()):
        env = {**os.environ, "HYPERFRAMES_PYTHON": PY}
        voice = BRAND["voice"]
        run(["npx", "-y", HF, "tts", vdir / "script.txt", "-v", voice["id"], "-s", V.get("voice_speed", voice["speed"]), "-o", vo], env=env)
        run([PY, ROOT / "pipeline/transcribe.py", vo, work / "transcript.json", "--prompt", f"{V['name']}, {V['paid']['name']}, GitHub"])
    tw = json.loads((work / "transcript.json").read_text())["words"]
    sm = difflib.SequenceMatcher(a=[t[2] for t in toks], b=[norm(w["text"]) for w in tw], autojunk=False)
    times = [None] * len(toks)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            w = tw[blk.b + k]
            times[blk.a + k] = (w["start"], w["end"])
    i = 0
    while i < len(toks):
        if times[i] is None:
            j = i
            while j < len(toks) and times[j] is None:
                j += 1
            t0 = times[i - 1][1] if i > 0 else 0.0
            t1 = times[j][0] if j < len(toks) else tw[-1]["end"]
            step = (t1 - t0) / (j - i)
            for k in range(i, j):
                times[k] = (round(t0 + step * (k - i), 3), round(t0 + step * (k - i + 1), 3))
            i = j
        else:
            i += 1
    kw = norm(V["keyword"])
    words = [{"text": (V["keyword"].upper() + re.sub(r"^\w+", "", d)) if n == kw else d, "start": s_, "end": e_}
             for (_, d, n), (s_, e_) in zip(toks, times)]
    return toks, times, words


STORY_SCENES = {"slam", "counter", "app", "versus", "list", "character", "cta", "terminal", "rank"}
THEMES = {"paper", "crt", "keynote", "blueprint"}


def make_story(V, vdir, slot, pub, pub_rel, work, a):
    """Format C. video.json "beats": [{"say", "scene", ...scene fields}], see SKILL.md §3b. One beat = one spoken
    line = one animated scene, cut on its first word. Kit the cat lip-syncs to the voice and reacts per beat "mood"."""
    slug = vdir.name
    beats_in = V["beats"]
    for i, bt in enumerate(beats_in):
        if bt.get("scene") not in STORY_SCENES:
            sys.exit(f"beat {i}: scene must be one of {sorted(STORY_SCENES)}")
    if beats_in[-1]["scene"] != "cta" or norm(V["keyword"]) not in [norm(w) for w in beats_in[-1]["say"].split()]:
        sys.exit("the last beat must be scene 'cta' and say the keyword (\"Comment Mix, and I'll send you the link.\")")
    theme = V.get("theme", "paper")
    if theme not in THEMES:
        sys.exit(f"theme must be one of {sorted(THEMES)}")
    paid = V.get("paid") or {}
    V.setdefault("paid", {"name": paid.get("name", "GitHub")})  # dev listicles may have no paid tool
    sections = [(f"b{i}", bt["say"]) for i, bt in enumerate(beats_in)]
    toks, times, words = voice_and_align(V, vdir, pub, work, sections, a.skip_tts)
    print(f"[{slug}] story: {len(toks)} words, {len(beats_in)} beats")

    def start_of(i):
        return next(times[k][0] for k, t in enumerate(toks) if t[0] == f"b{i}")

    def anchor(i, word):
        hits = [times[k][0] for k, t in enumerate(toks) if t[0] == f"b{i}" and t[2] == norm(word)]
        if not hits:
            sys.exit(f"beat {i}: anchor '{word}' is not a word in its say: {beats_in[i]['say']!r}")
        return hits[0]

    end = round(words[-1]["end"] + 1.8, 3)
    if end > 60:
        sys.exit(f"story is {end:.1f}s: keep it 22-40 s (cut beats)")
    fetch(V["icon"], pub / "icon.png", 1024)
    round_icon(pub / "icon.png")
    beats = []
    for i, bt in enumerate(beats_in):
        b = {k: v for k, v in bt.items() if k not in ("say", "items", "image")}
        b["start"] = round(start_of(i) - 0.1, 3) if i else 0.0
        b["end"] = round(start_of(i + 1) - 0.1, 3) if i + 1 < len(beats_in) else end
        if bt.get("image"):
            w, h = fetch(bt["image"], pub / f"b{i}.png")
            b["image"] = {"src": f"{pub_rel}/b{i}.png", "w": w, "h": h}
        if bt.get("items"):
            b["items"] = [{"label": it["label"], "at": anchor(i, it["anchor"])} for it in bt["items"][:3]]
        if bt["scene"] == "versus":
            b.setdefault("paid", paid["name"]); b.setdefault("price", price_short(V)); b.setdefault("name", V["name"])
        beats.append(b)
    props = {"accent": slot, "dir": pub_rel, "words": words, "beats": beats, "keyword": V["keyword"], "end": end, "icon": "icon.png",
             "name": V["name"], "paid": paid.get("name"), "theme": theme}
    if "mascot" in V:
        props["mascot"] = bool(V["mascot"])
    (work / "props.json").write_text(json.dumps(props))
    raw = work / "reel_raw.mp4"
    run(["npx", "remotion", "render", "src/index.ts", "story", raw, f"--props={work / 'props.json'}", "--codec=h264", "--crf=18",
         "--audio-bitrate=320k"], cwd=ROOT / "studio")
    final = vdir / "FINAL.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac",
         "-b:a", "320k", "-ar", "48000", "-movflags", "+faststart", final])
    th = V["thumb"]
    if theme != "paper" or not paid.get("price"):  # developer line: a themed cover (studio/src/DevThumb.tsx)
        tprops, still = {"theme": theme, "accent": slot, "kicker": th["kicker"], "big": th["big"], "line": th["line"], "repo": th.get("repo", V["repo"])}, "devthumb"
    else:
        tprops = {"accent": slot, "icon": f"{pub_rel}/icon.png", "paid": V["paid"]["name"], "price": price_short(V),
                  "big": th.get("big", "FREE"), "line1": th["line1"], "line2": th["line2"], "repo": V["repo"], "job": V.get("job", "")}
        still = "thumb"
    (work / "thumb.json").write_text(json.dumps(tprops))
    run(["npx", "remotion", "still", "src/index.ts", still, vdir / "FINAL_thumbnail.png", f"--props={work / 'thumb.json'}"], cwd=ROOT / "studio")
    post_path = vdir / "post.json"
    post = json.loads(post_path.read_text()) if post_path.exists() else {}
    post.update({"title": V["title"], "video": "FINAL.mp4", "thumbnail": "FINAL_thumbnail.png",
                 "repo_url": f"https://github.com/{V['repo']}", "keyword": V["keyword"].upper(), "caption": V["caption"],
                 "dm_pitch": V["dm_pitch"], "install": V["install"], "dm_on_any_comment": True, "follow_gate": True, "slot": slot,
                 "price_source": paid.get("source"),
                 "experiment": {"format": "story", "hook": V.get("hook_type", "story"), "topic": V.get("topic_arm"), "window": V.get("window"),
                                "theme": theme, "line": V.get("line", "consumer"), "dev_format": V.get("dev_format")}})
    post_path.write_text(json.dumps(post, indent=2, ensure_ascii=False))
    ver = vdir / "verify"
    ts = [0.0] + [min(b["end"] - 0.05, b["start"] + 0.9) for b in beats[1:]] + [end - 0.3]
    for n_, t in enumerate(ts):
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", final, "-frames:v", "1", "-vf", "scale=216:-1", ver / f"s{n_:02d}.png"])
    files = sorted(ver.glob("s*.png"))
    for r_, row in enumerate([files[i:i + 7] for i in range(0, len(files), 7)]):
        args = sum((["-i", q] for q in row), [])
        run(["ffmpeg", "-v", "error", "-y", *args, "-filter_complex", f"hstack={len(row)}" if len(row) > 1 else "null", ver / f"row{r_}.png"])
    run(["ffmpeg", "-v", "error", "-y", "-i", vdir / "FINAL_thumbnail.png", "-vf", "scale=300:-1", ver / "thumb.png"])
    lufs = subprocess.run(["ffmpeg", "-hide_banner", "-i", final, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", lufs)
    print(f"[{slug}] DONE story {final} | {end:.1f}s | {m[-1] if m else '?'} LUFS | QA: {ver}/row*.png + thumb.png")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video_dir")
    ap.add_argument("--slot", type=int, default=None, help="accent slot 0-4 (default: video.json 'slot' or 0)")
    ap.add_argument("--skip-capture", action="store_true")
    ap.add_argument("--skip-tts", action="store_true")
    a = ap.parse_args()

    vdir = Path(a.video_dir).resolve()
    global VDIR
    VDIR = vdir
    V = json.loads((vdir / "video.json").read_text())
    slug = vdir.name
    slot = a.slot if a.slot is not None else V.get("slot", 0)
    owner, name = V["repo"].split("/")
    pub_rel = f"reels/{slug}"
    pub = ROOT / "studio/public" / pub_rel
    for d in (pub, vdir / "work", vdir / "verify"):
        d.mkdir(parents=True, exist_ok=True)
    work = vdir / "work"
    if V.get("format") == "story":  # format C: animated explainer with Kit the cat (studio/src/Story.tsx)
        return make_story(V, vdir, slot, pub, pub_rel, work, a)

    # ── 1. script: ordered sections → tokens ──────────────────────────────────────────────────
    sections = [("hook", V["hook"]), ("name", V.get("name_line", f"It's called {V['name']}.")), ("github", V.get("github_line", GITHUB_LINE))]
    for i, fe in enumerate(V["features"]):
        if fe.get("intro"):
            sections.append((f"f{i}intro", fe["intro"]))
        sections.append((f"f{i}", fe["say"]))
    for i, n in enumerate(V["nolist"]):
        sections.append((f"no{i}", n["say"]))
    # never promise "one command" when there isn't one; name the platforms so viewers know it runs on their device
    plats = V.get("platforms", [])
    plat_txt = (", ".join(plats[:-1]) + " and " + plats[-1]) if len(plats) > 1 else (plats[0] if plats else "")
    default_install = (INSTALL_LINE if not V["install"].lower().startswith("download") else
                       f"Just grab the free download{' for ' + plat_txt if plat_txt else ''}.")
    if plat_txt and not V["install"].lower().startswith("download"):
        default_install = f"It runs on {plat_txt}. " + INSTALL_LINE
    sections.append(("install", V.get("install_line", default_install)))
    sections.append(("cta", V.get("cta_line", f"Comment {V['keyword'].capitalize()}, and I'll send you the link.")))
    script = " ".join(t for _, t in sections)
    (vdir / "script.txt").write_text(script + "\n")
    toks = []  # (section, display, norm)
    for sec, text in sections:
        for w in text.split():
            toks.append((sec, w, norm(w)))
    print(f"[{slug}] script {len(toks)} words")

    # ── 2. voice + 3. word times ─────────────────────────────────────────────────────────────
    vo = pub / "vo.wav"
    if not (a.skip_tts and vo.exists()):
        env = {**os.environ, "HYPERFRAMES_PYTHON": PY}
        voice = BRAND["voice"]
        run(["npx", "-y", HF, "tts", vdir / "script.txt", "-v", voice["id"], "-s", voice["speed"], "-o", vo], env=env)
        run([PY, ROOT / "pipeline/transcribe.py", vo, work / "transcript.json", "--prompt", f"{V['name']}, {V['paid']['name']}, GitHub"])
    tw = json.loads((work / "transcript.json").read_text())["words"]

    # ── 4. align script tokens to transcript words (display = script spelling, time = speech) ──
    tnorm = [norm(w["text"]) for w in tw]
    sm = difflib.SequenceMatcher(a=[t[2] for t in toks], b=tnorm, autojunk=False)
    times = [None] * len(toks)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            w = tw[blk.b + k]
            times[blk.a + k] = (w["start"], w["end"])
    # fill gaps (e.g. "a hundred percent" vs "100%") by spreading across the gap's speech window
    i = 0
    while i < len(toks):
        if times[i] is None:
            j = i
            while j < len(toks) and times[j] is None:
                j += 1
            t0 = times[i - 1][1] if i > 0 else 0.0
            t1 = times[j][0] if j < len(toks) else tw[-1]["end"]
            step = (t1 - t0) / (j - i)
            for k in range(i, j):
                times[k] = (round(t0 + step * (k - i), 3), round(t0 + step * (k - i + 1), 3))
            i = j
        else:
            i += 1
    words = [{"text": d, "start": s, "end": e} for (_, d, _), (s, e) in zip(toks, times)]
    words = [w if norm(w["text"]) != norm(V["keyword"]) else {**w, "text": V["keyword"].upper() + re.sub(r"^\w+", "", w["text"])} for w in words]

    def sec_start(sec):
        return next(times[k][0] for k, t in enumerate(toks) if t[0] == sec)

    def at(sec, word, nth=1, default=None):
        hits = [times[k][0] for k, t in enumerate(toks) if t[0] == sec and t[2] == norm(word)]
        if len(hits) >= nth:
            return hits[nth - 1]
        if default is not None:
            return default
        sys.exit(f"anchor '{word}' not found in section {sec}: {[t[1] for t in toks if t[0] == sec]}")

    def last(sec, word):
        hits = [times[k][0] for k, t in enumerate(toks) if t[0] == sec and t[2] == norm(word)]
        return hits[-1]

    gh0 = sec_start("github")
    gh_end_guess = sec_start("f0intro" if V["features"][0].get("intro") else "f0")
    b = {
        "t40": at("hook", V["paid"]["anchor"]), "tThis": at("hook", "this"), "tFree1": last("hook", "free"),
        "tName": [times[k][0] for k, t in enumerate(toks) if t[0] == "name"][-1],
        "ghStart": round(gh0 - 0.06, 3),
        "t100": at("github", "hundred", default=gh0 + 0.3), "tFree2": at("github", "free", default=gh0 + 0.9),
        "tOpen": at("github", "open", default=gh0 + 1.4), "tSo": at("github", "so", default=gh0 + 2.4),
        "tBlowing": at("github", "blowing", default=gh_end_guess - 1.4),
        "promise": round(sec_start("no0") - 0.14, 3),
        "install": round(sec_start("install") - 0.12, 3), "tOne": at("install", "one", default=sec_start("install") + 0.8),
        "cta": round(sec_start("cta") - 0.1, 3), "tComment": at("cta", "comment"),
        "tKey": next(times[k][0] for k, t in enumerate(toks) if t[0] == "cta" and t[2] == norm(V["keyword"])),
        "end": round(words[-1]["end"] + 1.9, 3),
    }
    features = []
    for i, fe in enumerate(V["features"]):
        sec = f"f{i}"
        start = sec_start(f"{sec}intro") if fe.get("intro") else sec_start(sec)
        nxt = sec_start(f"f{i + 1}intro" if i + 1 < len(V["features"]) and V["features"][i + 1].get("intro") else f"f{i + 1}") if i + 1 < len(V["features"]) else sec_start("no0")
        features.append({"start": round(start - 0.12, 3), "cardsAt": round(sec_start(sec) - 0.12, 3) if fe.get("intro") else round(start - 0.12, 3),
                         "end": round(nxt - 0.12, 3), "cards": [], "chips": [],
                         "_images": fe["images"], "_swap": fe.get("swap_anchor"), "_chips": fe.get("chips", [])})
        for c in fe.get("chips", [])[:4]:
            features[-1]["chips"].append({"label": c["label"], "at": at(sec, c["anchor"])})
    nolist = [{"text": n["label"], "at": sec_start(f"no{i}")} for i, n in enumerate(V["nolist"])]
    print(f"[{slug}] {b['end']:.1f}s | github {gh_end_guess - gh0:.1f}s | features {[round(fe['end'] - fe['start'], 1) for fe in features]}")
    if b["end"] > 88:
        sys.exit("reel longer than 88 s: shorten the script (Instagram max 90 s)")

    # ── 5. images: icon, avatar, feature screenshots ──────────────────────────────────────────
    fetch(V["icon"], pub / "icon.png", 1024)
    round_icon(pub / "icon.png")
    fetch(f"https://github.com/{owner}.png?size=200", pub / "avatar.png", 200)
    for i, fe in enumerate(features):
        for j, url in enumerate(fe.pop("_images")[:2]):
            w, h = fetch(url, pub / f"f{i}_{j}.png")
            at_t = fe["cardsAt"] if j == 0 else at(f"f{i}", fe["_swap"]) if fe["_swap"] else round((fe["cardsAt"] + fe["end"]) / 2, 3)
            fe["cards"].append({"src": f"{pub_rel}/f{i}_{j}.png", "w": w, "h": h, "at": at_t})
        fe.pop("_swap"), fe.pop("_chips")

    # ── 6. phone captures timed to the voice ──────────────────────────────────────────────────
    gh_hold1 = max(1.0, b["tSo"] - b["ghStart"])
    gh_hold2 = max(0.4, b["tBlowing"] - 0.5 - (b["tSo"] + 1.6))
    inst_dur = b["cta"] - b["install"]
    shots = {"out": str(work), "fps": 30, "shots": [
        {"name": "gh-phone", "url": f"https://github.com/{V['repo']}", "mobile": True, "viewport": [393, 852], "scale": 3,
         "scheme": "light", "stepped": True, "measureAbout": True,
         "actions": [{"wait": int(gh_hold1 * 1000)}, {"scroll": 650, "ms": 1600}, {"wait": int(gh_hold2 * 1000)},
                     {"scroll": 1000, "ms": 1800}, {"wait": 2500}]},
        {"name": "install-phone", "url": V.get("install_url") or f"https://github.com/{V['repo']}/releases/latest", "mobile": True,
         "viewport": [393, 852], "scale": 3, "scheme": "light", "stepped": True,
         "actions": [{"wait": 1200}, {"scroll": 380, "ms": 1800}, {"wait": 900}, {"scroll": 700, "ms": 2500}, {"wait": int(max(1, inst_dur - 4.5) * 1000)}]},
    ]}
    if not (a.skip_capture and (pub / "gh-phone.mp4").exists()):
        (work / "shots.json").write_text(json.dumps(shots))
        run(["node", ROOT / "capture/capture.mjs", work / "shots.json"])
        shutil.copy(work / "gh-phone.mp4", pub / "gh-phone.mp4")
        shutil.copy(work / "install-phone.mp4", pub / "install-phone.mp4")
    box = json.loads((work / "gh-phone-about.json").read_text() or "null") if (work / "gh-phone-about.json").exists() else None
    k = 560 / 393  # phone screen width / CSS viewport
    about = ({"left": round(16 + box["x"] * k - 10), "top": round(16 + 64 + box["y"] * k - 10),
              "width": round(box["w"] * k + 20), "height": round(box["h"] * k + 20)} if box else
             {"left": 30, "top": 528, "width": 520, "height": 180})

    # ── 7. hook. A/B experiment (data/experiments.json): "price" = HyperFrames price-slash (A),
    #       "demo" = the app already running on frame 0, rendered inside Remotion (B). Same voiceover either way.
    hook_style = V.get("hook_style", "price")
    demo = None
    if hook_style == "demo":
        demo = build_demo(V, pub, pub_rel, features, b["ghStart"] + 0.6)
        print(f"[{slug}] hook B (demo): {demo}")
    # ── 7a. HyperFrames hook (price-slash), in this slot's accent ──────────────────────────────
    if hook_style != "demo":
        hook = work / "hook"
        hook.mkdir(exist_ok=True)
        html = (ROOT / "hyperframes/templates/price-slash.html").read_text()
        # the price is zoomed ~1.23x on frame 0; anything longer than "$40/year" (8 chars) is set smaller so it never clips
        pk = round(min(1.0, 7.6 / len(V["paid"]["price"] + V["paid"]["per"])), 3)
        for key, val in {"PAID": V["paid"]["name"], "PRICE": V["paid"]["price"], "PER": V["paid"]["per"], "NAME": V["name"], "PK": str(pk),
                         "JOB": V.get("job", ""), "JS": f"{round(min(56, 56 * 26 / max(1, len(V.get('job', '')))))}px"}.items():
            html = html.replace("{{" + key + "}}", val)
        html = re.sub(r"const T = \{[^}]*\};", f"const T = {{ t40: {b['t40']}, tThis: {b['tThis']}, tFree: {b['tFree1']}, tName: {b['tName']}, dur: {b['ghStart']} }};", html)
        html = re.sub(r'data-duration="[\d.]+"', f'data-duration="{b["ghStart"]}"', html)
        if not V.get("job"):  # specs from before the job line (≤ 006) render without it
            html = html.replace('<div id="job" class="center clip"', '<div id="job" class="center clip" hidden')
        (hook / "index.html").write_text(html)
        shutil.copy(pub / "icon.png", hook / "icon.png")
        for n_ in ("hyperframes.json", "meta.json"):
            shutil.copy(ROOT / "hyperframes" / n_, hook / n_)
        run(["node", ROOT / "scripts/brand-css.mjs", slot, hook])
        run(["npx", "-y", HF, "render", "-o", pub / "hook.mp4", "-f", "30", "-q", "delivery", "--quiet"], cwd=hook)

    # ── 8. Remotion reel + loudnorm ───────────────────────────────────────────────────────────
    meta = gh_api(f"repos/{V['repo']}")
    stars = round(meta["stargazers_count"] / 1000, 1)
    props = {"accent": slot, "dir": pub_rel, "words": words, "owner": owner, "name": name, "stars": stars, "about": about,
             "b": b, "features": features, "nolist": nolist,
             "install": {"cmd": V["install"], "url": V.get("install_url_label") or (V.get("install_url") or f"github.com/{V['repo']}/releases").replace("https://", "").replace("www.", "")[:34]},
             "keyword": V["keyword"], "hookStyle": hook_style, "demo": demo,
             "hookText": {"paid": V["paid"]["name"], "price": price_short(V), "job": V.get("job") or V["title"], "name": V["name"]}}
    (work / "props.json").write_text(json.dumps(props))
    raw = work / "reel_raw.mp4"
    run(["npx", "remotion", "render", "src/index.ts", "reel", raw, f"--props={work / 'props.json'}", "--codec=h264", "--crf=18",
         "--audio-bitrate=320k"], cwd=ROOT / "studio")
    final = vdir / "FINAL.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac",
         "-b:a", "320k", "-ar", "48000", "-movflags", "+faststart", final])

    # ── 9. thumbnail ──────────────────────────────────────────────────────────────────────────
    th = V["thumb"]
    tprops = {"accent": slot, "icon": f"{pub_rel}/icon.png", "paid": V["paid"]["name"], "price": price_short(V),
              "big": th.get("big", "FREE"), "line1": th["line1"], "line2": th["line2"], "repo": V["repo"], "job": V.get("job", "")}
    (work / "thumb.json").write_text(json.dumps(tprops))
    run(["npx", "remotion", "still", "src/index.ts", "thumb", vdir / "FINAL_thumbnail.png", f"--props={work / 'thumb.json'}"], cwd=ROOT / "studio")

    # ── 10. post.json (caption, DM) ───────────────────────────────────────────────────────────
    post_path = vdir / "post.json"
    post = json.loads(post_path.read_text()) if post_path.exists() else {}
    post.update({"title": V["title"], "video": "FINAL.mp4", "thumbnail": "FINAL_thumbnail.png",
                 "repo_url": f"https://github.com/{V['repo']}", "keyword": V["keyword"].upper(), "caption": V["caption"],
                 "dm_pitch": V["dm_pitch"], "install": V["install"], "dm_on_any_comment": True, "follow_gate": True, "slot": slot,
                 "price_source": V["paid"].get("source"),
                 # experiment arms, read back by pipeline/experiments.py
                 "experiment": {"format": "classic", "hook": hook_style, "topic": V.get("topic_arm"), "window": V.get("window")}})
    post_path.write_text(json.dumps(post, indent=2, ensure_ascii=False))

    # ── 11. QA sheet + loudness ───────────────────────────────────────────────────────────────
    ts = [0, 0.1, b["tThis"] + 0.6, b["tName"] + 0.2, b["tFree2"] + 0.5, b["tBlowing"] + 0.9]
    ts += [fe["cardsAt"] + 1.0 for fe in features] + [features[0]["start"] + 0.5, b["promise"] + 2.5, b["install"] + 1.8, b["end"] - 0.3]
    ver = vdir / "verify"
    for n_, t in enumerate(ts):
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", final, "-frames:v", "1", "-vf", "scale=216:-1", ver / f"s{n_:02d}.png"])
    files = sorted(ver.glob("s*.png"))
    rows = [files[i:i + 7] for i in range(0, len(files), 7)]
    for r_, row in enumerate(rows):
        args = sum((["-i", p] for p in row), [])
        run(["ffmpeg", "-v", "error", "-y", *args, "-filter_complex", f"hstack={len(row)}" if len(row) > 1 else "null", ver / f"row{r_}.png"])
    run(["ffmpeg", "-v", "error", "-y", "-i", vdir / "FINAL_thumbnail.png", "-vf", "scale=300:-1", ver / "thumb.png"])
    lufs = subprocess.run(["ffmpeg", "-hide_banner", "-i", final, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", lufs)
    print(f"[{slug}] DONE {final} | {b['end']:.1f}s | {m[-1] if m else '?'} LUFS | QA: {ver}/row*.png + thumb.png")


if __name__ == "__main__":
    main()
