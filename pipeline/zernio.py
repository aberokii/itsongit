"""Zernio client for @itsongit (Instagram only). Python 3.9+, stdlib only.

Commands:
  connect-url                 print the OAuth link that connects @itsongit (Business/Creator account) to Zernio
  setup                       find the profile + @itsongit account, save ids to data/zernio.json, check health
  health                      account health + Instagram publishing quota
  publish <video_dir> --slot N [--date YYYY-MM-DD | --now] [--time HH:MM]
  unschedule <video_dir>       delete a scheduled (unpublished) post + its automation, to fix and re-publish
                              upload reel + cover, schedule the Reel, attach the comment-to-DM automation
  status <video_dir>          post status (+ Instagram URL once live)
  logs <video_dir>            comment-to-DM automation stats, recent DMs and keyword misses
  analytics <video_dir>       reel metrics (views, reach, avg watch time, skip rate, saves, shares…)
  insights                    account insights (30 days) + follower history
  jitter [--days 7]           re-randomise DM/reply delays (15–20 s) on recent automations; launchd runs it every 2 min
  best-time                   Zernio's best posting slots for the account (converted to local time)

Reads ZERNIO_API_KEY from the environment or .env. Without a key every call is a dry run that prints the request.
Spec: data/zernio-docs/SPEC.md (distilled from docs.zernio.com).
"""
import argparse
import datetime as dt
import json
import os
import random
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CFG_PATH = ROOT / "data/zernio.json"
BASE = "https://zernio.com/api/v1"
USERNAME = "itsongit"

DEFAULT_CFG = {
    "username": USERNAME,
    "timezone": "Europe/Berlin",
    # daily slot → local time; slot N also picks accent N in brand.json
    "slots": ["08:00", "12:00", "15:30", "18:30", "21:30"],
    "profileId": None,
    "accountId": None,
}


# Public replies rotate per comment (Zernio picks at random); each post gets its own random 5 + 1 from this pool,
# so neighbouring posts don't share the same set either.
REPLY_POOL = [
    "Sent you a DM {{first_name}} 📩", "Check your DMs 👀", "Just sent it over 🚀", "Link's in your inbox ✌️",
    "DM'd you {{first_name}} 🙌", "On its way to your DMs 📬", "Check your message requests 👀", "Sent! Enjoy 🔥",
    "Dropped it in your DMs {{first_name}} ⚡", "Done ✅ check your inbox", "Sliding into your DMs with the link 😄",
    "You've got mail {{first_name}} 📨",
]
DM_OPENERS = ["Hey {{first_name}}! 👋", "Here you go {{first_name}} 🙌", "Yo {{first_name}}!", "Hey hey 👋", "As promised {{first_name}} ⚡"]
DM_CLOSERS = ["Follow @itsongit for a new free tool every day ⭐", "More free finds daily on @itsongit 🔥",
              "Drop a ⭐ on the repo if you like it!", "Follow @itsongit so you don't miss tomorrow's find 👀",
              "Enjoy, and follow @itsongit for more 🚀"]


GATE_MESSAGES = [
    "Hey {{first_name}}! 👋 The link is for followers only. Follow @itsongit, then tap the button below and it's yours 👇",
    "Almost there {{first_name}} ⚡ Follow @itsongit first, then hit the button and I'll send the link 👇",
    "Hey {{first_name}}! Quick one: follow @itsongit, then tap below to unlock the link 🔓",
]
GATE_RETRY = [
    "Looks like you're not following yet 👀 Follow @itsongit and tap the button again to get the link",
    "Hmm, I can't see the follow yet 🤔 Follow @itsongit, then tap again 👇",
]


def follow_gate(rng):
    return {
        "audience": {"followerStatus": "follower", "whenUnknown": "verify"},
        "followGate": {"message": rng.choice(GATE_MESSAGES), "buttonLabel": "I'm following ✅",
                       "notFollowingMessage": rng.choice(GATE_RETRY)},
    }


def human_delays(rng):
    """DM after 15–20 s, public reply a few seconds after the DM. Randomised every call."""
    dm = rng.randint(15, 20)
    return dm, dm + rng.randint(3, 12)


def dm_texts(post, rng):
    """Main DM + up to 5 variations, all carrying the same link (Instagram allows ~1000 chars without buttons, 640 with)."""
    pitch, url = post.get("dm_pitch", post.get("title", "")), post["repo_url"]
    install = f"\n\nInstall: {post['install']}" if post.get("install") else ""
    opens, closes = rng.sample(DM_OPENERS, 5), rng.sample(DM_CLOSERS, 5)
    texts = [f"{o} Here's {pitch}\n\n{url}{install}\n\n{c}" for o, c in zip(opens, closes)]
    return post.get("dm_message") or texts[0], texts[1:] if not post.get("dm_message") else texts[:5]


