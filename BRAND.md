# itsongit house style (locked)

Every reel uses this. Values live in `brand.json`. Remotion reads it through `studio/src/brand.ts`,
and HyperFrames through `scripts/brand-css.mjs` → `brand.css`. Don't restyle per video.

## Canvas and safe zone
- 1080×1920, 30 fps.
- **Nothing important in the top or bottom 10%.** Content stays between y=192 and y=1728, with 60px side margins.
  The Instagram UI and phone notches cover those bands.

## Type
- **Inter** 900 (headlines, captions, chips), 800 (labels), 600 (small UI).
- **JetBrains Mono** 700 for commands and code.

## Colour
- Base: bg `#0b0f14`, card `#161b22`, line `#30363d`, text `#f0f6fc`, muted `#8b949e`.
- Negative / "the paid thing": `#f85149`. Use it only for strikes, ✕ marks and the paid price.
- **Accent: one of five, by the post's daily slot.** It's the only colour that changes between videos:

  | Slot | Accent | Hex |
  |---|---|---|
  | 0 | green  | `#3fb950` |
  | 1 | blue   | `#4c9aff` |
  | 2 | purple | `#a371f7` |
  | 3 | orange | `#f0883e` |
  | 4 | yellow | `#e3b341` |

  The accent drives the active caption word, solid chips, highlight boxes, the background glow, the $0 or FREE
  slam and the CTA keyword.

## Captions
- Word-by-word, in 1–3 word chunks. The spoken word turns the accent colour.
- **Low** (y≈1530) while visuals are on screen. **Big and centred** (128px) when nothing else is on screen.
- Hidden during the CTA card, because the card already shows the words.

## Hook (first ~6s, HyperFrames)
- **Frame 0 is already a full, striking image**: the paid price is on screen, mid-zoom, on a red glow.
  Never a fade from black.
- Pattern: paid price, then the red strike on "This…". The price shrinks away and the glow turns to the accent.
  The app icon springs in, $0 FREE slams in with a burst, and the product name punches on its line.

## Structure
1. Hook: paid tool vs free.
2. GitHub page on a phone: at least 6s. It always shows **100% FREE** and **OPEN SOURCE** chips, a highlight box
   on the repo's own "free / open-source" line, the code, and a stars count-up.
3. Features: app screenshots or recordings, one chip per spoken item.
4. The "no…" list (✕ rows).
5. Install: the phone recording plus a typed command.
6. CTA: "Comment **KEYWORD**". The voiceover says the keyword as a word, never spelled out.

Skip license details (MIT etc.) in the voiceover and on screen.

## Motion
- Kinetic but simple: spring entrances (damping ~15), 0.22s scale-down exits, at most 3 things moving at once.
- Whoosh on scene changes, pop on chips, ding on the stars and the keyword.
- Loudness is normalised to -14 LUFS, true peak -1.5 dB.

## Thumbnail (Reel cover)
- 1080×1920 PNG in the post's accent (`studio/src/Thumbnail.tsx`).
- Key content stays inside the centre 1080×1350 so it survives the 3:4 grid and 4:5 feed crops.
- Layout, top to bottom: the paid price struck through → $0, the app icon, a big accent block with the one-word
  promise, a two-line headline, then the repo pill.

## Phone recordings
- Use `capture/capture.mjs` with `"mobile": true, "stepped": true, "viewport": [393,852], "scale": 3`.
- That gives an emulated iPhone, captured frame by frame at full resolution.
