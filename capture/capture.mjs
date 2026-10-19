// Automated b-roll capture: real websites and live demos -> screenshots, full-page stills, and
// high-quality screen recordings (CDP screencast frames -> ffmpeg mp4, silent).
//
// Usage:  node tools/web-capture/capture.mjs <shots.json>
//
// shots.json:
// { "out": "/abs/output/dir",
//   "shots": [
//     { "name": "chatterbox-github", "url": "https://github.com/resemble-ai/chatterbox",
//       "viewport": [1280, 800], "scale": 2, "scheme": "dark", "record": true,
//       "actions": [
//         {"wait": 1500},
//         {"screenshot": "hero"},                      // viewport still
//         {"fullpage": "full"},                        // whole page still (for Remotion scroll/zoom)
//         {"scroll": 1400, "ms": 4000},                // smooth scroll by px over ms
//         {"type": "textarea", "text": "Hello there", "delay": 60},   // type into first match
//         {"click": "button:has-text('Generate')", "nth": 1},     // nth picks the match (default first, -1 = last)
//         {"waitFor": "audio", "state": "attached", "timeout": 120000},
//         {"hover": "selector"}, {"highlight": "text=23+"}   // highlight = scroll into view + pause
//       ] } ] }
//
// Runs Playwright's headless shell (works inside the Claude Code sandbox; system Chrome does not).
// Recordings carry no audio by design (reels use only the creator's voiceover + SFX).

import { chromium } from 'playwright-core';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const OUT = spec.out;
fs.mkdirSync(OUT, { recursive: true });
const FPS = spec.fps || 30;

async function smoothScroll(page, by, ms) {
  await page.evaluate(async ({ by, ms }) => {
    const start = window.scrollY, t0 = performance.now();
    await new Promise((res) => {
      const step = (t) => {
        const k = Math.min(1, (t - t0) / ms);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; // cubic in-out
        window.scrollTo(0, start + by * e);
        k < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });
  }, { by, ms });
}

const pick = (page, a, sel) => { const l = page.locator(sel); return a.nth === undefined ? l.first() : l.nth(a.nth); };

async function startScreencast(page, dir, maxW, maxH) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  fs.mkdirSync(dir, { recursive: true });
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const f = path.join(dir, `f${String(frames.length).padStart(5, '0')}.jpg`);
    fs.writeFileSync(f, Buffer.from(data, 'base64'));
    frames.push({ f, t: metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1, maxWidth: maxW, maxHeight: maxH });
  return async (mp4) => {
    await cdp.send('Page.stopScreencast').catch(() => {});
    if (frames.length < 2) return false;
    // concat demuxer with real per-frame durations -> constant-fps mp4
    const list = frames.map((fr, i) => {
      const d = i < frames.length - 1 ? Math.max(1 / FPS, frames[i + 1].t - fr.t) : 0.5;
      return `file '${fr.f}'\nduration ${d.toFixed(4)}`;
    }).join('\n') + `\nfile '${frames.at(-1).f}'\n`;
    const lf = path.join(dir, 'list.txt');
    fs.writeFileSync(lf, list);
    const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lf,
      '-vf', `fps=${FPS},scale=trunc(iw/2)*2:trunc(ih/2)*2`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-crf', '16', '-an', mp4]);
    fs.rmSync(dir, { recursive: true, force: true });
    return r.status === 0;
  };
}

