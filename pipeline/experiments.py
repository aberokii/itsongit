"""Score the @itsongit A/B tests (data/experiments.json) from live Instagram numbers. Python 3.9+, stdlib only.

usage:
  python3 pipeline/experiments.py              fetch analytics (cached 6 h) and print the report
  python3 pipeline/experiments.py --refresh    ignore the cache
  python3 pipeline/experiments.py --all        include the baseline (reels before the test started) in the arm tables

Writes data/experiments/report.md. Only reels at least 48 h old count (Instagram's numbers lag and a reel's first
two days carry most of its views). Medians, not means: one breakout reel (Mixxx: 728 views) would swamp a mean.
The hook verdict also uses a within-day comparison (each test day has both arms), which removes the "good day /
bad day" noise from a small account's numbers.
"""
import argparse
import datetime as dt
import json
import random
import statistics as st
import sys
import time
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
import zernio as z  # noqa: E402

CFG = json.loads((ROOT / "data/experiments.json").read_text())
CACHE = ROOT / "data/experiments/analytics_cache.json"
OUT = ROOT / "data/experiments/report.md"
BERLIN = ZoneInfo("Europe/Berlin")


def fetch_all(refresh):
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    now = time.time()
    rows = []
    for pj in sorted((ROOT / "videos").glob("*/post.json")):
        post = json.loads(pj.read_text())
        zz = post.get("zernio") or {}
        if not zz.get("postId"):
            continue
        c = cache.get(zz["postId"])
        if refresh or not c or now - c["at"] > 6 * 3600:
            r = z.api("GET", "/analytics", query={"postId": zz["postId"], "platform": "instagram"})
            m = {}
            for p in r.get("platformAnalytics", []) or []:
                m = p.get("analytics") or r.get("analytics") or {}
            c = {"at": now, "m": m, "publishedAt": r.get("publishedAt")}
            cache[zz["postId"]] = c
            time.sleep(1.1)  # 60 req/min
        vj = pj.parent / "video.json"
        V = json.loads(vj.read_text()) if vj.exists() else {}
        exp = post.get("experiment") or {}
        num = pj.parent.name[:3]
        when = c.get("publishedAt") or zz.get("scheduledFor")
        if not when:
            continue
        local = dt.datetime.fromisoformat(when.replace("Z", "+00:00")).astimezone(BERLIN)
        m = c["m"]
        views = m.get("views") or 0
        rows.append({
            "reel": pj.parent.name, "local": local, "age_h": (dt.datetime.now(dt.timezone.utc) - local).total_seconds() / 3600,
            "test": local.date().isoformat() >= CFG["started"],
            "hook": exp.get("hook") or V.get("hook_style") or "price",
            "topic": exp.get("topic") or V.get("topic_arm") or CFG["baseline_topic"].get(num, "?"),
            "window": exp.get("window") or V.get("window") or window_of(local),
            "views": views, "skip": m.get("reelsSkipRate"), "watch": round((m.get("igReelsAvgWatchTime") or 0) / 1000, 1),
            "ss100": round(100 * ((m.get("shares") or 0) + (m.get("saves") or 0)) / views, 1) if views else 0.0,
            "comments": m.get("comments") or 0,
        })
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cache))
    return rows


def window_of(local):
    h = local.hour + local.minute / 60
    return ("early" if 5 <= h < 11 else "midday" if 11 <= h < 13 else "afternoon" if 13 <= h < 17 else
            "evening" if 17 <= h < 20.5 else "night")


def med(xs):
    xs = [x for x in xs if x is not None]
    return round(st.median(xs), 1) if xs else None


def boot_diff(a, b, n=4000, seed=7):
    """95% bootstrap interval for median(b) - median(a)."""
    a, b = [x for x in a if x is not None], [x for x in b if x is not None]
    if len(a) < 3 or len(b) < 3:
        return None
    rng = random.Random(seed)
    d = sorted(st.median(rng.choices(b, k=len(b))) - st.median(rng.choices(a, k=len(a))) for _ in range(n))
    return round(d[int(0.025 * n)], 1), round(d[int(0.975 * n)], 1)


