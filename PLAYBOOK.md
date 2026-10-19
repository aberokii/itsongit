# itsongit playbook: repo → finished reel → Instagram

How to make every itsongit video. Reel **001 (PureMac)** is the approved reference: `videos/001-puremac/FINAL_puremac.mp4`.
The house style is locked in `BRAND.md` and `brand.json`. Read both before making a video.

**Target:** 5 reels a day. Each post's daily slot (0–4) picks its accent colour, so the 5 posts of a day never share
a colour.

---

## 0. The pipeline at a glance

```
scout ──► pick 5 ──► research pack ──► script ──► voice + word timings ──► phone captures
   │                                                                          │
   └── data/candidates/<date>.md                                              ▼
                                         HyperFrames hook ◄── beats (word anchors) ──► Remotion reel
                                                                                          │
                              data/posted.json ◄── Zernio post + comment-to-DM ◄── QA + loudnorm
```

| Stage | Tool | Output |
|---|---|---|
| Scout | `pipeline/scout.py` | `data/candidates/<date>.{md,json}` |
| Voice | `hyperframes tts` (Kokoro, voice **af_heart**, speed 1.08) | `vo.wav` |
| Word timings | `~/Documents/editor/helpers/transcribe.py` (local Whisper) | `transcripts/vo.json` |
| Phone captures | `capture/capture.mjs` (`mobile` + `stepped`) | sharp 1178×2556 MP4s |
| Hook | HyperFrames (`hyperframes/index.html`, GSAP) | `hook.mp4` |
| Reel | Remotion (`studio/src/V00N.tsx`) | `reel_raw.mp4` |
| Finish | ffmpeg loudnorm to -14 LUFS | `FINAL_<name>.mp4` |
| Publish | Zernio API | Reel + keyword DM automation |

## 1. Folder map

```
itsongit/
├── BRAND.md / brand.json      locked style: fonts, colours, 5 accents, safe zone, voice
├── PLAYBOOK.md                this file
├── pipeline/scout.py          repo discovery + vetting (uv venv in pipeline/.venv, also has kokoro-onnx)
├── capture/capture.mjs        Playwright stills + phone recordings
├── hyperframes/index.html     hook template (price-slash pattern); timing line rewritten per video
├── studio/                    Remotion project; src/kit.tsx = shared components, src/V00N.tsx = one per video
├── scripts/build_v00N.py      one-command build for a video (beats → capture → hook → reel → loudnorm)
├── scripts/brand-css.mjs      brand.json → brand.css for HyperFrames
├── data/posted.json           ledger of posted repos (the scout skips these)
├── data/candidates/           daily scout output
└── videos/NNN-<slug>/         everything for one video, including post.md (caption, keyword, link)
```

## 2. One-time setup (done on this Mac)

- Node 24, ffmpeg, uv and `gh` (logged in) are installed.
- `studio/` and `capture/` have their npm packages installed. Run `npx playwright-core install chromium-headless-shell` once.
- HyperFrames is pinned at `hyperframes@0.8.176`. Its skills are in `~/.claude/skills/hyperframes*`, and the Remotion skills are in `~/.claude/skills/remotion-*`.
- `export HYPERFRAMES_PYTHON=$PWD/pipeline/.venv/bin/python` is required for `hyperframes tts`.
- `.env` (copy `.env.example`) needs `ZERNIO_API_KEY` and `ZERNIO_INSTAGRAM_ACCOUNT_ID` for publishing.

---

## 3. Step 1: Scout (find repos)

```bash
pipeline/.venv/bin/python pipeline/scout.py --limit 40      # ~1 min
```

### Sources (tested 2026-10-19)