// "stepped": true records deterministically: one full-resolution screenshot per frame while
// wait/scroll actions run (sharp at scale 3, unlike the screencast). Only wait/scroll are supported.
async function steppedRecord(page, s, mp4) {
  const dir = path.join(OUT, `.stepped-${s.name}`);
  fs.mkdirSync(dir, { recursive: true });
  // "measureAbout": true → write <name>-about.json with the repo About paragraph's box (CSS px, page coords)
  if (s.measureAbout) {
    const box = await page.evaluate(() => {
      const h = [...document.querySelectorAll('h2,h3')].find((e) => e.textContent.trim() === 'About');
      const para = h && (h.parentElement.querySelector('p') || h.nextElementSibling);
      if (!para) return null;
      const r = para.getBoundingClientRect();
      return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height, viewport: [innerWidth, innerHeight] };
    });
    fs.writeFileSync(path.join(OUT, `${s.name}-about.json`), JSON.stringify(box));
  }
  let n = 0;
  const snap = async () => page.screenshot({ path: path.join(dir, `f${String(n++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
  const dup = (k) => { const last = path.join(dir, `f${String(n - 1).padStart(5, '0')}.jpg`); for (let i = 0; i < k; i++) fs.copyFileSync(last, path.join(dir, `f${String(n++).padStart(5, '0')}.jpg`)); };
  for (const a of s.actions) {
    if (a.wait) { await page.waitForTimeout(a.wait); await snap(); dup(Math.round(a.wait / 1000 * FPS) - 1); }
    else if (a.scroll !== undefined) {
      const start = await page.evaluate(() => window.scrollY), k = Math.round((a.ms || 3000) / 1000 * FPS);
      for (let i = 1; i <= k; i++) {
        const t = i / k, e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        await page.evaluate((y) => window.scrollTo(0, y), start + a.scroll * e);
        await snap();
      }
    }
  }
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%05d.jpg'),
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-an', mp4]);
  fs.rmSync(dir, { recursive: true, force: true });
  return r.status === 0;
}

const browser = await chromium.launch({ headless: true });
for (const s of spec.shots) {
  const [w, h] = s.viewport || [1280, 800];
  // "mobile": true emulates an iPhone (touch, mobile layout, iOS Safari UA) for vertical phone recordings
  const ua = s.mobile
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: s.scale || 2,
    colorScheme: s.scheme || 'light', userAgent: ua, isMobile: !!s.mobile, hasTouch: !!s.mobile });
  const page = await ctx.newPage();
  const log = [];
  let stop = null;
  try {
    await page.goto(s.url, { waitUntil: 'networkidle', timeout: s.timeout || 60000 }).catch(() => {});
    const sc = s.scale || 2;
    if (s.stepped) {
      console.log((await steppedRecord(page, s, path.join(OUT, `${s.name}.mp4`))) ? 'ok' : 'FAIL', s.name, 'stepped');
      await ctx.close();
      continue;
    }
    if (s.record) stop = await startScreencast(page, path.join(OUT, `.frames-${s.name}`), w * sc, h * sc);
    for (const a of s.actions || [{ wait: 1500 }]) {
      if (a.wait) await page.waitForTimeout(a.wait);
      else if (a.screenshot) await page.screenshot({ path: path.join(OUT, `${s.name}-${a.screenshot}.png`) });
      else if (a.fullpage) await page.screenshot({ path: path.join(OUT, `${s.name}-${a.fullpage}.png`), fullPage: true });
      else if (a.scroll !== undefined) await smoothScroll(page, a.scroll, a.ms || 3000);
      else if (a.type) { const l = pick(page, a, a.type); await l.click(); await l.fill(''); await page.keyboard.type(a.text, { delay: a.delay || 50 }); }
      else if (a.click) await pick(page, a, a.click).click({ timeout: a.timeout || 15000 });
      else if (a.hover) await pick(page, a, a.hover).hover();
      else if (a.waitFor) await pick(page, a, a.waitFor).waitFor({ state: a.state || 'visible', timeout: a.timeout || 60000 });
      else if (a.highlight) { await pick(page, a, a.highlight).scrollIntoViewIfNeeded(); await page.waitForTimeout(a.ms || 1200); }
      log.push(Object.keys(a)[0]);
    }
    if (stop) { const st = stop; stop = null; log.push((await st(path.join(OUT, `${s.name}.mp4`))) ? 'mp4' : 'mp4-FAILED'); }
    console.log('ok', s.name, log.join(','));
  } catch (e) {
    console.log('FAIL', s.name, `after [${log.join(',')}]`, e.message.split('\n')[0]);
    await page.screenshot({ path: path.join(OUT, `${s.name}-FAILED.png`) }).catch(() => {});
    // keep what was recorded up to the failure (stop the screencast first, then encode)
    if (stop) { const ok = await stop(path.join(OUT, `${s.name}-partial.mp4`)).catch(() => false); console.log('  partial recording', ok ? 'saved' : 'not saved'); }
  }
  await ctx.close();
}
await browser.close();
