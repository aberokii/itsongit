# itsongit house style (locked)

Every reel uses this. Values live in `brand.json`. Remotion reads it through `studio/src/brand.ts`,
and HyperFrames through `scripts/brand-css.mjs` → `brand.css`. Don't restyle per video.

## Canvas and safe zone
- 1080×1920, 30 fps.
- **Nothing important in the top or bottom 10%.** Content stays between y=192 and y=1728, with 60px side margins.
  The Instagram UI and phone notches cover those bands.

## Type
- **Inter** 900 (headlines, captions, chips), 800 (labels), 600 (small UI).
- **JetBrains Mono** 700 for commands, code and the story header row.
- **Instrument Serif** italic for accent words and big numbers.

## Colour (paper theme since 2026-11-02; the old dark theme is kept in brand.json as base_dark/accents_dark)
Bright, editorial, like the fastest-growing faceless AI/tech accounts: warm off-white paper, charcoal type, one
hot colour for money, white UI cards with soft warm shadows.
- Base: bg `#F1EFE9` (paper), card `#FFFFFF`, line `#E2DED6`, text `#17171A`, muted `#6E6A64`, shadow `rgba(60,45,30,0.16)`.
- **Tomato `#E5462C`** = money and pain: prices, strikes, ✕ marks, and the italic-serif accent word of a line.
- **Selection blue `#2F6BFF`**: Figma-style selection boxes with corner handles around one key word.
- **Instrument Serif italic** for accent words and big numbers ("at up to *$150,000*"); everything else Inter.
- Small **JetBrains Mono** header row on story reels: `// 03 — mixxx` left, `SERATO → $0` right, muted.
- Tag pills cycle blue / tomato / amber / green / violet.
- **Accent: by the post's daily slot** (the only colour that changes between videos):

  | Slot | Accent | Hex |
  |---|---|---|
  | 0 | blue   | `#2F6BFF` |
  | 1 | green  | `#14A35A` |
  | 2 | violet | `#7A4DFF` |
  | 3 | amber  | `#F2A900` |
  | 4 | pink   | `#E8417C` |

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