| Source | How | Reliability | What it's good for |
|---|---|---|---|
| **gittrend.io API** | `GET https://gittrend.io/api/trending?limit=100&page=N` → `starsToday`, `trendingScore` | ✅ Best single feed. JSON, CC0 rankings, built from GH Archive every hour | Daily star velocity across ~13k ranked repos |
| **GitHub Trending** | Scrape `github.com/trending?since=daily\|weekly` (`article.Box-row`) | ✅ Works; no official API, so the HTML can change | GitHub's own picks, 25 per list |
| **GitHub Search API** | `gh api search/repositories` (30 req/min) | ✅ Official, stable | Targeted pools: `"alternative" in:description`, `topic:self-hosted`, `topic:macos-app`, new repos with >2k stars |
| **Hacker News (Algolia)** | `hn.algolia.com/api/v1/search?tags=show_hn&query=github.com` | ✅ Official, free | Show HN launches people actually discuss |
| Reddit (r/selfhosted, r/opensource, r/macapps) | `/top.json` | ⚠️ Returns 403 without a login. Needs a free Reddit OAuth app | Consumer-friendly picks; worth adding once there's a key |
| Trendshift | `api.trendshift.io` | 💲 Paid ($9/mo) | Daily snapshots of GitHub Trending history |
| OSS Insight | `api.ossinsight.io/v1/trends/repos` | ❌ Ranking unavailable since 2026-03 (event capture broke) | Don't use |
| Curated lists | awesome-selfhosted, OpenAlternative (`piotrkulpinski/openalternative`), opensourcealternative.to, AlternativeTo (open-source filter) | ✅ Evergreen backlog | "Free alternative to X" ideas on slow news days |

### What the scout does automatically
- **Merges all sources** and skips anything already in `data/posted.json`.
- **Rejects** a repo if any of these apply:
  - its license isn't OSI-approved (including `NOASSERTION`);
  - it's archived, or has had no push in 60+ days;
  - its description isn't in English;
  - fake-star signs: more than 1,500 stars a day with fewer than 5 contributors, or forks under 1% of stars.
- **Scores** the rest on:
  - stars (log scale) and velocity (stars today, the trending gain or HN points);
  - consumer keywords (app, Mac, privacy, offline, photo, PDF…);
  - developer-only keywords (SDK, library, list, tutorial…), which subtract;
  - an "alternative to X" bonus;
  - release downloads, a homepage, and 10+ contributors.

### Human/agent pick (the scout ranks; you choose)
Pick 5 a day with this checklist:
1. **A normal person can use it today:** a download, an App Store/Homebrew install, or a live web app. Skip CLI-only developer tools unless the audience asks for them.
2. **There's a clear hook angle**, ideally "free alternative to <paid tool> ($X/mo)". Otherwise "<surprising capability>, free".
3. **It's real:**
   - spot-check the stargazers and the issues;
   - the README matches the product;
   - releases have actual downloads;
   - for `NOASSERTION` rejects you think are real (e.g. janhq/jan), read the LICENSE file by hand.
4. **There's visual material:** README screenshots or GIFs, a working homepage, or a web demo you can record.
5. **Mix the day:** no two posts in the same category (e.g. one Mac tool, one AI, one productivity, one creative, one privacy).
6. **Check the paid tool's price** on its official pricing page, and write the source into `post.md`.

---

## 4. Step 2: Research pack

Make `videos/NNN-<slug>/` and collect:
- **The README facts you'll claim:** the features, the install command and the platform. Every spoken claim must be in the README or on the homepage.
- **The real numbers** (`gh api repos/OWNER/REPO`): stars, created date, release download count.
- **Images:**
  - the app icon (`*.xcassets/AppIcon*`, `public/icon*`, `logo*` in the repo tree: `gh api 'repos/O/R/git/trees/main?recursive=1'`);
  - README screenshots (`raw.githubusercontent.com/...`);
  - the owner avatar (`https://github.com/OWNER.png?size=200`).
- **The paid comparison:** the product name and its price per month or year.

## 5. Step 3: Script (35–40s, about 100 words)

Use this exact structure. It's the approved one, and each line maps to a scene:

```
[HOOK]     <Paid tool> charges you <price in words>. This app does the same job, for free.
[NAME]     It's called <Name>.
[GITHUB]   It's a hundred percent free and open source, so anyone can read the code, right here on GitHub.
           And it's blowing up right now.
[FEATURES] It <feature 1 in plain words>. <3–4 concrete items>.
           <Feature 2>. It even <feature 3>.
[NO-LIST]  No subscription. No tracking. No <annoying thing the paid tool does>.
[INSTALL]  Install it with one command, or just grab the download.
[CTA]      Comment <Keyword>, and I'll send you the link.
```

Rules:
- **Numbers for the voice are written as words** ("forty bucks a year"). Numbers on screen are digits.
- **The keyword is Title-case** ("Comment Mac"), so Kokoro says it as a word. All-caps gets spelled out. On screen it shows as "MAC".
- **Pick a keyword that is short, related to the product, and not used in the last 7 days** (keep a list in `data/posted.json` or `post.md`).
- **No license talk** (MIT etc.), no star counts read aloud, no URLs spoken.
- **If there's no paid competitor**, use a capability hook instead ("This free app turns any photo into…"). The frame-0 rule still applies.