def table(rows, key, order=None):
    groups = {}
    for r in rows:
        groups.setdefault(r[key], []).append(r)
    keys = order or sorted(groups)
    out = [f"| {key} | n | median views | median skip % | median watch s | shares+saves /100 views |", "|---|---|---|---|---|---|"]
    for k in keys:
        g = groups.get(k, [])
        if g:
            out.append(f"| {k} | {len(g)} | {med([r['views'] for r in g])} | {med([r['skip'] for r in g])} | {med([r['watch'] for r in g])} | {med([r['ss100'] for r in g])} |")
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--all", action="store_true")
    a = ap.parse_args()
    if z.DRY:
        sys.exit("ZERNIO_API_KEY not set")
    rows = [r for r in fetch_all(a.refresh) if r["age_h"] >= 48]
    test = [r for r in rows if r["test"]]
    base = [r for r in rows if not r["test"]]
    H, T = CFG["experiments"]["hook"], CFG["experiments"]["topic"]
    L = [f"# @itsongit experiments ({dt.date.today()})", "",
         f"Reels ≥48 h old: {len(rows)} ({len(base)} baseline before {CFG['started']}, {len(test)} in the test).", ""]

    L += ["## Hook test: " + H["question"], ""] + table(test, "hook", list(H["arms"])) + [""]
    days = {}
    for r in test:
        days.setdefault(r["local"].date(), {}).setdefault(r["hook"], []).append(r)
    paired = [(st.mean(x["skip"] for x in d["demo"]) - st.mean(x["skip"] for x in d["price"]),
               st.mean(x["views"] for x in d["demo"]) - st.mean(x["views"] for x in d["price"]))
              for d in days.values() if d.get("demo") and d.get("price") and all(x["skip"] is not None for x in d["demo"] + d["price"])]
    nA, nB = sum(r["hook"] == "price" for r in test), sum(r["hook"] == "demo" for r in test)
    ci = boot_diff([r["skip"] for r in test if r["hook"] == "price"], [r["skip"] for r in test if r["hook"] == "demo"])
    if paired:
        L.append(f"Within-day (B − A), {len(paired)} days: skip {st.mean(p[0] for p in paired):+.1f} pts, views {st.mean(p[1] for p in paired):+.0f}. "
                 f"B had the lower skip rate on {sum(p[0] < 0 for p in paired)} of {len(paired)} days.")
    if ci:
        L.append(f"Median skip difference B − A: 95% interval {ci[0]:+} to {ci[1]:+} pts (negative = B better).")
    if min(nA, nB) < H["min_per_arm"]:
        L.append(f"**Verdict: keep testing** ({nA} A / {nB} B; decide at {H['min_per_arm']} each). Rule: {H['decide']}")
    else:
        mA = med([r["skip"] for r in test if r["hook"] == "price"]); mB = med([r["skip"] for r in test if r["hook"] == "demo"])
        vA = med([r["views"] for r in test if r["hook"] == "price"]); vB = med([r["views"] for r in test if r["hook"] == "demo"])
        win = "B (demo)" if mB <= mA - 5 and vB >= vA else "A (price)"
        L.append(f"**Verdict: {win} wins** (skip A {mA} vs B {mB}, views A {vA} vs B {vB}). Make it the default in make.py and plan.py.")
    L.append("")

    L += ["## Topic test: " + T["question"], ""] + table(test, "topic", list(T["arms"])) + [""]
    counts = {k: sum(r["topic"] == k for r in test) for k in T["arms"]}
    if min(counts.values() or [0]) < T["min_per_arm"]:
        L.append(f"**Verdict: keep testing** ({counts}; decide at {T['min_per_arm']} each). Rule: {T['decide']}")
    else:
        best = max(T["arms"], key=lambda k: med([r["views"] for r in test if r["topic"] == k]) or 0)
        L.append(f"**Verdict: {best} leads.** {T['decide']}")
    L.append("")

    L += ["## Posting window (test period)", ""] + table(test, "window", [w["id"] for w in CFG["windows"]]) + [""]
    if a.all or not test:
        L += ["## Baseline (before the test, all hook A)", ""] + table(base, "topic", ["subscription", "utility", "hobby", "niche"]) + [""]
        L += table(base, "window", ["early", "midday", "afternoon", "evening", "night"]) + [""]
    top = sorted(rows, key=lambda r: -r["views"])[:5]
    L += ["## Top 5 overall", ""] + [f"- {r['reel']}: {r['views']} views, skip {r['skip']}%, {r['watch']}s watch, hook {r['hook']}, {r['topic']}" for r in top]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(L) + "\n")
    print("\n".join(L))


if __name__ == "__main__":
    main()
