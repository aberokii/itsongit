# web-capture: automated b-roll from real websites and live demos

`node tools/web-capture/capture.mjs shots.json` loads real pages in Playwright's headless browser and outputs:
- `<name>-<label>.png`: viewport stills (2× scale)
- `<name>-<label>.png` from `fullpage`: whole-page stills for Remotion scroll, zoom and highlight
- `<name>.mp4`: a silent, real-time screen recording of the actions (smooth scrolls, typing, clicks, waiting for
  results)

Actions: `wait`, `screenshot`, `fullpage`, `scroll` (+`ms`), `type` (+`text`, `delay`), `click`, `hover`, `waitFor`
(+`state`, `timeout`), `highlight`. Any action that takes a selector also accepts `nth` (`-1` = last match). The
format is documented in the header of `capture.mjs`.

Tested 2026-10-07:
- A GitHub README smooth scroll (resemble-ai/chatterbox).
- A live Hugging Face Gradio demo (Kokoro): type → Generate → the waveform playing.

For a Hugging Face Space, record its direct `*.hf.space` URL (`curl -s https://huggingface.co/api/spaces/OWNER/NAME`
→ `host`), not the huggingface.co wrapper with its iframe.

Setup (once): `cd tools/web-capture && npm install && npx playwright-core install chromium-headless-shell`.
It works inside the Claude Code sandbox; system Chrome does not. Recordings are 1× CSS resolution (for example
1280×900), which is plenty for floating cards. Use the 2× stills for deep zooms.
