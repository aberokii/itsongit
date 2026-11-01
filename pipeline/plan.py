"""Daily posting plan for the @itsongit A/B tests (data/experiments.json). Python 3.9+, stdlib only.

usage:
  python3 pipeline/plan.py 2026-11-01                     show the 3 rows for that day: window, time, slot, hook arm, topic arm
  python3 pipeline/plan.py 2026-11-01 videos/A videos/B videos/C
                                                         stamp each video.json with its row (matched by "topic_arm",
                                                         which you set when picking: one repo per topic arm per day)
  python3 pipeline/plan.py 2026-11-01 --days 6           a multi-day view (to check the balance)

Since 2026-11-02 each row also has a format (classic | story). Write the spec in that format and set "format" in
video.json ("story" only; classic is the default) before stamping. Over any 12 days format, topic, window and (inside
classic) hook arm are all balanced.

Balance (hook/topic): the hook arm alternates by window and flips every day, the topic arm rotates through the windows every day.
Over any 6 days each window gets each hook arm 3x and each topic arm 2x, and hook x topic is balanced too, so
time of day can't masquerade as a hook or topic effect. Times are random inside the window (seeded by the date, so
the plan is stable), never on :00/:15/:30/:45, at least 80 min apart.
"""
import argparse
import datetime as dt
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CFG = json.loads((ROOT / "data/experiments.json").read_text())


def mins(hhmm):
    h, m = map(int, hhmm.split(":"))
    return h * 60 + m


def plan(day: dt.date):
    n = (day - dt.date.fromisoformat(CFG["started"])).days
    fx = CFG["experiments"].get("format")
    n2 = (day - dt.date.fromisoformat(fx["started"])).days if fx else -1
    hooks = list(CFG["experiments"]["hook"]["arms"])        # ["price", "demo"]
    topics = list(CFG["experiments"]["topic"]["arms"])      # ["subscription", "utility", "hobby"]
    wins = CFG["windows"]
    rng = random.Random(day.isoformat())
    while True:
        t = [rng.randint(mins(w["from"]), mins(w["to"])) for w in wins]
        if all(x % 15 for x in t) and all(b - a >= CFG["min_gap_minutes"] for a, b in zip(t, t[1:])):
            break
    rows = []
    # classic rows before today since the format test began (day d has 2 classic rows when d is even, else 1)
    k = sum(2 if d % 2 == 0 else 1 for d in range(max(0, n2)))
    for i, w in enumerate(wins):
        row = {"date": day.isoformat(), "window": w["id"], "time": f"{t[i] // 60:02d}:{t[i] % 60:02d}", "slot": w["slot"],
               "format": "classic", "hook_style": hooks[(i + n) % 2], "topic_arm": topics[(i + n) % 3]}
        if n2 >= 0:  # format test: classic/story alternate by window and flip daily; the hook test runs inside classic
            row["format"] = list(fx["arms"])[(i + n2) % 2]
            if row["format"] == "story":
                row["hook_style"] = "story"
            else:
                row["hook_style"] = hooks[k % 2]
                k += 1
        rows.append(row)
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("date")
    ap.add_argument("videos", nargs="*")
    ap.add_argument("--days", type=int, default=1)
    a = ap.parse_args()
    day = dt.date.fromisoformat(a.date)
    rows = [r for k in range(a.days) for r in plan(day + dt.timedelta(days=k))]
    for r in rows:
        print(f"{r['date']}  {r['window']:8} {r['time']}  slot {r['slot']}  format {r['format']:7}  hook {r['hook_style']:5}  topic {r['topic_arm']}")
    if not a.videos:
        return
    if a.days != 1 or len(a.videos) != len(rows):
        sys.exit(f"give exactly {len(rows)} video folders for one day")
    todo = {r["topic_arm"]: r for r in rows}
    for v in a.videos:
        p = Path(v) / "video.json"
        V = json.loads(p.read_text())
        r = todo.pop(V.get("topic_arm"), None)
        if not r:
            sys.exit(f"{v}: topic_arm {V.get('topic_arm')!r} has no free row today (need one each of {list(CFG['experiments']['topic']['arms'])})")
        if (V.get("format") or "classic") != r["format"]:
            sys.exit(f"{v}: the plan gives this {r['topic_arm']} row format {r['format']!r}; write the spec in that format "
                     f"({'beats, SKILL §3b' if r['format'] == 'story' else 'hook/features, SKILL §3'}) and set \"format\"")
        V.update({"hook_style": r["hook_style"], "window": r["window"], "slot": r["slot"], "publish": {"date": r["date"], "time": r["time"]}})
        p.write_text(json.dumps(V, indent=2, ensure_ascii=False) + "\n")
        print(f"stamped {v}: {r['window']} {r['time']} slot {r['slot']} format {r['format']} hook {r['hook_style']}")
    print("\nbuild:   " + " && ".join(f"pipeline/.venv/bin/python pipeline/make.py {v}" for v in a.videos))
    print("publish: " + " && ".join(f"python3 pipeline/zernio.py publish {v}" for v in a.videos) + "   (date/time/slot come from video.json)")


if __name__ == "__main__":
    main()