## 6. Step 4: Voice + word timings

```bash
export HYPERFRAMES_PYTHON=$PWD/pipeline/.venv/bin/python
npx -y hyperframes@0.8.176 tts videos/NNN/script.txt -v af_heart -s 1.08 -o videos/NNN/voice/vo.wav
(cd ~/Documents/editor && uv run python helpers/transcribe.py $OLDPWD/videos/NNN/voice/vo.wav \
   --edit-dir $OLDPWD/videos/NNN/voice --language en --prompt "<ProductName>, <PaidTool>, GitHub")
```

The transcript gives word start times. **Every animation is placed on a word ("anchor"), never on a hard-coded second.**
The build script turns anchors into a `b` (beats) object, for example `"tFree2": at("free", 2)`, which means the second
"free". That's why any re-record or voice change re-times the whole edit automatically.

## 7. Step 5: Phone captures

GitHub page, timed to the voice (the build script does this):
```json
{"name":"gh-phone","url":"https://github.com/OWNER/REPO","mobile":true,"viewport":[393,852],"scale":3,
 "scheme":"dark","stepped":true,
 "actions":[{"wait": <until "so">},{"scroll":650,"ms":1600},{"wait": <until "And it's blowing">},
            {"scroll":1000,"ms":1800},{"wait":1500}]}
```
- The first hold shows the repo header and the **About text**, where the highlight box goes. The first scroll reveals the stars row and the file list ("read the code"). The second scroll reaches the README hero image.
- The homepage or demo uses the same settings: hold 1.2s, scroll about 380px, hold, then scroll about 700px.
- **Highlight box position:** take `capture/<name>-top.png` (1179×2556) and find the About paragraph's pixel box. Multiply by `560/1179`, then add 16px (bezel) + 64px (status bar) on top. For github.com mobile it's consistently `left 30, top 528, width 520, height 180`. Check it with a still render (Step 9).
- `stepped` only supports `wait` and `scroll`. Use the screencast mode (`"record": true`) for typing or clicking demos, at lower resolution.

## 8. Step 6: Hook (HyperFrames)

The pattern is `hyperframes/index.html` (price-slash). **Frame 0 is already a full image:** the paid name and price are
huge on a red glow, already zooming in.

| Word anchor | Beat |
|---|---|
| price word ("40") | price punch |
| "This" | red strike → price shrinks to the top, the glow turns to the accent → app icon springs in |
| first "free" | **$0 FREE** slams in with a burst of rays |
| product name | the name punches in the accent |
| ends just before "It's" + "100" | the GitHub phone takes over |

For a new video, change the text (paid name, price, "/year" or "/mo", product name) and `icon.png`. The build script
rewrites the `const T = {…}` timing line and every `data-duration`, then writes `brand.css` for the slot's accent.
Run `npx hyperframes@0.8.176 check` after any structural change. (The `#price`/`#strike` occlusion warning is intentional.)

New hook patterns are fine as long as they keep the frame-0 rule and the accent. Put them in `hyperframes/` as
another template and note them here.

## 9. Step 7: Reel (Remotion)

**Scene library** (in `studio/src/V001.tsx` + `kit.tsx`), each with what it needs:

| Scene | Content | Anchors |
|---|---|---|
| `Hook` | `hook.mp4` from HyperFrames | `ghStart` |
| `GitHub` | phone + zoom/highlight on About + **100% FREE** / **OPEN SOURCE** chips + stars count-up | `t100`, `tFree2`, `tOpen`, `tSo`, `tBlowing` |
| centred-caption beat | nothing on screen, big captions | a `[from, to]` zone in `center` |
| `Card` + chips | app screenshot with a slow push-in; one chip per spoken item | one anchor per chip |
| stacked cards | a second screenshot slides over the first | `tSimilar` |
| `PromiseScene` | ✕ rows | `no1..no3` |
| `Install` | homepage phone + typed command | `tOne` |
| `Cta` | "Comment / KEYWORD / link goes straight to your DMs"; captions hidden | `tComment`, `tMac` |
| always on | repo pill (owner / name + avatar), captions, SFX cues, VO | — |

