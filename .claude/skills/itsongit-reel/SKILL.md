---
name: itsongit-reel
description: End-to-end @itsongit Instagram reel factory. Finds trending open-source GitHub repos, picks the best consumer-friendly ones, writes the script, builds the voiceover, phone screen recordings, HyperFrames hook, Remotion reel and thumbnail, then schedules each Reel on Instagram via Zernio with a follow-gated comment-to-DM automation. Use when asked to "make videos", "make reels", "post today's reels", "run itsongit", or to create and post N videos.
---

# itsongit reel factory

One run = **find repos → write a `video.json` per repo → `make.py` builds every asset → QA → schedule on Instagram with
the DM automation → update the ledger.** The project lives at the repo root (`itsongit/`). Read `BRAND.md` (locked
style) once. `PLAYBOOK.md` has the background. This skill is the operating manual.

Arguments: the number of reels (default **3**, one per daily window) and the start date (default **tomorrow**). Example:
`/itsongit-reel 6 2026-11-02` means 3 reels for the 2nd and 3 for the 3rd.

**Since 2026-11-02 the daily plan also assigns a FORMAT: "classic" (the price-card / demo template below) or "story"
(the animated explainer with Kit, §3b).** **Since 2026-11-01 every reel is part of an A/B test** (`data/experiments.json`): 3 stronger reels a day instead of
5 average ones, one per topic arm, each with an assigned hook style and posting window. `pipeline/plan.py` decides the
arms; you pick the best repo for each arm. Never override an assignment by taste: that breaks the test.

## 0. Preflight (fail fast)

```bash
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
python3 pipeline/zernio.py health          # must show: status healthy, canPost True, quota headroom
python3 pipeline/ledger.py                 # syncs data/posted.json + POSTED_REPOS.md from videos/*/post.json (+ Zernio)
```
- No `ZERNIO_API_KEY`: stop and say so. It goes in `.env` locally, or in the environment secrets in the cloud.
- Tooling: node ≥ 22, ffmpeg, `pipeline/.venv` (uv), `studio/` and `capture/` node_modules, and the Playwright
  chromium-headless-shell. If anything is missing, run `scripts/bootstrap.sh`.

## 1. Get the day's plan, then find candidates

```bash
python3 pipeline/plan.py YYYY-MM-DD        # 3 rows: window · time · slot · hook arm (price|demo) · topic arm
```
Each day needs exactly one **subscription**, one **utility** and one **hobby** pick (definitions in
`data/experiments.json`). Start from `data/backlog.json` (pre-vetted, ranked by mass appeal; re-check stars/push date
before using one, and remove it from the backlog once posted), then top up from the scout:

```bash
pipeline/.venv/bin/python pipeline/scout.py --limit 40     # → data/candidates/<date>.md/.json (≈1 min)
```
- Sources: gittrend.io API, GitHub Trending (daily and weekly), GitHub Search (alternatives, self-hosted, macOS apps,
  new repos with 2k+ stars), and Show HN.
- The scout rejects non-OSI licenses, archived or stale repos, non-English descriptions and fake-star patterns, and
  skips anything already in `data/posted.json`.

## 2. Pick one repo per topic arm (judgement; this matters most)

**The mass-appeal test comes first:** would a random 25-year-old scrolling Instagram recognise the paid app and
care? Baseline numbers (60 reels): utility picks median 85 views, subscription 34, hobby 41. Developer, academic and
pro-only tools are **banned** (Postman, Cursor, Parallels, Overleaf, EndNote, Figma, Fusion, Polycam-type picks):
they never broke out. The scout's "Arm (famous paid app)" column flags repos that name an app people know.

At 5 a day we can't always get a perfect repo, but every pick must give the viewer real value. **The value test:**
finish the sentence *"After watching, the viewer can ___"* with something concrete. If you can't, skip the repo.
A pick needs at least one of these, in this order of preference:
- **Saves money:** it replaces a paid tool the viewer might pay for today (the strongest hook: price → $0).
- **Saves time:** it does in seconds what normally takes many steps or minutes (converting, cleaning, dubbing, editing).
- **Makes work easier:** it removes a daily annoyance (blurry monitor, messy files, switching between apps).
- **Is everywhere right now:** a hugely popular repo (≈50k+ stars and still climbing) the viewer will hear about anyway;
  "the thing everyone's talking about" is its own value. It still has to pass checks 1 and 3.