def env_key():
    if os.environ.get("ZERNIO_API_KEY"):
        return os.environ["ZERNIO_API_KEY"]
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("ZERNIO_API_KEY=") and line.split("=", 1)[1].strip():
                return line.split("=", 1)[1].strip()
    return None


KEY = env_key()
DRY = KEY is None


def load_cfg():
    cfg = dict(DEFAULT_CFG)
    if CFG_PATH.exists():
        cfg.update(json.loads(CFG_PATH.read_text()))
    return cfg


def save_cfg(cfg):
    CFG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CFG_PATH.write_text(json.dumps(cfg, indent=2))


def api(method, path, body=None, query=None, idem=None):
    url = BASE + path
    if query:
        url += "?" + urllib.parse.urlencode({k: v for k, v in query.items() if v is not None})
    if DRY:
        print(f"[dry-run] {method} {url}")
        if body is not None:
            print("          " + json.dumps(body, indent=2).replace("\n", "\n          "))
        return {}
    headers = {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    if idem:
        headers["Idempotency-Key"] = idem
    req = urllib.request.Request(url, method=method, headers=headers,
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = r.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        sys.exit(f"Zernio {method} {path} → HTTP {e.code}: {detail[:800]}")


import urllib.parse  # noqa: E402  (used by api())


def upload(path: Path):
    """Presign → PUT raw bytes (no auth header) → public URL usable in posts."""
    ctype = {".mp4": "video/mp4", ".mov": "video/quicktime", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}[path.suffix.lower()]
    pre = api("POST", "/media/presign", {"filename": path.name, "contentType": ctype, "size": path.stat().st_size})
    if DRY:
        print(f"[dry-run] PUT <uploadUrl>  ({path.name}, {path.stat().st_size / 1e6:.1f} MB, {ctype})")
        return f"https://media.zernio.com/temp/DRYRUN_{path.name}"
    req = urllib.request.Request(pre["uploadUrl"], method="PUT", data=path.read_bytes(), headers={"Content-Type": ctype})
    with urllib.request.urlopen(req, timeout=600):
        pass
    return pre["publicUrl"]


def need_ids(cfg):
    if DRY:
        return cfg.get("profileId") or "<profileId>", cfg.get("accountId") or "<accountId>"
    if not (cfg.get("profileId") and cfg.get("accountId")):
        sys.exit("Run `python3 pipeline/zernio.py setup` first (no profileId/accountId in data/zernio.json).")
    return cfg["profileId"], cfg["accountId"]


def load_post(video_dir: Path):
    p = video_dir / "post.json"
    if not p.exists():
        sys.exit(f"{p} missing. See PLAYBOOK §11 for the post.json format.")
    return p, json.loads(p.read_text())


# ── commands ──────────────────────────────────────────────────────────────────────────────────

def cmd_connect_url(a, cfg):
    profiles = api("GET", "/profiles").get("profiles", [])
    profile_id = cfg.get("profileId") or (profiles[0]["_id"] if profiles else None)
    if not profile_id and not DRY:
        prof = api("POST", "/profiles", {"name": "itsongit", "timezone": cfg["timezone"]}, idem=str(uuid.uuid4()))
        profile_id = prof["profile"]["_id"]
    r = api("GET", "/connect/instagram", query={"profileId": profile_id or "<profileId>", "expectedUsername": USERNAME, "forceReauth": "true"})
    print("Open this link and approve as @itsongit (keep all permissions):\n", r.get("authUrl", "<authUrl>"))


def cmd_setup(a, cfg):
    profiles = api("GET", "/profiles").get("profiles", [])
    accounts = api("GET", "/accounts", query={"platform": "instagram"}).get("accounts", [])
    ig = [x for x in accounts if x.get("username", "").lower() == USERNAME]
    if DRY:
        print("[dry-run] would save the profileId + @itsongit accountId to data/zernio.json")
        return
    if not ig:
        sys.exit(f"@{USERNAME} is not connected yet. Run `connect-url`, approve, then re-run setup. "
                 f"Connected IG accounts: {[x.get('username') for x in accounts]}")
    acc = ig[0]
    cfg.update({"accountId": acc["_id"], "profileId": acc["profileId"] if isinstance(acc["profileId"], str) else acc["profileId"]["_id"]})
    prof = next((p for p in profiles if p["_id"] == cfg["profileId"]), None)
    if prof and prof.get("timezone") != cfg["timezone"]:
        api("PUT", f"/profiles/{cfg['profileId']}", {"timezone": cfg["timezone"]})
    save_cfg(cfg)
    print(f"saved → {CFG_PATH}: profile {cfg['profileId']}, @{acc['username']} account {cfg['accountId']}, "
          f"followers {acc.get('followersCount')}")
    cmd_health(a, cfg)


def cmd_health(a, cfg):
    _, acc = need_ids(cfg)
    h = api("GET", f"/accounts/{acc}/health")
    q = api("GET", f"/accounts/{acc}/instagram/publishing-limit")
    if not DRY:
        perms = h.get("permissions", {})
        print(f"status {h.get('status')} | token valid {h.get('tokenStatus', {}).get('valid')} | canPost {perms.get('canPost')} "
              f"| missing {perms.get('missingRequired')} | issues {h.get('issues')}")
        print(f"IG publishing quota: {q.get('quotaUsage')}/{q.get('quotaTotal')} per {q.get('quotaDurationSeconds', 0) // 3600}h")


def cmd_publish(a, cfg):
    vdir = Path(a.video_dir).resolve()
    ppath, post = load_post(vdir)
    if post.get("zernio", {}).get("postId") and not a.force:
        sys.exit(f"already scheduled as {post['zernio']['postId']} (use --force to post again)")
    profile, acc = need_ids(cfg)

    video, cover = vdir / post["video"], vdir / post["thumbnail"]
    for f in (video, cover):
        if not f.exists():
            sys.exit(f"missing {f}")
    if not DRY:
        q = api("GET", f"/accounts/{acc}/instagram/publishing-limit")
        if q.get("quotaUsage", 0) >= q.get("quotaTotal", 100):
            sys.exit(f"Instagram publishing quota exhausted: {q}")

    video_url, cover_url = upload(video), upload(cover)
    body = {
        "content": post["caption"],
        "mediaItems": [{"type": "video", "url": video_url}],
        "platforms": [{
            "platform": "instagram", "accountId": acc,
            "platformSpecificData": {"shareToFeed": True, "instagramThumbnail": cover_url, "commentsEnabled": True},
        }],
        "metadata": {"reel": vdir.name, "repo": post["repo_url"], "keyword": post["keyword"], "slot": a.slot},
    }
    if a.now:
        body["publishNow"] = True
    else:
        day = a.date or (dt.date.today() + dt.timedelta(days=1)).isoformat()
        body["scheduledFor"] = f"{day}T{a.time or cfg['slots'][a.slot]}:00"
        body["timezone"] = cfg["timezone"]
    idem = post.get("idempotencyKey") or str(uuid.uuid4())
    r = api("POST", "/posts", body, idem=idem)
    post_id = r.get("post", {}).get("_id", "<postId>")
    for w in r.get("warnings", []) or []:
        print("warning:", w)

    kw = post["keyword"]
    rng = random.Random()
    replies = rng.sample(REPLY_POOL, 6)
    dm_main, dm_vars = dm_texts(post, rng)
    dm_delay, reply_delay = human_delays(rng)
    live_id = next((p.get("platformPostId") for p in r.get("post", {}).get("platforms", []) if p.get("platformPostId")), None)
    auto = {
        "profileId": profile, "accountId": acc, "name": f"{vdir.name} {kw} -> repo",
        "trigger": "comment", "postTitle": post.get("title", vdir.name),
        # bind by Instagram media id if it is already live (--now), else by Zernio post id (arms on publish)
        **({"platformPostId": live_id} if live_id else {"postId": post_id}),
        # dm_on_any_comment: no keywords = every comment (even an emoji) gets the DM, once per person
        "keywords": [] if post.get("dm_on_any_comment") else sorted({kw, kw.lower(), kw.upper(), kw.capitalize()}),
        "matchMode": "word",
        "dmMessage": dm_main, "dmMessageVariations": dm_vars,
        "dmDelaySeconds": dm_delay, "commentReplyDelaySeconds": reply_delay,
        "buttons": [{"type": "url", "title": post.get("dm_button", "Open on GitHub")[:20], "url": post["repo_url"]}] if post.get("dm_buttons", True) else [],
        "commentReply": replies[0], "commentReplyVariations": replies[1:],
        "publicReplyPolicy": "after_dm", "repeatPolicy": {"mode": "once"}, "isActive": True,
        # follow gate (default on): the link only goes to followers; unknown commenters get the gate DM first
        **(follow_gate(rng) if post.get("follow_gate", True) else {}),
    }
    ar = api("POST", "/comment-automations", auto, idem=idem + "-auto")

    if not DRY:
        post["idempotencyKey"] = idem
        post["zernio"] = {"postId": post_id, "status": r["post"].get("status"), "scheduledFor": r["post"].get("scheduledFor"),
                          "url": next((p.get("platformPostUrl") for p in r["post"].get("platforms", []) if p.get("platformPostUrl")), None),
                          "automationId": ar.get("automation", {}).get("id"), "slot": a.slot}
        ppath.write_text(json.dumps(post, indent=2))
        print(f"{r['post'].get('status')} {vdir.name}: post {post_id} {post['zernio']['url'] or 'at ' + str(post['zernio']['scheduledFor']) + ' UTC'}, "
              f"automation {post['zernio']['automationId']} ({'any comment' if post.get('dm_on_any_comment') else 'keyword ' + kw})")
        # register for the launchd jitter job (~/.itsongit/jitter.py), which re-rolls delays every 2 min
        jit = Path.home() / ".itsongit/automations.json"
        if post["zernio"]["automationId"] and jit.parent.exists():
            reg = json.loads(jit.read_text()) if jit.exists() else []
            reg.append({"id": post["zernio"]["automationId"], "reel": vdir.name,
                        "date": (post["zernio"]["scheduledFor"] or dt.date.today().isoformat())[:10]})
            jit.write_text(json.dumps(reg, indent=1))
        ledger = ROOT / "data/posted.json"
        posted = json.loads(ledger.read_text()) if ledger.exists() else []
        repo = post["repo_url"].split("github.com/")[-1].strip("/")
        if repo not in posted:
            ledger.write_text(json.dumps(posted + [repo], indent=1))


def cmd_unschedule(a, cfg):
    """Delete a scheduled (not yet published) post and its DM automation so the reel can be fixed and re-published."""
    vdir = Path(a.video_dir)
    ppath, post = load_post(vdir)
    z = post.get("zernio", {})
    if not z.get("postId"):
        sys.exit("not scheduled")
    if z.get("status") == "published" or z.get("publishedAt"):
        sys.exit("already published: Instagram posts can't be deleted through the API")
    api("DELETE", f"/posts/{z['postId']}")
    if z.get("automationId"):
        api("DELETE", f"/comment-automations/{z['automationId']}")
        jit = Path.home() / ".itsongit/automations.json"
        if jit.exists():
            jit.write_text(json.dumps([x for x in json.loads(jit.read_text()) if x.get("id") != z["automationId"]], indent=1))
    if not DRY:
        post.pop("zernio", None)
        post.pop("idempotencyKey", None)  # a reused key with a different body is rejected (422)
        ppath.write_text(json.dumps(post, indent=2))
    print(f"unscheduled {vdir.name}: deleted post {z['postId']} and automation {z.get('automationId')}")


def cmd_jitter(a, cfg):
    """Re-roll dmDelaySeconds / commentReplyDelaySeconds on automations of recent reels, so consecutive commenters
    wait different amounts. Run every ~2 min by launchd (scripts/com.itsongit.jitter.plist)."""
    rng = random.Random()
    ids = []
    for pj in sorted((ROOT / "videos").glob("*/post.json")):
        z = json.loads(pj.read_text()).get("zernio", {})
        when = z.get("publishedAt") or z.get("scheduledFor") or ""
        if z.get("automationId") and when[:10] >= (dt.date.today() - dt.timedelta(days=a.days)).isoformat():
            ids.append(z["automationId"])
    for aid in ids:
        dm, reply = human_delays(rng)
        api("PATCH", f"/comment-automations/{aid}", {"dmDelaySeconds": dm, "commentReplyDelaySeconds": reply})
        print(f"{dt.datetime.now():%H:%M:%S} {aid}: DM {dm}s, reply {reply}s")


def cmd_status(a, cfg):
    _, post = load_post(Path(a.video_dir))
    pid = post.get("zernio", {}).get("postId", "<postId>")
    r = api("GET", f"/posts/{pid}").get("post", {})
    for p in r.get("platforms", []):
        print(f"{r.get('status')} | {p.get('status')} | {p.get('platformPostUrl') or ''} | {p.get('errorMessage') or ''}")


def cmd_logs(a, cfg):
    _, post = load_post(Path(a.video_dir))
    aid = post.get("zernio", {}).get("automationId", "<automationId>")
    r = api("GET", f"/comment-automations/{aid}/logs", query={"limit": 20})
    det = api("GET", f"/comment-automations/{aid}")
    if DRY:
        return
    s = det.get("automation", {}).get("stats", {})
    print(f"triggered {s.get('triggered')} | DMs sent {s.get('dmsSent')} failed {s.get('dmsFailed')} | link clicks {s.get('linkClicks')} "
          f"(unique {s.get('uniqueClicks')})")
    for l in r.get("logs", []):
        print(f"  {l.get('createdAt', '')[:16]} @{l.get('commenterUsername')}: {l.get('commentText')!r} → {l.get('status')} {l.get('error') or ''}")
    m = r.get("misses", {})
    if m.get("total"):
        print(f"  {m['total']} comments matched no keyword, e.g. {[x.get('commentText') for x in m.get('samples', [])[:5]]}")


def cmd_analytics(a, cfg):
    _, post = load_post(Path(a.video_dir))
    pid = post.get("zernio", {}).get("postId", "<postId>")
    r = api("GET", "/analytics", query={"postId": pid, "platform": "instagram"})
    if not DRY and r.get("syncStatus") == "pending":
        print(f"  (Zernio is still syncing this post from Instagram: {r.get('message') or 'try again in a few minutes'})")
    for p in r.get("platformAnalytics", []) if not DRY else []:
        m = p.get("analytics") or r.get("analytics") or {}  # per-platform block is null until the first sync
        print(f"views {m.get('views')} | reach {m.get('reach')} | likes {m.get('likes')} | comments {m.get('comments')} | shares {m.get('shares')} "
              f"| saves {m.get('saves')} | avg watch {round((m.get('igReelsAvgWatchTime') or 0) / 1000, 1)}s | skip {m.get('reelsSkipRate')}% "
              f"| ER {m.get('engagementRate')}%")


def cmd_insights(a, cfg):
    _, acc = need_ids(cfg)
    r = api("GET", "/analytics/instagram/account-insights",
            query={"accountId": acc, "metrics": "reach,views,accounts_engaged,total_interactions,follows_and_unfollows,profile_links_taps"})
    f = api("GET", "/analytics/instagram/follower-history", query={"accountId": acc, "metricType": "time_series", "metrics": "follower_count,followers_gained,followers_lost"})
    if not DRY:
        for k, v in r.get("metrics", {}).items():
            print(f"{k}: {v.get('total')}")
        for k, v in f.get("metrics", {}).items():
            print(f"{k}: {v.get('total')}")


def cmd_best_time(a, cfg):
    _, acc = need_ids(cfg)
    r = api("GET", "/analytics/best-time", query={"platform": "instagram", "accountId": acc})
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]  # 0 = Monday here; hours are UTC
    for s in sorted(r.get("slots", []), key=lambda s: -s.get("avg_engagement", 0))[:10] if not DRY else []:
        print(f"{days[s['day_of_week']]} {s['hour']:02d}:00 UTC  engagement {s['avg_engagement']:.2f} over {s['post_count']} posts")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("connect-url", "setup", "health", "insights", "best-time"):
        sub.add_parser(name)
    p = sub.add_parser("publish")
    p.add_argument("video_dir")
    p.add_argument("--slot", type=int, required=True, choices=range(5))
    p.add_argument("--date", help="YYYY-MM-DD (default: tomorrow)")
    p.add_argument("--now", action="store_true", help="publish immediately instead of scheduling")
    p.add_argument("--time", help="HH:MM Berlin time, overrides the slot's default time (the slot still picks the accent)")
    p.add_argument("--force", action="store_true")
    j = sub.add_parser("jitter")
    j.add_argument("--days", type=int, default=7, help="only automations of reels from the last N days")
    for name in ("status", "logs", "analytics", "unschedule"):
        sub.add_parser(name).add_argument("video_dir")
    a = ap.parse_args()
    if DRY:
        print("ZERNIO_API_KEY not set: dry run, nothing is sent.\n")
    cfg = load_cfg()
    {"connect-url": cmd_connect_url, "setup": cmd_setup, "health": cmd_health, "publish": cmd_publish, "status": cmd_status,
     "logs": cmd_logs, "unschedule": cmd_unschedule, "jitter": cmd_jitter, "analytics": cmd_analytics, "insights": cmd_insights, "best-time": cmd_best_time}[a.cmd](a, cfg)


if __name__ == "__main__":
    main()
