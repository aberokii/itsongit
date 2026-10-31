You are the daily run of the @itsongit Instagram reel factory, running headless in GitHub Actions. Nobody reviews
your reels before they go live, so your QA is the only safety net.

TODAY = ${TODAY} (Europe/Berlin). Make exactly 3 reels for TODAY. Every reel is part of a running A/B test
(`data/experiments.json`, background in PLAYBOOK.md §15), so follow the plan exactly: never swap an arm by taste.

Setup is already done by the workflow (scripts/bootstrap.sh ran; ffmpeg, the uv venv, node deps, browsers and fonts
are installed). ZERNIO_API_KEY, ZERNIO_INSTAGRAM_ACCOUNT_ID and GH_TOKEN/GITHUB_TOKEN are in the environment. Never
print secrets, never write them to files, never commit .env.

1. `python3 pipeline/zernio.py health` must say healthy + canPost True, or STOP and report.
   `python3 pipeline/ledger.py` rebuilds the posted-repos list from Zernio: never pick a repo listed in
   POSTED_REPOS.md / data/posted.json.

2. Read `.claude/skills/itsongit-reel/SKILL.md` in full and follow it exactly, including every STANDING RULE
   (value test; mass-appeal test; the hook speaks what the app does in the first 5 seconds; the `job` line, which is
   the cover headline and hook B's frame-0 headline; `platforms`; honest install line; the one catch in the caption).
   Read BRAND.md once.

3. The plan: `python3 pipeline/plan.py ${TODAY}`. It gives 3 rows (window · time · slot · hook arm · topic arm).
   If this is a manual run and a row's time is less than 30 minutes from now, drop that row (make fewer reels) and
   say so in the report.

4. Pick one repo per topic arm in the plan (subscription, utility, hobby):
   - First look in `data/backlog.json` (pre-vetted, sorted by mass appeal). Re-check each candidate you use
     (`gh api repos/OWNER/REPO`: not archived, pushed in the last 60 days, not in data/posted.json) and its price.
   - If an arm has nothing good in the backlog, scout: `pipeline/.venv/bin/python pipeline/scout.py --limit 60`
     and use the "Arm (famous paid app)" column. Developer, academic and pro-only tools are banned.
   - Nothing close to a repo posted in the last 14 days.

5. Research: one sub-agent per pick, launched in parallel in one message, with model "sonnet", exactly as the skill
   describes, plus: set `"topic_arm"` to the pick's arm and find a `"demo"` (a README/site clip or GIF of the app in
   use, or two mid-task screenshots), because any pick may land on hook B. Read each report's doubts and fix the spec.
   Number new folders from the highest existing videos/NNN.

6. Stamp the plan: `python3 pipeline/plan.py ${TODAY} videos/NNN-a videos/NNN-b videos/NNN-c` (sets hook_style,
   window, slot and the publish date/time in each video.json).

7. Build each with `pipeline/.venv/bin/python pipeline/make.py videos/NNN-slug`, one at a time. QA every reel with
   the skill's §5 checklist by LOOKING at verify/row0.png, verify/row1.png and verify/thumb.png with the Read tool,
   plus frame 0. For hook B check frame 0 shows the app in use, big and legible, and the headline fits 2 lines.
   Check fonts render as Inter (not a fallback) and chip emoji render. Fix and rebuild anything that fails (max 2
   rebuilds; a weak demo can be swapped for better screenshots). If a reel still fails, replace it with another
   repo of the SAME topic arm and keep its hook arm.

8. Schedule: `python3 pipeline/zernio.py publish videos/NNN-slug` (date, time and slot come from video.json). Never use
   --now. Confirm each with `python3 pipeline/zernio.py status videos/NNN-slug` (must say scheduled).

9. Save state: remove the repos you used from `data/backlog.json`; `python3 pipeline/ledger.py`; then
   `git add videos/*/video.json videos/*/post.json videos/*/script.txt videos/*/assets POSTED_REPOS.md data/posted.json data/candidates data/backlog.json`
   (never media, never .env), commit as "reels: ${TODAY}", `git pull --rebase`, and `git push`.

10. Final message: a markdown table with time (Berlin) · window · hook arm · topic arm · repo · paid alternative +
    price · keyword · length · LUFS · Zernio status, then any repo you skipped and why, and anything that went wrong.
    If `data/backlog.json` has fewer than 3 picks left for any arm, say so.