Rank candidates by **value to a normal viewer first, stars second.** A 3k-star app that saves $100 a year beats a
200k-star developer framework. When a day is short of strong picks, prefer a well-known "saves money" repo over a
trendy but niche one, and never fill a slot with a repo that fails the value test.

For each pick, check the repo page and README:
1. **A normal person can use it today:** a desktop or mobile app, a Homebrew cask, a web app, or a one-line install.
   Skip libraries, SDKs, lists, frameworks and developer-only CLIs.
2. **The hook needs a paid tool it replaces,** with a real price (monthly, yearly or one-time). Verify the price on
   the vendor's official pricing page and record the URL in `paid.source`. Use the cheapest paid tier that does the
   same job. (The current hook template is price-based, so a "saves time" or "everywhere right now" pick still needs
   an honest paid comparison. If there is none, skip it.)
3. **It's real:**
   - Contributors ≥ 5.
   - Releases have downloads, or there's a working site.
   - The README matches the product.
   - **No star-farming signs:** one owner with several 30k+ star repos that are only weeks old, very few
     contributors, or a description that reads like a growth hack. Be strict.
4. **It has visuals:** at least 2 README screenshots or GIFs (or a site with product shots) usable as feature cards.
5. **Variety:** no two picks in the same category on one day (AI voice, video editing, Mac utility, productivity,
   AI coding, design, privacy…). Never pick something too close to an already-posted repo (see `POSTED_REPOS.md`).
6. **Order the day:** the plan assigns windows by topic arm (balanced for the test); don't reorder.

## 3. Write `videos/NNN-<slug>/video.json` for each pick

**Delegate the research: one sub-agent per pick, all launched in parallel in one message, with `model: "sonnet"`**
(Agent tool, `subagent_type: "general-purpose"`). It's fact-checking against a fixed format, and Sonnet does it at
about half the cost. Keep the QA (§5) and final judgement on the main model. Give each agent:
- the repo, the target `videos/NNN-slug/video.json` path, its slot, keyword and the paid tool to price-check;
- an instruction to read this file's §2 and §3 plus `videos/001-puremac/post.json` (the approved reference reel) first;
- the checks: `gh api` for repo, contributors and releases; the README for every claim; the official pricing page;
  curl every image and look at it; every chip anchor is a word in its `say`; 95–115 words; `python3 -m json.tool`;
- "write ONLY that video.json; don't run make.py, publish or edit other files; report the word count, the price and
  source, and anything doubtful."
Read each report's doubts before building, and fix the spec yourself where needed.

**Experiment fields (required):** add `"topic_arm": "subscription" | "utility" | "hobby"` to every `video.json`. After all
three are written, stamp them with the plan (sets `hook_style`, `window`, `slot` and the `publish` date/time):
```bash
python3 pipeline/plan.py YYYY-MM-DD videos/NNN-a videos/NNN-b videos/NNN-c
```
**Hook B (`hook_style: "demo"`) needs a demo:** the first second must show the app *doing* something. Add
`"demo": {"url": "<mp4|webm|gif from the README/site>", "start": <s>}` when the repo has a demo clip or GIF (best), or
`"demo": {"images": [url, url]}` with two screenshots of the app mid-task (not a logo, not a settings page). With no
`demo`, make.py uses the first screenshot of features 1 and 2. The job line is the headline on frame 0, so it must
read on its own. Give the research agents this field for every pick: we can't know in advance which arm it lands on.

Number `NNN` continues from the highest existing `videos/` number. The slug is the short product name in lower
case. Write this exact schema:

```json
{
  "repo": "momenbasel/PureMac",
  "name": "PureMac",
  "title": "PureMac: free CleanMyMac alternative",
  "slot": 0,
  "keyword": "MAC",
  "paid": {"name": "CleanMyMac", "price": "$40", "per": "/year", "anchor": "forty",
           "source": "https://macpaw.com/cleanmymac/pricing"},
  "icon": "https://raw.githubusercontent.com/momenbasel/PureMac/main/PureMac/Assets.xcassets/AppIcon.appiconset/icon_512@2x.png",
  "hook": "CleanMyMac charges you forty bucks a year to clean up your Mac. This app does it for free.",
  "job": "Cleans the junk off your Mac",
  "platforms": ["Mac"],
  "features": [
    {"intro": "It finds the junk eating up your storage.",
     "say": "System caches, old logs, even Xcode and Docker leftovers.",
     "images": ["https://raw.githubusercontent.com/momenbasel/PureMac/main/screenshots/system-junk.png",
                "https://raw.githubusercontent.com/momenbasel/PureMac/main/screenshots/xcode-junk.png"],
     "swap_anchor": "xcode",
     "chips": [{"label": "🗂 System caches", "anchor": "caches"}, {"label": "📜 Old logs", "anchor": "logs"},
               {"label": "Xcode", "anchor": "xcode"}, {"label": "Docker", "anchor": "docker"}]},
    {"say": "Delete an app, and it hunts down every file that app left behind.",
     "images": ["https://raw.githubusercontent.com/momenbasel/PureMac/main/screenshots/app-uninstaller.png"],
     "chips": [{"label": "✓ every leftover file", "anchor": "every"}]},
    {"say": "It even finds duplicate files and similar photos.",
     "images": ["https://raw.githubusercontent.com/momenbasel/PureMac/main/screenshots/duplicate-finder.png",
                "https://raw.githubusercontent.com/momenbasel/PureMac/main/screenshots/similar-photos.png"],
     "swap_anchor": "similar", "chips": []}
  ],
  "nolist": [{"say": "No subscription.", "label": "Subscription"}, {"say": "No tracking.", "label": "Tracking"},
             {"say": "No fake pop-ups.", "label": "Fake pop-ups"}],
  "install": "brew install --cask puremac",
  "install_url": "https://www.moamenbasel.com/PureMac/",
  "caption": "CleanMyMac charges $40/year. PureMac does the same job for free 🧹\n\n✅ ...\n✅ ...\n✅ ...\n✅ No subscription, no tracking, 100% free\n\nComment \"MAC\" and I'll DM you the link 🔗\n\nFollow @itsongit for a new free open-source find every day\n\n#opensource #github #macos ...",
  "dm_pitch": "PureMac, the free open-source CleanMyMac alternative 🧹",
  "thumb": {"big": "FREE", "line1": "CleanMyMac", "line2": "alternative"}
}
```

### 3b. Story format (`"format": "story"`): the animated explainer with Kit the cat

When the plan says `format: story`, write `"beats"` instead of `hook`/`features`/`nolist`/`install_line` (keep every
other field: repo, name, title, keyword, paid, icon, job, platforms, install, caption, dm_pitch, thumb, topic_arm).
This is the format that faceless AI/tech accounts grow with (stories, curiosity, constant motion, a character), not an
ad template. make.py turns each beat into one spoken line + one animated scene, cut on the beat's first word, with Kit
(the cat from our logo) reacting in the corner and lip-syncing to the voice.

Full example: `.claude/skills/itsongit-reel/story-example.json` (Mixxx).

**Shape: 6–9 beats, 65–95 words, 22–35 s.**
1. **Beat 1 = the hook** (`slam`, mood `shock` or `smug`). Its `text` is on screen at frame 0, so it carries the stakes
   in 1–4 huge words, ideally a number ("$144 a year", "Stop paying", "It's free?!"). Use one pattern below.
2. **Beat 2 = Kit reacts** (`character`, a speech bubble ≤ 6 words): the emotional beat and the first re-hook.
3. **One `versus` beat in the first ~10 s** (paid name + price vs the app at $0; make.py fills these in).
4. **1–2 `app` beats** with a real screenshot of the app mid-task (`image`, URL or `assets/x.png`; chip `text` ≤ 4 words).
5. **Re-hook every 2–3 beats**: "But here's the crazy part.", "And it gets better.", "Wait, it's free?" (a `character`
   or `slam` beat). One metaphor line that makes it click ("It's Serato, minus the subscription, forever.").
6. **Last beat = `cta`**, saying exactly "Comment <Keyword>, and I'll send you the link."