**Making video N:**
1. `cp studio/src/V001.tsx studio/src/V00N.tsx`. Swap the strings (repo pill, chips, card images, ✕ rows, command, keyword, URL label) and the asset paths. Keep the layout constants: phone top 310, cards top 360, chip rows at 1110/1240.
2. Register a `<Composition id="v00N-<slug>">` in `studio/src/Root.tsx` (copy the v001 block).
3. `cp scripts/build_v001.py scripts/build_v00N.py`. Update the paths, URLs and the `b = {...}` anchor table to match the new script's words.
4. Put shared assets (screenshots, icon, avatar, homepage capture) in `studio/public/v00N/`.
5. Run `python3 scripts/build_v00N.py af_heart <slot>`.

(Next improvement: lift the strings and anchors into a `videos/NNN/video.json` so a single `build.py` handles every
video without copying code. Do this when making video 002.)

## 9b. Thumbnail (Reel cover): every video gets one

`studio/src/Thumbnail.tsx` (Remotion `<Still id="thumb">`) renders a 1080×1920 PNG in the same accent as the reel.
The build script's last step writes `thumbnail_<voice>.png`. Props:
`{accent, icon, paid, price, big, line1, line2, repo}`. For 001 that's "CleanMyMac $40/yr → $0", the icon,
**FREE**, "CleanMyMac / alternative", and the repo pill.

Rules:
- Everything important sits inside the **centre 1080×1350 (y 285–1635)**. Instagram crops the cover to 3:4 on the
  profile grid and 4:5 in the feed. Check both crops (§10).
- **No more than about 6 words** of headline. It has to read at grid-tile size. The accent block always carries the
  one-word promise (FREE, $0, OFFLINE…).
- When there's no paid competitor, swap the price row for the hook claim, e.g. "Photoshop-level edits → $0".
- Upload it as the Reel's `instagramThumbnail` (§11), not as a separate post.

## 10. Step 8: QA before anything is posted

Render stills and look at them. Don't post from a file you haven't viewed:
```bash
for t in 0 0.1 3 5.5 8 12 15 20 25 30 34 36; do ffmpeg -v error -y -ss $t -i FINAL.mp4 -frames:v 1 -vf scale=216:-1 verify/f$t.png; done
ffmpeg $(for t in 0 0.1 3 5.5 8 12; do echo -i verify/f$t.png; done) -filter_complex hstack=6 verify/row.png
```
Checklist:
- [ ] **Frame 0** is a full, bold image (no black, nothing clipped at the edges).
- [ ] Nothing important above y=192 or below y=1728.
- [ ] The highlight box sits on the repo's "free / open-source" line.
- [ ] Every chip lands on its spoken word. The keyword is spoken as a word.
- [ ] Captions are centred on the empty beat and hidden on the CTA. No typos (watch Whisper spellings of product names).
- [ ] Loudness: `ffmpeg -i FINAL.mp4 -af ebur128 -f null -` shows **I ≈ -14 LUFS**, peak ≤ -1.5 dB.
- [ ] Length 30–45s; the Instagram Reels limit through Zernio is 90s / 300 MB.
- [ ] Every claim is backed by the README; the price is backed by the vendor's page.

## 11. Step 9: Publish with Zernio (`pipeline/zernio.py`)

**Account:** @itsongit, Instagram only (must be a Business or Creator account). Full API notes are in
`data/zernio-docs/SPEC.md`. Without `ZERNIO_API_KEY` every command is a **dry run** that prints the exact requests.

**One-time setup**
1. Create an API key at zernio.com/dashboard/api-keys and put it in `.env` as `ZERNIO_API_KEY=sk_...`.
2. `python3 pipeline/zernio.py connect-url`: open the link and approve as @itsongit. Keep **all** permissions:
   posting-only can't run comment-to-DM or analytics.
3. `python3 pipeline/zernio.py setup`: saves the profileId and accountId to `data/zernio.json`, sets the timezone
   (Europe/Berlin), and checks health and the publishing quota.

**Per video:** `videos/NNN/post.json`:
```json
{"title": "...", "video": "FINAL_x.mp4", "thumbnail": "FINAL_x_thumbnail.png",
 "repo_url": "https://github.com/o/r", "keyword": "MAC", "caption": "...",
 "dm_message": "Hey {{first_name}}! Here's ... <link>", "dm_button": "Open on GitHub", "comment_reply": "Sent you a DM 📩"}
```
```bash
python3 pipeline/zernio.py publish videos/NNN-slug --slot 0 --date 2026-10-20   # or --now
python3 pipeline/zernio.py status    videos/NNN-slug
python3 pipeline/zernio.py logs      videos/NNN-slug   # DMs sent, failures, link clicks, comments that missed the keyword
python3 pipeline/zernio.py analytics videos/NNN-slug   # views, reach, avg watch time, skip rate, saves, shares
python3 pipeline/zernio.py insights | best-time | health
```

