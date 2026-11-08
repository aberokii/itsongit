# Developer-first line: research notes (2026-11-08)

## @dopaminedevs
Not readable from the cloud session. Instagram redirects anonymous `instaloader` to login, the public page returns
429, and we did not try to get around its login/bot checks. Web search finds no indexed trace of the handle (no site,
X, YouTube, TikTok or press). **To analyse it properly:** run `instaloader --login <your_ig_user> profile dopaminedevs`
on your own machine (your own session, low volume), or send screenshots of its top 5–10 reels with view counts.
Everything below is from the wider developer short-form genre, not from that account.

## Libraries installed (session only; not committed)
- `instaloader` 4.16, `yt-dlp`, `gallery-dl`: Instagram profile/reel download. All need a logged-in session
  (cookies) for Instagram today.
- `Ootto-AI/claude-content-skills` (52 skills) and `lemomo-ai/lemo-opuscar` (66 code-made film styles): cloned to
  `/home/user/vendor` and read as references. Installing them as live skills was blocked by the session's safety
  policy (third-party code), so they were used read-only.

## Developer short-form landscape (counts are unverified search snippets)
| Account | Platform | ~Followers | Note |
|---|---|---|---|
| @githubprojects | IG | 162K | unofficial repo showcase |
| @github | IG | 828K | official |
| @debug_code | IG | 101K | daily coding tips/projects |
| Fireship | YouTube | 4.3M | "100 seconds", Code Report |
"5 GitHub repos that feel illegal to know" is everywhere on Shorts: saturated, so use it as a tag, not a headline.

## What travels with developers
- **Evidence over polish:** a real terminal, real flags, real pane names. Not stock footage or vague claims.
- **What devs save/share:** an install command, a comparison, a "which to use when" verdict, anything that saves hours.
- **Credibility killers:** hype words, wrong facts (stars, licence, "free" when open-core), long intros,
  overclaiming ("replaces X" when it does 20% of it), an AI-sounding voice.
- **Honesty wins:** name the catch (you still pay for the server; the app is in beta).
- **Themes:** terminal glow-ups, self-hosting / replace the paid dev tool, local AI for devs, repo stories and races.

## Frameworks taken from claude-content-skills (virality, going-viral, ab-hook-tester, viral-hook-writer, cta-writer)
- **Frame 0 must move and be recognisable**: the account behind the "virality" skill reports the same hook got
  522 views as a static card and 35,834 typed live in the real app. That's why the dev line opens on a terminal that
  is already mid-typing on frame 0.
- Claim lands by ~1.5 s, first spoken word is the subject, works on mute, talks about the viewer ("you/your").
- Re-hook at ~4 s / 9 s / 15 s; number the beats so there is a visible finish line; best item last.
- **Withhold the how**: tease the result, don't close the loop early. (Our consumer hooks reveal "price → $0" in
  the first second; worth testing a withheld version.)
- A/B: two hooks that pull different levers, everything else fixed, judge on 3-second skip rate, not likes.
- CTA: one ask, keyword in the caption's first line, link only in the DM.
- Cover: 3–5 words, legible at 150 px wide, text out of the top 12% / bottom 20%.

## Lemo-Opuscar styles picked for vertical dev reels
| Skin (`theme`) | Lemo style | Best for |
|---|---|---|
| `crt` | ascii-crt | CLI tools, terminal apps |
| `keynote` | dark-keynote | launches, benchmarks, "10x faster", star counts |
| `blueprint` | blueprint | self-hosting, architecture, "how it works" |
| (later) | living-screencast | AI coding agents (pixel mascot acting out the agent) |
Directing rules worth adopting: hook in 3 s, one native move per film at the peak, sound first ("every visible
action has a sound"), at least two real silences, vary the pace, subject ≥ ⅓ of the frame.
Licence: Lemo-Opuscar code and docs are MIT, its films CC BY 4.0. We adapted palettes and techniques only and copied
no code or footage, so nothing is owed. `themes.tsx` credits the source anyway.

## 25-hook bank for the dev line (verify every number before use)
Money leak: "Vercel bills you for every deploy. Coolify runs the same thing on your own box." ·
"You pay for Postman. Posting does it inside your terminal for free."
Contrast: "pip takes a minute. uv takes under a second." (needs a source) · "Heroku: twenty-five a month. Coolify: zero."
Callout: "If you still scroll shell history by hand, stop." · "If you run git commands one at a time, watch lazygit."
Mistake: "Stop typing cd forty times a day." · "Stop pasting your code into ChatGPT. Run Ollama instead."
Hidden gem: "There's a free GUI for Ollama that looks like ChatGPT."
Number + payoff: "Three repos that replace three paid tools. The third is Zed." · "One command installs Python, the venv and every dependency."
Curiosity gap: "This repo has 80,000 stars, and half of developers never heard of it."
Challenge: "Name one thing Zapier does that n8n can't."
Result-first: "My laptop just ran a coding model with no internet." · "This one command turns any server into your own Vercel."
Question: "Why does your laptop fan scream? btop knows which process."
Price hike: "SaaS prices went up again. Here are four apps you can self-host."