**Hook patterns** (rotate them; never the same pattern twice in a day):
| Pattern | Example |
|---|---|
| Money leak | "You're paying a hundred and forty four dollars a year for something that's free." |
| Callout | "If you still pay for Serato, stop scrolling." |
| Hidden gem | "There's a free app that makes Grammarly pointless, and nobody talks about it." |
| Contrast | "Serato: twelve bucks a month. This: zero." |
| Disbelief | "I genuinely can't believe this is free." |
| Mistake | "Stop paying for Paste. Seriously." |
| Strangers built it | "Six thousand strangers on the internet rebuilt Serato. For free." |
| Question | "Why is anyone still paying for CleanMyMac?" |
| Price hike | "Adobe raised prices again. Here's the way out." |
| Challenge | "Name one thing Lightroom does that this can't." |

**Banned openers:** "Hey guys", "In this video", "Did you know", "Today I'll show you", "Have you ever", "So,",
"Introducing", "Meet". **Banned words:** seamless, revolutionary, game-changer, leverage, robust, powerful, unlock,
elevate, cutting-edge. Sound like a friend texting you a find, not a press release. Facts still only from the README.

**Scene fields** (all beats: `say`, `scene`, optional `mood` = neutral | shock | smug | excited | worried | point):
- every beat: `accent` = one word of its `say` shown in tomato italic serif in the spoken line (use it on 1 word per
  beat at most: the money word, the surprise word); `select` = one word of its `say` boxed in a blue selection box
  (use on ~every other beat, never the same word as `accent`). The spoken line itself sits at the top-left, word-timed.
- `slam`: `text` (1–5 words; prices like "$144" render in tomato italic serif automatically), `accent` (a word of
  `text` to colour), `sub` (small line)
- `character`: `text` = Kit's speech bubble (≤ 6 words, emoji ok); Kit fills the frame
- `versus`: nothing required (paid, price, name come from the spec); override with `paid`/`price`/`name`
- `app`: `image`, `text` (chip)
- `list`: `text` (title), `items`: up to 3 `{"label", "anchor"}`, each anchor a word in that beat's `say`
- `counter`: `from`, `to`, `prefix` ("$"), `suffix` (" ★", "/yr"), `label`, `tone`, `sub`
- `cta`: nothing else

Look (paper theme, BRAND.md): warm off-white, charcoal type, tomato for money, Kit big in the bottom-right.
QA for story reels: frame 0 shows the hook line and the hook text big (not an empty frame); every beat's scene matches its line; Kit is
never covering text; the price strip/numbers are correct; 22–35 s.

### 3c. Paint look (`"format": "paint"`): experiment, 2026-11-10