**What `publish` does:**
1. Uploads the reel and the cover: `POST /v1/media/presign`, then a PUT of the raw bytes.
2. Creates the Reel with `POST /v1/posts`: `instagramThumbnail` = the cover, `scheduledFor` = the slot time and
   `timezone`, an `Idempotency-Key`, and our metadata.
3. Creates a **per-Reel comment-to-DM automation** (`POST /v1/comment-automations` with that `postId`). It arms
   itself when the Reel goes live:
   - keywords MAC/Mac/mac, `matchMode: "word"` (so "macbook" doesn't trigger it);
   - a DM with the link plus an "Open on GitHub" button;
   - a public reply "Sent you a DM 📩" after the DM goes out;
   - one DM per person.
4. Writes the post and automation ids back into `post.json`, and adds the repo to `data/posted.json`.

**Making replies look human (automatic for every post)**
- **Public replies:** each post gets a random 6 out of a pool of 12 (`REPLY_POOL` in `zernio.py`), and Zernio picks
  one at random per comment.
- **DMs:** 5 versions with different openers and closers, all with the same link. Build them from `dm_pitch` +
  `install` in `post.json`.
- **Delays:** the DM goes out **15–20 s** after the comment, and the public reply 3–12 s after the DM.
  - Zernio only supports one fixed delay per automation. So a launchd job (`~/.itsongit/jitter.py`, every 2 min)
    re-rolls the delays on automations from the last 3 days, and consecutive commenters wait different amounts.
  - `publish` registers each new automation in `~/.itsongit/automations.json`. The job lives outside ~/Documents
    because macOS blocks background jobs from reading it.
  - Log: `~/.itsongit/jitter.log`.
  - Stop: `launchctl unload ~/Library/LaunchAgents/com.itsongit.jitter.plist`.
  - It only runs while the Mac is awake. If the Mac is asleep, the last random delay stays in place.
- **Any comment triggers the DM** when `"dm_on_any_comment": true` is set (no keywords). Otherwise only the keyword does.

**Daily slots** (`data/zernio.json`, Berlin time): 08:00, 11:30, 14:30, 18:00, 21:00, mapped to accent slots 0–4.
After 2–3 weeks, check `best-time` and adjust.

**Rules and limits to remember**
- A published Reel **can't be edited or deleted through the API**. Fix mistakes in the Instagram app, so QA before scheduling.
  A *scheduled* post can still be changed or deleted.
- Instagram caps: 25 posts/hour, about 100/day; we use 5. Reels are 3–90s, at most 300 MB.
- **DMs:** one private reply per comment, within 7 days. First-time commenters get it in **Message Requests**.
- **Buttons to non-followers:** Instagram refuses buttons to non-followers on some accounts, and the refused attempt
  uses up that comment's only reply. If `logs` shows failures like that, set `"dm_buttons": false` in `post.json`
  (the link is already in the text).
- Free tier: 10k automated DMs/month, then $1 per 10k (needs a card on file). API limit is 60 requests/min.
- Optional later: a webhook (`post.platform.published`, `comment.received`, `message.sent`) for live alerts, and
  `audience.followGate` to make people follow before they get the link.

## 12. Step 10: Ledger

- Append the repo to `data/posted.json`.
- Fill in `videos/NNN/post.md`: caption, keyword, DM link, price source, slot, and the post ID once it's posted.

## 13. Daily run (target ~90 min of agent time for 5 reels)

1. `scout.py`, then pick 5 with the checklist in §3 and assign slots 0–4.
2. For each pick, in parallel (one sub-agent per repo): research pack → script → voice → build.
3. QA every render (§10), then send the 5 to the user for approval (keep this step until the format is trusted).
4. Publish and schedule (§11), then update the ledger (§12).

## 14. Known gaps

- `V00N.tsx` and `build_v00N.py` are copied per video. Next step: one data-driven `build.py` + `video.json`.
- Zernio is built and dry-run tested, but untested live until the API key is set. Check `firstComment` support on Reels and whether @itsongit gets the button refusal on its first post.
- There's no background music yet; it needs a licensed library.
- Reddit isn't a source yet (needs an OAuth app).
- The scout's fake-star check is a heuristic. Top hits still need an eye-check (e.g. `morluto/rea`: 335k stars in 6 months).
