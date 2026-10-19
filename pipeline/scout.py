"""Scout: find repo candidates for itsongit reels, vet them, rank them.

usage: python3 pipeline/scout.py [--limit 40]
writes data/candidates/<date>.json and .md; skips anything in data/posted.json.
Needs `gh` logged in (used for the GitHub API token). Python 3.9+, stdlib only.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import datetime as dt
import json
import math
import re
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
TODAY = dt.date.today()
UA = {"User-Agent": "itsongit-scout/0.1"}
TOKEN = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True).stdout.strip()

OSI_OK = {"MIT", "Apache-2.0", "GPL-2.0", "GPL-3.0", "AGPL-3.0", "LGPL-2.1", "LGPL-3.0", "BSD-2-Clause", "BSD-3-Clause",
          "MPL-2.0", "ISC", "Unlicense", "0BSD", "EPL-2.0", "Zlib", "Artistic-2.0", "CC0-1.0", "BSL-1.0", "EUPL-1.2"}
CONSUMER = re.compile(r"\b(alternative|app|desktop|self-?host|mac(os)?|windows|ios|android|iphone|browser extension|"
                      r"privacy|free|offline|local|editor|player|download|photo|video|music|notes?|pdf|clean|"
                      r"manager|tracker|budget|game|ai (image|video|voice)|voice|transcri|translat)\b", re.I)
DEV_ONLY = re.compile(r"\b(sdk|library|framework|bindings|compiler|kernel|runtime|orm|linter|boilerplate|"
                      r"template|dotfiles|awesome|interview|leetcode|course|tutorial|roadmap|cheatsheet|paper|list of|collection of|curated)\b", re.I)
ALT = re.compile(r"(?:alternative to|replacement for|instead of)\s+([A-Z][\w.+&' -]{1,40}?)(?=[,.;:)!]|\s+(?:and|with|that|for|but)\b|$)"
                 r"|([A-Z][\w.+&'-]{1,30}(?:\s[A-Z][\w.+&'-]{1,20})?)\s+alternative", re.M)


def get(url, headers=None, data=None):
    req = urllib.request.Request(url, headers={**UA, **(headers or {})}, data=data)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def gh(path, params=None):
    q = ("?" + urllib.parse.urlencode(params)) if params else ""
    return json.loads(get(f"https://api.github.com/{path}{q}", {"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json"}))


# ── sources: each returns {full_name: {"source": ..., "signal": ...}} ─────────────────────────────

def src_gittrend(pages=2):
    out = {}
    for p in range(1, pages + 1):
        for x in json.loads(get(f"https://gittrend.io/api/trending?limit=100&page={p}"))["data"]:
            out[x["fullName"]] = {"source": "gittrend", "starsToday": x.get("starsToday", 0)}
    return out


def src_github_trending():
    out = {}
    for since in ("daily", "weekly"):
        html = get(f"https://github.com/trending?since={since}", {"User-Agent": "Mozilla/5.0"})
        for row in html.split('<article class="Box-row">')[1:]:
            m = re.search(r'<h2[^>]*>\s*<a[^>]*href="/([^"/]+/[^"/]+)"', row)
            g = re.search(r"([\d,]+) stars (today|this week)", row)
            if m:
                out.setdefault(m.group(1), {"source": f"gh-trending-{since}", "trendingGain": int(g.group(1).replace(",", "")) if g else 0})
    return out


def src_github_search():
    out = {}
    since90 = (TODAY - dt.timedelta(days=90)).isoformat()
    since30 = (TODAY - dt.timedelta(days=30)).isoformat()
    queries = [
        f'"alternative" in:description created:>{since90} stars:>1500',
        f'"open-source alternative" in:description pushed:>{since30} stars:>3000',
        f"topic:self-hosted created:>{since90} stars:>800",
        f"topic:macos-app created:>{since90} stars:>500",
        f"created:>{since30} stars:>2000",
    ]
    for q in queries:
        for x in gh("search/repositories", {"q": q, "sort": "stars", "per_page": 40})["items"]:
            out.setdefault(x["full_name"], {"source": "gh-search"})
        time.sleep(2)  # search API: 30 req/min
    return out


def src_hackernews():
    out = {}
    since = int(time.time()) - 30 * 86400
    url = ("https://hn.algolia.com/api/v1/search?tags=show_hn&hitsPerPage=100&query=github.com&numericFilters="
           + urllib.parse.quote(f"points>80,created_at_i>{since}"))
    for h in json.loads(get(url))["hits"]:
        m = re.search(r"github\.com/([\w.-]+/[\w.-]+)", h.get("url") or "")
        if m:
            out.setdefault(m.group(1).removesuffix(".git"), {"source": "hn-show", "hnPoints": h["points"]})
    return out


# ── vetting ───────────────────────────────────────────────────────────────────────────────────

def vet(name, hint):
    r = gh(f"repos/{name}")
    created = dt.date.fromisoformat(r["created_at"][:10])
    pushed = dt.date.fromisoformat(r["pushed_at"][:10])
    age = max(1, (TODAY - created).days)
    stars, forks = r["stargazers_count"], r["forks_count"]
    spdx = (r.get("license") or {}).get("spdx_id")
    text = f"{r.get('description') or ''} {' '.join(r.get('topics') or [])}"
    contributors = len(gh(f"repos/{name}/contributors", {"per_page": 30, "anon": "false"}) or [])
    rel = gh(f"repos/{name}/releases", {"per_page": 3})
    downloads = sum(a.get("download_count", 0) for x in rel for a in x.get("assets", []))

    flags = []
    if spdx not in OSI_OK:
        flags.append(f"license:{spdx}")
    if r["archived"]:
        flags.append("archived")
    if (TODAY - pushed).days > 60:
        flags.append("stale")
    if stars / age > 1500 and contributors < 5:
        flags.append("star-velocity-suspicious")  # huge star rate with no community = likely farmed
    if stars > 2000 and forks / stars < 0.01:
        flags.append("low-fork-ratio")
    if re.search(r"[぀-ヿ一-鿿]", r.get("description") or ""):
        flags.append("non-english")

    alt = ALT.search(r.get("description") or "")
    alt_name = (alt.group(1) or alt.group(2)).strip() if alt else None
    if alt_name and re.search(r"open|source|free", alt_name, re.I):  # "Open-source alternative" is not a product
        alt_name = None
    consumer = len(set(m.group(0).lower() for m in CONSUMER.finditer(text)))
    dev = len(DEV_ONLY.findall(text))
    score = (math.log10(stars + 10) * 2
             + math.log10(hint.get("starsToday", 0) + hint.get("trendingGain", 0) + hint.get("hnPoints", 0) + 1) * 1.5
             + min(consumer, 4) * 1.2 - dev * 1.5
             + (3 if alt_name else 0) + (1.5 if downloads > 1000 else 0) + (1 if r.get("homepage") else 0)
             + (1 if contributors >= 10 else 0) - 4 * len(flags))
    return {
        "repo": name, "url": r["html_url"], "description": r.get("description"), "homepage": r.get("homepage"),
        "stars": stars, "forks": forks, "contributors": contributors, "releaseDownloads": downloads,
        "license": spdx, "created": str(created), "pushed": str(pushed), "topics": r.get("topics"),
        "alternativeTo": alt_name,
        "sources": hint["sources"], "flags": flags, "score": round(score, 2),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=40, help="how many vetted candidates to write")
    args = ap.parse_args()
    posted = set(json.loads((DATA / "posted.json").read_text())) if (DATA / "posted.json").exists() else set()

    pool = {}
    for fn in (src_gittrend, src_github_trending, src_github_search, src_hackernews):
        try:
            found = fn()
            print(f"{fn.__name__}: {len(found)}")
        except Exception as e:  # one dead source shouldn't stop the scout
            print(f"{fn.__name__}: FAILED {e}")
            continue
        for k, v in found.items():
            cur = pool.setdefault(k, {"sources": []})
            cur["sources"].append(v.pop("source"))
            for kk, vv in v.items():
                cur[kk] = max(cur.get(kk, 0), vv)

    def safe_vet(item):
        try:
            return vet(*item)
        except Exception as e:
            print(f"  skip {item[0]}: {e}")
            return None

    with ThreadPoolExecutor(8) as ex:
        rows = [x for x in ex.map(safe_vet, [(n, h) for n, h in pool.items() if n not in posted]) if x]
    rows.sort(key=lambda x: -x["score"])
    clean = [x for x in rows if not x["flags"]][: args.limit]

    out = DATA / "candidates"
    out.mkdir(parents=True, exist_ok=True)
    (out / f"{TODAY}.json").write_text(json.dumps({"date": str(TODAY), "candidates": clean, "rejected": [x for x in rows if x["flags"]]}, indent=1))
    lines = [f"# Candidates {TODAY}", "", "| # | Repo | ★ | Alt to | Contribs | DLs | Score | Sources |", "|---|---|---|---|---|---|---|---|"]
    for i, x in enumerate(clean, 1):
        lines.append(f"| {i} | [{x['repo']}]({x['url']}) — {(x['description'] or '')[:70]} | {x['stars']:,} | {x['alternativeTo'] or ''} | "
                     f"{x['contributors']}{'+' if x['contributors'] >= 30 else ''} | {x['releaseDownloads']:,} | {x['score']} | {', '.join(x['sources'])} |")
    (out / f"{TODAY}.md").write_text("\n".join(lines) + "\n")
    print(f"{len(pool)} found → {len(clean)} clean candidates, {len(rows) - len([x for x in rows if not x['flags']])} rejected → data/candidates/{TODAY}.md")


if __name__ == "__main__":
    main()