Same `beats` schema and rules as §3b, rendered by `studio/src/Paint.tsx`: watercolour paper, brush-edged cards, a
paint-stroke wipe on every cut, brush lettering (Caveat Brush / Caveat), and **no Kit**. A `character` beat becomes a
big painted splash with its `text` (≤ 6 words); the app icon sits in a painted frame in the bottom-right instead of
the cat. Tall (phone) screenshots get a tall frame automatically. `post.json` is tagged `experiment.format = "paint"`
(outside the classic-vs-story test). Rendering in a Claude cloud container needs
`REMOTION_BROWSER=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome` (Remotion's own headless shell doesn't trust
the container's proxy certificate, so Google Fonts fail to load); GitHub Actions needs nothing extra.

### Script rules (the voiceover is assembled from these fields)
The final script is: `hook` + "It's called {name}." + the fixed GitHub line + the features (intro + say) + the no-list
+ the install line (built from `install` + `platforms`, see below) + "Comment {Keyword}, and I'll send you the link."
- **About 95–115 words in total. The reel must end up 32–45 s** (make.py stops above 88 s).
- **STANDING RULE: the viewer knows what the app does within the first 5 seconds.** "Does the same job" is banned.
  - **hook:** `"<Paid> charges you <price in words> to <the job, in plain words>. This app does it for free."`
    e.g. "…forty bucks a year to clean up your Mac.", "…six dollars a month to clone your voice.",
    "…twenty bucks a month to edit your videos." The job is what a normal person would say, not a feature list.
    Write the price in words ("forty bucks a year", "twenty two dollars a month"). `paid.anchor` = the first price
    word ("forty", "twenty"). It must contain "This" and end with "free.". Keep it ≤ 22 words.
  - **job:** the on-screen line shown from frame 0 under the price, then under "$0 FREE": 3–6 words, ≤ 30
    characters, verb first, no emoji ("Cleans the junk off your Mac", "Clones any voice, offline", "Converts any file
    with a drag").
  If the comparable tier isn't the vendor's cheapest paid plan (e.g. Cursor's $8 Plus is Grok-only, so "any model"
  means $30 Premium), name the tier in `paid.name` ("Cursor Premium") so nobody can call the price misleading.
- **The GitHub line is fixed** ("a hundred percent free and open source… blowing up right now"). Don't override it.
- **Features: 2–3 items.**
  - Use `intro` on **at most one** feature. It's a short punchy line shown as **big centred captions** with nothing
    else on screen; then the cards arrive with `say`.
  - Each `say` is 1–2 short sentences, concrete, and only claims what the README states.
  - `images`: 1–2 direct image URLs (raw.githubusercontent.com or the site), real product screenshots, landscape
    preferred. If `swap_anchor` is set, image 2 slides in on that word.
    If the repo has only 1 real screenshot, pull stills from its official demo video instead of using a marketing
    banner: `ffmpeg -ss <t> -i demo.mp4 -frames:v 1 -vf crop=… videos/NNN-slug/assets/<name>.png`, then reference it
    as the relative path `assets/<name>.png` (make.py reads it from the video folder; never use absolute paths,
    the cloud checkout lives elsewhere). Commit these small PNGs. Look at every crop.
  - `chips`: 0–4. Each `anchor` is **one word that appears in that feature's `say`** (case-insensitive, no
    punctuation). Labels are 1–3 words, an emoji is optional.
- **nolist:** exactly 3 items. Each `say` is "No <thing>.", and `label` is the on-screen text (≤ 14 characters is best).
- **install:** the real one-liner (brew, npm, pip, winget…) or "Download from GitHub Releases". `install_url`: the
  product homepage if it looks good on mobile, else omit it (the GitHub releases page is used).
- **STANDING RULE: say who can use it.** `platforms`: where it runs, in viewer words, from the README
  (["Mac"], ["Mac", "Windows", "Linux"], ["iPhone", "Android"], ["any browser"]). make.py speaks them at the install
  step ("It runs on Mac and Windows. Install it with one command…"). With no one-liner, it never claims "one command":
  it says "Just grab the free download for Mac and Windows." and the terminal box shows ⬇ instead of `$`.
- **keyword:** one short word tied to the product, spoken as a word (VOICE, FILE, EDIT…). Never an acronym that would
  be spelled out. Not used in the last 7 days.
- **Numbers spoken as words; no license talk** (never say MIT/GPL); no star counts or URLs read aloud; sound human
  ("you guys" is fine).
- **icon:** the app icon (search the repo tree: `gh api 'repos/O/R/git/trees/HEAD?recursive=1' --jq '.tree[].path' | grep -iE 'icon|logo'`).
  A PNG of at least 256px, ideally transparent (make.py rounds the corners of opaque square icons automatically). If there isn't one, use the owner avatar `https://github.com/<owner>.png?size=512`.
- **caption:** first line = the hook with digits ("$40/year"), then 3–4 ✅ lines, then the CTA line with the keyword,
  the follow line, and 6–8 hashtags. No license mentions. ≤ 2,200 characters.
  - Add a 💻 line with the platforms ("💻 Mac · Windows · Linux").
  - **STANDING RULE: be upfront about the one big catch**, in one calm line (ℹ️), if there is one: a separate paid
    "Pro" build exists, it's in beta, the build is unsigned (first launch needs "Open anyway"), a feature needs a
    GPU, or one platform is only a preview. That heads off "it's not actually free" comments and builds trust.
    Never put the catch in the voiceover.
- **thumb:** `big` is one word (FREE / $0 / OFFLINE). `line1` + `line2` are usually "<Paid>" / "alternative".
  **STANDING RULE: the cover says what the app does too.** make.py makes the `job` line the cover's big headline,
  with "free <line1> <line2>" small underneath and the "<Paid> $X → $0" strip on top. So `job` must read well
  on its own at grid size: one clear outcome, no jargon.

## 4. Build

```bash
pipeline/.venv/bin/python pipeline/make.py videos/NNN-slug        # ≈3–5 min each; run them one after another
```
make.py builds:
- script → Kokoro voice (af_heart, speed 1.08) → word times → beats;
- the GitHub phone recording, with the About box measured for the highlight, plus the install-page recording;
- the HyperFrames price-slash hook, in the slot's accent;
- the Remotion reel, normalised to -14 LUFS;
- the thumbnail, `post.json`, and a QA sheet.

If a step fails, read the error, fix `video.json` (usually a chip anchor that isn't a word in its `say`, or a dead
image URL) and re-run. Add `--skip-capture` / `--skip-tts` to reuse earlier steps.

## 5. QA: look at every reel before scheduling (a published Reel can't be edited or deleted through the API)

View `videos/NNN-slug/verify/row0.png`, `row1.png` and `thumb.png` with the Read tool. Fix and rebuild if any of these fail:
- [ ] **Frame 0** is a full, bold hook (the paid name + price + the job line), nothing clipped.
      Hook B: frame 0 shows the app in use, big and legible (not a blank window, a login screen or a logo); the
      headline fits in 2 lines; the price strip is struck on "This" and FREE lands on "free".
- [ ] Someone who only watches the first 5 s could say what the app does (hook voice + job line agree).
- [ ] The phone shows the right repo, and the highlight box sits on the About text.
- [ ] Feature cards show real product screenshots (not a logo or a broken image). Chips are readable.
- [ ] Captions are spelled right and centred on the intro beat. Nothing sits in the top or bottom 10%.
- [ ] The CTA shows the right keyword plus the @itsongit pill. The thumbnail headline is correct.
- [ ] make.py printed 32–45 s and about -14 LUFS.

## 6. Schedule on Instagram (Zernio)

The plan already set each reel's window, time, slot (accent) and date in `video.json`, so publish needs no flags:
```bash
python3 pipeline/zernio.py publish videos/NNN-slug
```
Windows (Berlin, `data/experiments.json`): **midday 11:05–12:50, evening 18:00–19:50, night 21:00–22:50.** 13:00–15:00
was the dead zone (median ~35 views) and is not used. Times are random inside the window, never on :00/:15/:30/:45.
`publish` does all of this:
- uploads the reel and the cover, and schedules the Reel with the thumbnail;
- creates the comment-to-DM automation: any comment triggers it, the follow gate is on (the link only goes to
  followers, with a "follow then tap" DM first), 6 rotating public replies (posted for every commenter, gated or not), 5 DM versions, and 15–20 s delays;
- registers the automation for the delay shuffler;
- writes the ids into `post.json`.

Then confirm with `python3 pipeline/zernio.py status videos/NNN-slug`.
Found a flaw after scheduling? While it's still unpublished: `python3 pipeline/zernio.py unschedule videos/NNN-slug`
(deletes the post + automation), fix and rebuild, then `publish` again with the same slot and date.
Never use `--now` unless the user asked for an immediate post.

## 7. Ledger + report

**Weekly (and whenever asked how the tests are going):** `python3 pipeline/experiments.py` scores the hook and topic
tests from live numbers and writes `data/experiments/report.md`. When a verdict says a test is decided, apply it
(make the winning hook the default in `make.py`, reweight the topic arms in `plan.py` as the rule says), log it in
`data/experiments.json` under `"decisions"`, and start the next test (ideas: a different hook visual, a 25-second
cut, an early-morning window) against the new default.

```bash
python3 pipeline/ledger.py      # refreshes POSTED_REPOS.md and data/posted.json
```
Finish with a table: window/time · hook arm · topic arm · repo · paid alternative · keyword · length · Zernio status. Note any repo you
skipped and why. If running in a git checkout with push rights, commit `videos/*/video.json`, `videos/*/post.json`,
`POSTED_REPOS.md` and `data/posted.json`, but **never commit media or `.env`**.

## Settings reference
- **Voice:** Kokoro `af_heart` at 1.08 (`brand.json` → `voice`). **Accents:** green, blue, purple = slots 0–2 (midday, evening, night).
- **Canvas:** 1080×1920 at 30 fps. Safe zone y 192–1728. Fonts: Inter 600/800/900 + JetBrains Mono 700.
- **Zernio:** `data/zernio.json` (profileId, accountId, timezone Europe/Berlin, slots). API notes: `data/zernio-docs/SPEC.md`.
- **Instagram limits:** Reels 3–90 s, ≤ 300 MB; 25 posts/hour, about 100/day; one private DM per comment, within 7 days.
