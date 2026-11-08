import React from "react";
import {AbsoluteFill, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {f, Sfx, type Word} from "./kit";
import {localFont} from "./fonts";

// "Living Screencast", recreated from Lemo-Opuscar's style prompt (github.com/lemomo-ai/lemo-opuscar,
// styles/living-screencast, MIT) for a 1080×1920 reel. The rules we follow from STYLE.md:
//  · real UI, redrawn (Claude Code in a terminal, lazygit): every label as in the real tools, no screenshots
//  · a low-res pixel mascot lives in the hi-res UI and acts out what the software does; two resolutions = the look
//  · gravity = top edges of UI: the mascot only stands on a line, a box, a word
//  · a recording-software camera: one take, zoom ≥ 1, push-ins, whip-pans with motion blur on an untransformed wrapper
//  · information layers only: chapter pill, keystroke HUD, frosted caption pill (+ pixel chapter wipes)
//  · native moves: moving floor, karaoke-ball words, cell division, spotlight freeze, cursor pets the mascot
// The mascot is an ORIGINAL pixel character ("Pip") in the style's clay colour; it is not the official Claude Code
// mascot. The demo's own code was read for reference; nothing is copied.

const INTER = localFont("Inter");
const MONO = localFont("JetBrains Mono");
const NEWS = localFont("Newsreader");

// Claude light theme tokens (the style's demo palette)
const T = {ivory: "#FAF9F5", oat: "#F0EEE6", side: "#F4F2EC", line: "#E6E3D9", line2: "#D9D5C8", ink: "#1F1E1C", ink2: "#3D3B37",
  mute: "#85827A", faint: "#B8B3A6", clay: "#D97757", clay2: "#BD5D3A", clayT: "#F6E3DA", add: "#E7F3E8", addI: "#2F7D3F", w0: "#E9E1D1"};
const CLAY = "#D97757", CLAY_D = "#B85F40", CLAY_L = "#F0A88A", EYE = "#2A2622";

// ── tiny math ──
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const eo = (x: number) => 1 - Math.pow(1 - x, 3);
const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

// ── props ──
type Line = {text?: string; code?: string; anchor?: string; dt?: number; row?: boolean};
export type SBeat = {
  start: number; end: number; act: "prompt" | "answer" | "explain" | "lazygit" | "end";
  text?: string; chapter?: {no: string; nm: string}; lines?: Line[]; em?: string[]; say?: string;
  spark?: string; table?: string[]; stage?: string; spot?: string;
};
export type ScreencastProps = {dir: string; words: Word[]; beats: SBeat[]; end: number; keyword: string; caption?: string[]; coverAt?: number; cover?: {kicker: string; big: string}};

// ── the mascot: "Pip", 14×13 pixels, original design (rounded clay dome, sprout antenna, two legs) ──
type Pose = {eyes?: string; arms?: string; legs?: string};
const grid = ({eyes = "n", arms = "down", legs = "stand"}: Pose) => {
  const P = new Map<string, number>();
  const put = (c: number, r: number, v = 1) => P.set(`${c},${r}`, v);
  const rows: [number, number, number][] = [[2, 4, 9], [3, 3, 10], [4, 2, 11], [5, 2, 11], [6, 2, 11], [7, 2, 11], [8, 2, 11], [9, 2, 11], [10, 3, 10]];
  for (const [r, a, b] of rows) for (let c = a; c <= b; c++) put(c, r);
  put(7, 1, 3); put(7, 0, 3); put(8, 0, 3); // sprout
  if (arms === "up") { put(1, 5); put(0, 4); put(0, 3); put(12, 5); put(13, 4); put(13, 3); }
  else if (arms === "wave") { put(1, 7); put(0, 8); put(12, 5); put(13, 4); put(13, 3); }
  else { put(1, 7); put(0, 8); put(12, 7); put(13, 8); }
  const L: Record<string, [number, number][]> = {stand: [[4, 2], [5, 2], [8, 2], [9, 2]], walkA: [[4, 2], [5, 2], [8, 1], [9, 1]],
    walkB: [[4, 1], [5, 1], [8, 2], [9, 2]], tuck: [[4, 1], [5, 1], [8, 1], [9, 1]]};
  for (const [c, h] of L[legs] ?? L.stand) for (let r = 11; r < 11 + h; r++) put(c, r);
  const E: Record<string, [number, number][]> = {n: [[5, 5], [5, 6], [8, 5], [8, 6]], l: [[4, 5], [4, 6], [7, 5], [7, 6]], r: [[6, 5], [6, 6], [9, 5], [9, 6]],
    u: [[5, 4], [5, 5], [8, 4], [8, 5]], d: [[5, 6], [5, 7], [8, 6], [8, 7]], blink: [[5, 6], [8, 6]], wide: [[5, 4], [5, 5], [5, 6], [8, 4], [8, 5], [8, 6]],
    happy: [[4, 6], [5, 5], [6, 6], [7, 6], [8, 5], [9, 6]], shut: [[4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6]]};
  for (const [c, r] of E[eyes] ?? E.n) put(c, r, 2);
  put(4, 3, 4); put(3, 4, 4); // highlight
  for (let c = 3; c <= 10; c++) if (P.get(`${c},10`) === 1) put(c, 10, 5); // shade row
  return [...P].map(([k, v]) => { const [c, r] = k.split(",").map(Number); return [c, r, v] as [number, number, number]; });
};
const FILL: Record<number, string> = {1: CLAY, 2: EYE, 3: CLAY_D, 4: CLAY_L, 5: CLAY_D};
type Spr = {x: number; y: number; px: number; flip?: boolean; sq?: number; op?: number; tint?: string} & Pose;
const Sprite: React.FC<Spr> = ({x, y, px, flip, sq = 0, op = 1, tint, ...pose}) => {
  const G = grid(pose);
  const sy = 1 - sq, sx = 1 + sq * 0.7, w = 14 * px * sx, h = 13 * px * sy;
  return (
    <>
      <div style={{position: "absolute", left: x - 5 * px, top: y - px * 0.4, width: 10 * px, height: px * 0.8, borderRadius: "50%", background: `rgba(0,0,0,${0.14 * op})`}} />
      <svg viewBox="0 0 14 13" width={w} height={h} shapeRendering="crispEdges" style={{position: "absolute", left: x - w / 2, top: y - h, opacity: op, overflow: "visible"}}>
        {G.map(([c, r, v], i) => <rect key={i} x={flip ? 13 - c : c} y={r} width={1.04} height={1.04} fill={tint ? (v === 2 ? EYE : tint) : FILL[v]} />)}
      </svg>
    </>
  );
};
// pixel props on the same grid
const PixArt: React.FC<{rows: string[]; x: number; y: number; px: number; pal: Record<string, string>; op?: number}> = ({rows, x, y, px, pal, op = 1}) => (
  <svg viewBox={`0 0 ${rows[0].length} ${rows.length}`} width={rows[0].length * px} height={rows.length * px} shapeRendering="crispEdges" style={{position: "absolute", left: x, top: y, opacity: op}}>
    {rows.flatMap((row, r) => [...row].map((ch, c) => (pal[ch] ? <rect key={`${r}-${c}`} x={c} y={r} width={1.04} height={1.04} fill={pal[ch]} /> : null)))}
  </svg>
);
const Spark = ({x, y, px = 6, op = 1, col = "#F2C14E"}: {x: number; y: number; px?: number; op?: number; col?: string}) =>
  <PixArt rows={["..y..", "..y..", "yy.yy", "..y..", "..y.."]} x={x - 2.5 * px} y={y - 2.5 * px} px={px} op={op} pal={{y: col}} />;
const Heart = ({x, y, px = 6, op = 1}: {x: number; y: number; px?: number; op?: number}) =>
  <PixArt rows={[".rr.rr.", "rrrrrrr", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."]} x={x - 3.5 * px} y={y - 3 * px} px={px} op={op} pal={{r: "#E0543A"}} />;
const Dots = ({x, y, n, px = 6}: {x: number; y: number; n: number; px?: number}) =>
  <PixArt rows={["kk.kk.kk".slice(0, n * 3 - 1), "kk.kk.kk".slice(0, n * 3 - 1)]} x={x} y={y} px={px} pal={{k: EYE}} />;
const Bang = ({x, y, px = 6, op = 1}: {x: number; y: number; px?: number; op?: number}) =>
  <PixArt rows={[".kkk.", "kwwwk", "kwkwk", "kwkwk", "kwwwk", "kwkwk", "kwwwk", ".kkk.", "..k.."]} x={x} y={y} px={px} op={op} pal={{w: "#fff", k: EYE}} />;
const Check = ({x, y, px = 6, op = 1}: {x: number; y: number; px?: number; op?: number}) =>
  <PixArt rows={[".....g", "....gg", "g..gg.", "gggg..", ".gg..."]} x={x} y={y} px={px} op={op} pal={{g: "#2F9E4F"}} />;
const Dust: React.FC<{x: number; y: number; k: number; px: number; seed: number}> = ({x, y, k, px, seed}) => {
  if (k <= 0 || k >= 1) return null;
  return <>{Array.from({length: 6}, (_, i) => {
    const side = i % 2 ? 1 : -1, n = (i >> 1) + 1, e = 1 - Math.pow(1 - k, 2);
    const dx = side * (18 + n * 16 + ((seed * 7 + i * 13) % 9)) * e, dy = -(8 + n * 5) * Math.sin(Math.PI * k * 0.9), sz = px * (1 - k * 0.7);
    return <div key={i} style={{position: "absolute", left: x + dx - sz / 2, top: y + dy - sz, width: sz, height: sz, background: "#CFC7B6", opacity: 1 - k}} />;
  })}</>;
};

// ── layout (world = the 1080×1920 screen at zoom 1) ──
const WX0 = 40, WX1 = 1040, WTOP = 250, WBOT = 1480, TBAR = 56;
const FS = 30, LH = 46, CW = FS * 0.6, TX = 76;   // terminal font, line height, char width, text x
const CODE_FS = 27, CODE_CW = CODE_FS * 0.6;
const PROMPT_H = 104;
const LANE = 936;

type Placed = {id: string; at: number; kind: "welcome" | "user" | "think" | "text" | "code" | "row"; text: string; h: number; end?: number};

export const Screencast: React.FC<ScreencastProps> = (P) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (P.coverAt ?? frame / fps);
  const B = P.beats.map((b, i) => (i === 0 ? {...b, start: 0} : b));
  const at = (bi: number, word?: string, fallback = 0) => {
    const b = B[bi];
    if (!word) return b.start + fallback;
    const w = P.words.find((x) => x.start >= b.start - 0.05 && x.start < b.end && norm(x.text) === norm(word));
    return w ? w.start : b.start + fallback;
  };
  const bi = (act: SBeat["act"]) => B.findIndex((b) => b.act === act);
  const iPrompt = bi("prompt"), iAns = bi("answer"), iLazy = bi("lazygit"), iEnd = bi("end");
  const tSend = B[iAns].start - 0.05;
  const tSplit = iLazy >= 0 ? B[iLazy].start + 0.55 : 1e9;
  const tMerge = iLazy >= 0 ? B[iLazy].end : 1e9;
  const tEnd = iEnd >= 0 ? B[iEnd].start : 1e9;

  // transcript lines with their appear times
  const L: Placed[] = [{id: "welcome", at: -1, kind: "welcome", text: "", h: 4 * LH + 28}];
  const prompt = B[iPrompt].text || "";
  L.push({id: "user", at: tSend + 0.12, kind: "user", text: `> ${prompt}`, h: LH + 12});
  L.push({id: "think", at: tSend + 0.3, kind: "think", text: "Thinking…", h: LH, end: B[iAns].start + 0.75});
  B.forEach((b, i) => {
    if (b.act !== "answer" && b.act !== "explain" && b.act !== "lazygit") return;
    let k = 0;
    (b.lines || []).forEach((ln, j) => {
      const tt = ln.anchor ? at(i, ln.anchor) - 0.05 : b.start + (i === iAns ? 0.8 : 0.35) + (ln.dt ?? 0) + k * 0.1;
      k++;
      L.push({id: `b${i}l${j}`, at: tt, kind: ln.code ? "code" : ln.row ? "row" : "text", text: ln.code ?? ln.text ?? "", h: ln.code ? LH + 18 : LH + (j === 0 ? 10 : 0)});
    });
    (b.table || []).forEach((row, j) => L.push({id: `b${i}t${j}`, at: at(i, b.spark) + 0.15 + j * 0.22, kind: "row", text: row, h: LH - 4}));
  });
  const visible = (ln: Placed, tt: number) => tt >= ln.at && (ln.end === undefined || tt < ln.end);
  const kSplit = eio(seg(t, tSplit - 0.45, tSplit)) * (1 - eio(seg(t, tMerge - 0.1, tMerge + 0.35)));
  const winBot = (tt: number) => {
    const k = eio(seg(tt, tSplit - 0.45, tSplit)) * (1 - eio(seg(tt, tMerge - 0.1, tMerge + 0.35)));
    return lerp(WBOT, 880, k);
  };
  const promptTop = (tt: number) => winBot(tt) - PROMPT_H - 74;
  const contentTop = WTOP + TBAR + 26;
  const contentH = (tt: number) => L.reduce((a, ln) => a + (visible(ln, tt) ? ln.h * clamp((tt - ln.at) / 0.12) : 0), 0);
  const desired = (tt: number) => Math.max(0, contentTop + contentH(tt) - (promptTop(tt) - 26));
  const scroll = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3].reduce((a, d) => a + desired(t - d), 0) / 7;
  // element registry (world coords): top edge y, x0..x1
  const els: Record<string, {x0: number; x1: number; y: number; kind?: string}> = {};
  {
    let y = contentTop - scroll;
    for (const ln of L) {
      if (!visible(ln, t)) continue;
      const ind = ln.kind === "code" ? 20 : ln.kind === "row" ? 2 * CW : 0;
      const cw = ln.kind === "code" ? CODE_CW : CW;
      els[ln.id] = {x0: TX + ind, x1: TX + ind + ln.text.replace(/`/g, "").length * cw, y: y + (ln.kind === "code" ? 6 : 4), kind: ln.kind};
      y += ln.h * clamp((t - ln.at) / 0.12);
    }
  }
  els.prompt = {x0: TX - 10, x1: WX1 - 36, y: promptTop(t)};
  // lazygit window geometry
  const LZ = {x0: WX0, x1: WX1, top: 920, bot: WBOT};
  const lzIn = kSplit;

  // ── camera keyframes: [time, target(x,y), zoom, duration] ──
  const pos = (id: string, fx = 0.5, dy = 0): [number, number] => {
    const e = els[id]; if (!e) return [540, 860];
    return [lerp(e.x0, e.x1, fx), e.y + dy];
  };
  type K = {t: number; c: () => [number, number]; z: number; d: number};
  const keys: K[] = [{t: -1, c: () => [480, promptTop(t) + 60], z: 1.14, d: 0.5}];
  keys.push({t: tSend, c: () => [540, contentTop + 300], z: 1.0, d: 0.55});
  B.forEach((b, i) => {
    if (b.act === "explain") {
      const first = `b${i}l0`;
      const newest = () => { for (let j = (b.lines || []).length - 1; j >= 0; j--) if (els[`b${i}l${j}`]) return `b${i}l${j}`; return first; };
      keys.push({t: b.start + 0.5, c: () => { const p = pos(newest(), 0.5, 0); return [522, p[1] + 60]; }, z: 1.12, d: 0.35});
      if (b.spot) keys.push({t: at(i, b.spot), c: () => { const p = pos(`b${i}l${(b.lines || []).length - 1}`, 0.4, 20); return [p[0], p[1]]; }, z: 1.3, d: 0.5});
    }
    if (b.act === "lazygit") keys.push({t: tSplit - 0.35, c: () => [540, 1180], z: 1.08, d: 0.3});
    if (b.act === "lazygit" && b.spot) keys.push({t: at(i, b.spot), c: () => [700, 1300], z: 1.25, d: 0.45});
    if (b.act === "end") keys.push({t: b.start, c: () => [540, 960], z: 1.0, d: 0.5});
  });
  keys.sort((a, b) => a.t - b.t);
  const camAt = (tt: number): [number, number, number] => {
    let k = 0;
    while (k + 1 < keys.length && keys[k + 1].t <= tt) k++;
    const cur = keys[k], prev = keys[Math.max(0, k - 1)];
    const e = k === 0 ? 1 : eio(seg(tt, cur.t, cur.t + cur.d));
    const [x0, y0] = prev.c(), [x1, y1] = cur.c();
    let z = lerp(prev.z, cur.z, e), cx = lerp(x0, x1, e), cy = lerp(y0, y1, e);
    z = Math.max(1, z);
    cx = clamp(cx, 540 / z, 1080 - 540 / z); cy = clamp(cy, 960 / z, 1920 - 960 / z);
    return [cx, cy, z];
  };
  const [cx, cy, z] = camAt(t);
  const [px_, py_] = camAt(t - 1 / 30);
  const bx = Math.min(30, Math.max(0, Math.abs((cx - px_) * z) - 14) * 0.45), by = Math.min(30, Math.max(0, Math.abs((cy - py_) * z) - 14) * 0.45);
  const camTf = `translate(540px, 960px) scale(${z}) translate(${-cx}px, ${-cy}px)`;

  // ── mascot tracks: stops land on element top edges ──
  type Stop = {t: number; id: string; fx: number; eyes?: string; arms?: string; walk?: boolean; dyn?: () => number};
  const stops: Stop[] = [];
  const typedK = (tt: number) => clamp(0.55 + (tt - 0) / Math.max(0.6, (tSend - 0.35)) * 0.45);
  const caretX = (tt: number) => TX + 2 * CW + prompt.length * typedK(tt) * CW;
  stops.push({t: -1, id: "prompt", fx: 0, eyes: "l", dyn: () => caretX(t) + 20});
  stops.push({t: tSend + 0.42, id: "user", fx: 0.6, eyes: "d"});
  B.forEach((b, i) => {
    if (b.act === "answer") (b.lines || []).forEach((ln, j) => { if (j > 0) stops.push({t: at(i, ln.anchor) + 0.25 + (j - 1) * 0.0, id: `b${i}l${j}`, fx: 0.86, eyes: "d"}); });
    if (b.act === "answer" && b.spark) stops.push({t: at(i, b.spark), id: `b${i}l${(b.lines || []).length - 1}`, fx: 0.9, eyes: "happy", arms: "up"});
    if (b.act === "explain") {
      stops.push({t: b.start + 0.85, id: `b${i}l0`, fx: 0.92, eyes: "d"});
      (b.lines || []).forEach((ln, j) => { if (j > 0 && ln.anchor) stops.push({t: at(i, ln.anchor) + 0.3, id: `b${i}l${j}`, fx: ln.code ? 0.98 : 0.92, eyes: "l"}); });
      (b.table || []).forEach((_, j) => stops.push({t: at(i, b.spark) + 0.45 + j * 0.42, id: `b${i}t${j}`, fx: 0.25 + j * 0.25, eyes: "d", walk: j > 0}));
    }
    if (b.act === "lazygit") stops.push({t: tSplit - 0.2, id: "prompt", fx: 0.85, eyes: "d"});
    if (b.act === "end") { stops.push({t: b.start + 0.5, id: "endw0", fx: 0.5, eyes: "happy"}); stops.push({t: at(i, P.keyword.toLowerCase(), 0.9) + 0.05, id: "endw1", fx: 0.5, eyes: "happy", arms: "up"}); }
  });
  stops.sort((a, b) => a.t - b.t);
  // end-card word boxes
  const endK = seg(t, tEnd, tEnd + 0.4);
  els.endw0 = {x0: 270, x1: 810, y: 820};
  els.endw1 = {x0: 210, x1: 870, y: 1020};
  const PX = 8;
  const posOf = (s: Stop, tt: number): [number, number] => {
    const e = els[s.id]; if (!e) return [540, 900];
    if (s.dyn) return [Math.min(s.dyn(), e.x1), e.y];
    if (e.kind) return [LANE, e.y]; // the mascot's text-free lane on the right (lines are kept ≤ 44 chars)
    return [lerp(e.x0, e.x1, s.fx), e.y];
  };
  const mascot = (() => {
    let k = 0;
    while (k + 1 < stops.length && stops[k + 1].t <= t) k++;
    const cur = stops[k], next = stops[k + 1];
    const JUMP = 0.42, CROUCH = 0.14;
    const beat = 60 / 104;
    let [x, y] = posOf(cur, t);
    let sq = 0.05 * Math.max(0, 1 - ((t % beat) / 0.18)); // breathe on the beat
    let legs = "stand", eyes = cur.eyes ?? "n", arms = cur.arms ?? "down", flip = false;
    const sinceLand = t - cur.t;
    if (sinceLand >= 0 && sinceLand < 0.32 && k > 0 && !cur.walk) sq = 0.26 * Math.exp(-sinceLand * 9) * Math.cos(sinceLand * 26);
    if (next) {
      const t0 = next.t - JUMP - CROUCH;
      if (next.walk && t >= next.t - 0.4) {
        const kk = seg(t, next.t - 0.4, next.t); const [x1, y1] = posOf(next, t);
        x = lerp(x, x1, kk); y = lerp(y, y1, kk); legs = Math.floor(t * 9) % 2 ? "walkA" : "walkB"; flip = x1 < posOf(cur, t)[0];
      } else if (t >= t0 && t < next.t - JUMP) {
        sq = 0.28 * seg(t, t0, t0 + CROUCH * 0.7); eyes = "u";
      } else if (t >= next.t - JUMP) {
        const kk = seg(t, next.t - JUMP, next.t); const [x1, y1] = posOf(next, t);
        const hgt = 70 + Math.abs(y1 - y) * 0.35;
        const nx = lerp(x, x1, kk), ny = lerp(y, y1, kk) - hgt * 4 * kk * (1 - kk);
        flip = x1 < x; x = nx; y = ny; legs = "tuck"; eyes = "u"; sq = -0.18 * (1 - kk) * (kk < 0.5 ? 1 : 0);
      }
    }
    if (eyes === "n" || eyes === "d" || eyes === "l") { const bl = (t * 1.0 + random(`b${Math.floor(t / 3.1)}`) * 2.5) % 3.1; if (bl < 0.1) eyes = "blink"; }
    x = Math.round(x / (PX / 2)) * (PX / 2); y = Math.round(y / (PX / 2)) * (PX / 2);
    return {x, y, sq, legs, eyes, arms, flip, k, cur};
  })();
  const lastLand = stops[mascot.k];
  // the lazygit twin (cell division): bursts out of the main mascot, lands on the staged line, rides it down
  const iL = iLazy;
  const tStage = iL >= 0 ? at(iL, B[iL].stage ?? "single") : 1e9;
  const twinOn = t > tSplit + 0.1 && t < tMerge + 0.2;

  // ── sound cues ──
  const cues: [number, string][] = [];
  for (let k = 0; k < prompt.length; k++) { const tt = (k / prompt.length - 0.55) / 0.45 * Math.max(0.6, tSend - 0.35); if (tt > 0 && tt < tSend) cues.push([tt, "chip_key"]); }
  cues.push([tSend - 0.08, "chip_key"]);
  stops.forEach((s, k) => { if (k > 0 && s.t > 0.3) { if (!s.walk) { cues.push([s.t - 0.42, "chip_jump"]); cues.push([s.t, "chip_land"]); } else cues.push([s.t - 0.2, "chip_step"]); } });
  L.forEach((ln) => { if (ln.at > 0.3 && (ln.kind === "code" || ln.kind === "text")) cues.push([ln.at, "chip_pop"]); });
  B.forEach((b) => { if (b.chapter) cues.push([b.start - 0.1, "whoosh"]); });
  if (iEnd >= 0) { const tk = at(iEnd, P.keyword.toLowerCase(), 0.9); cues.push([at(iEnd, "comment", 0.2), "chip_note_c5"], [tk, "chip_note_g5"], [tk + 0.25, "chip_note_c6"]); }
  const tPet = tEnd + 2.0;

  // ── render helpers ──
  const lineEl = (ln: Placed) => {
    const e = els[ln.id]; if (!e) return null;
    const a = clamp((t - ln.at) / 0.12);
    const common: React.CSSProperties = {position: "absolute", left: TX, top: e.y - 4, opacity: a, transform: `translateY(${(1 - a) * 10}px)`, whiteSpace: "pre", fontFamily: MONO, fontSize: FS, lineHeight: `${LH}px`};
    if (ln.kind === "welcome") return null;
    if (ln.kind === "user") return <div key={ln.id} style={{...common, color: T.mute, background: T.oat, left: TX - 12, padding: "2px 12px", borderRadius: 8}}>{ln.text}</div>;
    if (ln.kind === "think") {
      const spin = "·✢✳✶✻✽"[Math.floor(t * 8) % 6];
      return <div key={ln.id} style={{...common, color: T.clay}}>{spin} <span style={{color: T.clay2}}>Thinking…</span> <span style={{color: T.faint}}>(esc to interrupt)</span></div>;
    }
    if (ln.kind === "code") {
      const typed = ln.text.slice(0, Math.round(ln.text.length * clamp((t - ln.at) / 0.45)));
      const [cmd, cm] = typed.split("#");
      return <div key={ln.id} style={{...common, left: TX, top: e.y - 6, width: WX1 - 36 - TX, fontSize: CODE_FS, padding: "6px 20px", background: T.oat, borderRadius: 10, border: `1px solid ${T.line}`, color: T.ink}}>
        {cmd}{cm !== undefined && <span style={{color: T.mute}}>#{cm}</span>}</div>;
    }
    if (ln.kind === "row") return <div key={ln.id} style={{...common, left: e.x0, color: ln.text.startsWith("✓") ? T.addI : T.ink2, fontSize: FS * 0.93}}>{ln.text}</div>;
    // assistant text: "⏺ " + spans with `code`
    const parts = ln.text.split("`");
    return <div key={ln.id} style={{...common, color: T.ink}}>{parts.map((p, i) => (i % 2 ? <span key={i} style={{color: T.clay2}}>{p}</span> : <span key={i}>{p.startsWith("⏺") ? <><span style={{color: T.ink}}>⏺</span>{p.slice(1)}</> : p}</span>))}</div>;
  };
  const typed = prompt.slice(0, Math.round(prompt.length * typedK(t)));
  const sent = t >= tSend;

  // HUD state
  const chapB = B.find((b) => b.chapter && t >= b.start + 0.6 && t < b.end);
  const capB = B.find((b) => t >= b.start && t < b.end + 0.05) ?? B[B.length - 1];
  const keyHud = !sent ? {keys: [typed.slice(-1).toUpperCase() || "␣"], label: "typing", dn: Math.floor(t * 14) % 2 === 0}
    : t < tSend + 0.5 ? {keys: ["⏎"], label: "return", dn: true}
    : iL >= 0 && t > tStage - 0.5 && t < tStage + 0.9 ? {keys: [t < tStage ? "a" : "space"], label: t < tStage ? "select lines" : "stage", dn: Math.abs(t - tStage) < 0.15 || Math.abs(t - (tStage - 0.4)) < 0.15}
    : null;
  const wipeB = B.find((b) => b.chapter && t >= b.start - 0.25 && t < b.start + 0.75);

  return (
    <AbsoluteFill style={{background: T.w0, overflow: "hidden"}}>
      <svg width={0} height={0} style={{position: "absolute"}}><filter id="mb" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} /></filter></svg>
      {/* motion blur lives on an untransformed wrapper; the camera transform is inside it */}
      <AbsoluteFill style={{filter: bx > 0.6 || by > 0.6 ? "url(#mb)" : undefined}}>
        <div style={{position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0", transform: camTf}}>
          {/* wallpaper + menubar */}
          <div style={{position: "absolute", left: -600, top: -600, width: 2280, height: 3120, background: `radial-gradient(700px 520px at 900px 1100px, #F3D9C6 0, transparent 70%), radial-gradient(800px 600px at 1500px 2300px, #E7C6AE 0, transparent 70%), radial-gradient(600px 460px at 700px 2800px, #EFE6D2 0, transparent 70%), ${T.w0}`}} />
          <div style={{position: "absolute", left: 0, right: 0, top: 0, height: 44, background: "rgba(250,249,245,.6)", display: "flex", alignItems: "center", gap: 26, padding: "0 30px", fontFamily: INTER, fontSize: 20, fontWeight: 500, color: T.ink2}}>
            <b style={{color: T.ink}}>Terminal</b><span>Shell</span><span>Edit</span><span>View</span><span style={{marginLeft: "auto"}}>9:41</span>
          </div>
          {/* main window: Claude Code in a terminal */}
          <div style={{position: "absolute", left: WX0, top: WTOP, width: WX1 - WX0, height: winBot(t) - WTOP, background: T.ivory, borderRadius: 22, overflow: "hidden",
            boxShadow: "0 0 0 1px rgba(0,0,0,.09), 0 40px 100px rgba(60,40,20,.16), 0 10px 30px rgba(60,40,20,.14)"}}>
            <div style={{height: TBAR, display: "flex", alignItems: "center", padding: "0 22px", borderBottom: `1px solid ${T.line}`, background: T.side, position: "relative"}}>
              {["#EC6A5E", "#F4BF4F", "#61C554"].map((c) => <i key={c} style={{width: 16, height: 16, borderRadius: 8, background: c, marginRight: 10}} />)}
              <span style={{position: "absolute", left: "50%", transform: "translateX(-50%)", fontFamily: INTER, fontWeight: 600, fontSize: 21, color: T.mute}}>~/code — claude</span>
            </div>
          </div>
          {/* transcript (clipped to the window body above the prompt box) */}
          <div style={{position: "absolute", left: WX0, top: WTOP + TBAR, width: WX1 - WX0, height: Math.max(0, promptTop(t) - 18 - WTOP - TBAR), overflow: "hidden"}}>
            <div style={{position: "absolute", left: -WX0, top: -(WTOP + TBAR), width: 1080, height: 1920}}>
              {/* welcome box (real Claude Code welcome text) */}
              <div style={{position: "absolute", left: TX - 14, top: contentTop - scroll, width: WX1 - 36 - TX + 14, height: 4 * LH + 8, border: `2px solid ${T.clay}`, borderRadius: 12,
                padding: "8px 18px", fontFamily: MONO, fontSize: FS * 0.9, lineHeight: `${LH * 0.95}px`, color: T.ink, whiteSpace: "pre"}}>
                <div><span style={{color: T.clay}}>✻</span> Welcome to <b>Claude Code</b>!</div>
                <div style={{color: T.mute}}>{"  /help for help, /status for your"}</div>
                <div style={{color: T.mute}}>{"  current setup"}</div>
                <div style={{color: T.mute}}>{"  cwd: ~/code"}</div>
              </div>
              {L.filter((ln) => visible(ln, t)).map(lineEl)}
            </div>
          </div>
          {/* prompt box */}
          <div style={{position: "absolute", left: TX - 14, top: promptTop(t), width: WX1 - 36 - TX + 14, height: PROMPT_H, borderRadius: 14, border: `2px solid ${sent ? T.line2 : T.faint}`,
            background: "#FFFFFF", fontFamily: MONO, fontSize: FS, display: "flex", alignItems: "center", padding: "0 20px", whiteSpace: "pre", color: T.ink}}>
            <span style={{color: T.mute}}>{"> "}</span>{sent ? "" : typed}
            <span style={{display: "inline-block", width: 3, height: 36, background: T.clay, marginLeft: 2, opacity: Math.floor(t * 2.2) % 2 === 0 || !sent ? 1 : 0}} />
          </div>
          <div style={{position: "absolute", left: TX + 6, top: promptTop(t) + PROMPT_H + 14, fontFamily: MONO, fontSize: FS * 0.8, color: T.faint}}>? for shortcuts</div>
          {/* the message flying up when sent (moving floor) */}
          {t >= tSend - 0.05 && t < tSend + 0.18 && <div style={{position: "absolute", left: TX, top: lerp(promptTop(t) + 30, contentTop + 4 * LH + 40, eo(seg(t, tSend - 0.05, tSend + 0.18))), fontFamily: MONO, fontSize: FS, color: T.mute, whiteSpace: "pre"}}>{`> ${prompt}`}</div>}

          {/* lazygit window: cell division */}
          {lzIn > 0.01 && <LazyGit x0={LZ.x0} x1={LZ.x1} top={LZ.top} bot={LZ.bot} k={lzIn} t={t} tStage={tStage} />}

          {/* end card: karaoke-ball keyword */}
          {endK > 0 && <div style={{position: "absolute", inset: 0, background: `rgba(250,249,245,${0.92 * endK})`}} />}
          {endK > 0 && <EndCard t={t} tEnd={tEnd} keyword={P.keyword} tKey={at(iEnd, P.keyword.toLowerCase(), 0.9)} />}

          {/* sprites (same transform: they scale with the camera) */}
          {<Sprite x={mascot.x} y={mascot.y} px={PX} sq={mascot.sq} legs={mascot.legs} eyes={t > tPet && t < tPet + 0.6 ? "shut" : mascot.eyes} arms={mascot.arms} flip={mascot.flip} />}
          {lastLand && mascot.k > 0 && t - lastLand.t < 0.4 && !lastLand.walk && <Dust x={posOf(lastLand, t)[0]} y={posOf(lastLand, t)[1]} k={seg(t, lastLand.t, lastLand.t + 0.4)} px={6} seed={mascot.k} />}
          {t > tSend + 0.5 && t < B[iAns].start + 0.75 && <Dots x={mascot.x + 60} y={mascot.y - 150} n={1 + (Math.floor(t * 5) % 3)} />}
          {(() => { const s = stops.find((x) => x.arms === "up" && t >= x.t && t < x.t + 0.6); if (!s) return null; const k = seg(t, s.t, s.t + 0.6);
            return <><Spark x={mascot.x - 80 - k * 30} y={mascot.y - 130 - k * 20} op={1 - k} /><Spark x={mascot.x + 80 + k * 30} y={mascot.y - 140 - k * 20} px={5} op={1 - k} /></>; })()}
          {(() => { const s = stops.find((x) => x.id.includes("l") && x.eyes === "l" && t >= x.t && t < x.t + 0.8); if (!s) return null;
            return <Check x={mascot.x + 50} y={mascot.y - 160} op={1 - seg(t, s.t + 0.5, s.t + 0.8)} />; })()}
          {twinOn && <Twin t={t} tSplit={tSplit} tMerge={tMerge} tStage={tStage} from={[mascot.x, mascot.y]} px={PX} />}
          {/* cursor pets the mascot on the end card */}
          {t > tPet - 0.8 && t < tPet + 1.2 && <Cursor x={lerp(900, mascot.x + 10, eo(seg(t, tPet - 0.8, tPet - 0.1)))} y={lerp(1500, mascot.y - 120, eo(seg(t, tPet - 0.8, tPet - 0.1))) + (t > tPet - 0.1 && t < tPet + 0.5 ? Math.sin((t - tPet) * 30) * 6 : 0)} />}
          {t > tPet && t < tPet + 0.9 && <Heart x={mascot.x + 40 + seg(t, tPet, tPet + 0.9) * 16} y={mascot.y - 150 - seg(t, tPet, tPet + 0.9) * 50} op={1 - Math.pow(seg(t, tPet, tPet + 0.9), 2)} />}
        </div>
      </AbsoluteFill>

      {/* spotlight freeze */}
      {B.map((b, i) => {
        if (!b.spot) return null;
        const ts = at(i, b.spot); const op = seg(t, ts, ts + 0.25) * (1 - seg(t, ts + 1.3, ts + 1.6));
        if (op <= 0) return null;
        const sx = 540, sy = b.act === "lazygit" ? 1250 : 980;
        return <div key={i} style={{position: "absolute", inset: 0, opacity: op, background: `radial-gradient(ellipse 560px 300px at ${sx}px ${sy}px, transparent 55%, rgba(25,22,18,.55) 100%)`}} />;
      })}
      {/* information layers */}
      {chapB && !wipeB && <div style={{position: "absolute", left: 40, top: 1490, display: "flex", alignItems: "center", gap: 16, fontFamily: NEWS, fontSize: 40, color: T.ink,
        background: "rgba(250,249,245,.9)", padding: "10px 24px 12px 14px", borderRadius: 18, boxShadow: "0 0 0 1px rgba(0,0,0,.06), 0 8px 28px rgba(60,40,20,.12)", opacity: seg(t, chapB.start + 0.6, chapB.start + 0.8)}}>
        <b style={{fontFamily: INTER, fontSize: 19, fontWeight: 700, color: "#fff", background: T.clay, borderRadius: 9, padding: "6px 11px", letterSpacing: ".04em"}}>{chapB.chapter!.no}</b>{chapB.chapter!.nm}</div>}
      {!P.cover && keyHud && endK === 0 && <div style={{position: "absolute", right: 40, top: 1490, display: "flex", alignItems: "center", gap: 10, fontFamily: INTER, fontSize: 22, fontWeight: 600, color: "#fff",
        background: "rgba(31,30,28,.88)", padding: "12px 16px", borderRadius: 16}}>
        {keyHud.keys.map((k, i) => <i key={i} style={{fontStyle: "normal", minWidth: 50, height: 50, padding: "0 12px", borderRadius: 10, background: keyHud.dn ? T.clay : "#3A3834", display: "grid", placeItems: "center",
          boxShadow: keyHud.dn ? "inset 0 -1px 0 rgba(0,0,0,.4)" : "inset 0 -4px 0 rgba(0,0,0,.4)", transform: keyHud.dn ? "translateY(2px)" : undefined, fontSize: 24}}>{k}</i>)}
        <span style={{marginLeft: 6, color: "#D8D2C6", fontWeight: 500}}>{keyHud.label}</span></div>}
      {!P.cover && capB && capB.act !== "end" && <Caption b={capB} words={P.words} t={t} />}
      {wipeB && <Wipe p={seg(t, wipeB.start - 0.25, wipeB.start + 0.75)} no={wipeB.chapter!.no} nm={wipeB.chapter!.nm} t={t} />}
      {!P.coverAt && <>
        <Audio src={staticFile(`${P.dir}/vo.wav`)} />
        <Audio src={staticFile(`${P.dir}/bed.wav`)} volume={(fr) => { const tt = fr / 30; const talking = P.words.some((w) => tt >= w.start - 0.1 && tt < w.end + 0.15); return talking ? 0.07 : 0.16; }} />
        <Sfx cues={cues} gain={0.55} />
      </>}
      {P.cover && <CoverText kicker={P.cover.kicker} big={P.cover.big} />}
    </AbsoluteFill>
  );
};

// frosted caption pill, bottom; the beat's line, emphasised words in clay
const Caption: React.FC<{b: SBeat; words: Word[]; t: number}> = ({b, words, t}) => {
  const ws = words.filter((w) => w.start >= b.start - 0.05 && w.start < b.end);
  const op = seg(t, b.start, b.start + 0.16);
  const em = new Set((b.em || []).map(norm));
  return (
    <div style={{position: "absolute", left: 40, right: 40, top: 1590, display: "flex", justifyContent: "center", opacity: op, transform: `translateY(${(1 - op) * 10}px)`}}>
      <div style={{maxWidth: 1000, textAlign: "center", fontFamily: INTER, fontSize: 40, fontWeight: 500, lineHeight: 1.28, color: T.ink, background: "rgba(250,249,245,.9)",
        padding: "14px 28px", borderRadius: 20, boxShadow: "0 0 0 1px rgba(0,0,0,.06), 0 8px 28px rgba(60,40,20,.14)"}}>
        {ws.map((w, i) => <span key={i} style={{color: em.has(norm(w.text)) ? T.clay2 : T.ink, opacity: t >= w.start - 0.05 ? 1 : 0.32}}>{w.text} </span>)}
      </div>
    </div>
  );
};

// chapter transition: pixel blocks sweep across, the chapter title, a cream mascot running through
const Wipe: React.FC<{p: number; no: string; nm: string; t: number}> = ({p, no, nm, t}) => {
  const S = 60, cols = 18, rows = 32, pal = ["#D97757", "#CF6E4E", "#E08A6B"];
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const d = (c / cols) * 0.45 + ((rows - r) / rows) * 0.3 + random(`w${c}-${r}`) * 0.12;
    const a = clamp((p / 0.42 - d) / 0.18), b2 = clamp(((p - 0.55) / 0.42 - d) / 0.18), k = a * (1 - b2);
    if (k <= 0) continue;
    const sz = S * k;
    cells.push(<b key={`${r}-${c}`} style={{position: "absolute", left: c * S + (S - sz) / 2, top: r * S + (S - sz) / 2, width: sz + 0.5, height: sz + 0.5, background: pal[Math.floor(random(`p${c}-${r}`) * 3)]}} />);
  }
  const lo = clamp(Math.min((p - 0.3) / 0.12, (0.82 - p) / 0.1));
  return (
    <AbsoluteFill>
      {cells}
      {lo > 0 && <>
        <div style={{position: "absolute", left: 0, right: 0, top: 820, textAlign: "center", color: "#FFF8F0", opacity: lo, transform: `translateY(${(1 - lo) * 16}px)`}}>
          <div style={{fontFamily: MONO, fontSize: 40, fontWeight: 700, letterSpacing: ".2em", opacity: 0.85, marginBottom: 10}}>{no}</div>
          <div style={{fontFamily: NEWS, fontSize: 150, fontWeight: 400, letterSpacing: "-.02em", lineHeight: 1.05}}>{nm}</div>
        </div>
        <Sprite x={140 + p * 800} y={1200} px={8} legs={Math.floor(t * 12) % 2 ? "walkA" : "walkB"} op={lo} tint="#FFF8F0" />
      </>}
    </AbsoluteFill>
  );
};

const Cursor: React.FC<{x: number; y: number}> = ({x, y}) => (
  <svg style={{position: "absolute", left: x - 3, top: y - 3, filter: "drop-shadow(0 2px 3px rgba(0,0,0,.3))"}} width={35} height={48} viewBox="0 0 22 30">
    <path d="M2 2 L2 24 L7.5 18.5 L11 27 L15 25.2 L11.6 17 L19 17 Z" fill="#000" stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

// lazygit, redrawn (real pane names and keys from its README); dark terminal window that splits in below
const LazyGit: React.FC<{x0: number; x1: number; top: number; bot: number; k: number; t: number; tStage: number}> = ({x0, x1, top, bot, k, t, tStage}) => {
  const G = "#8BC48A", DIM = "#8A857A", TXT = "#E8E2D6", BOX = "#4A4640";
  const staged = t >= tStage + 0.25, sel = t >= tStage - 0.4;
  const ride = eo(seg(t, tStage, tStage + 0.35));
  const box = (title: string, x: number, y: number, w: number, h: number, active: boolean, body: React.ReactNode) => (
    <div style={{position: "absolute", left: x, top: y, width: w, height: h, border: `2px solid ${active ? G : BOX}`, borderRadius: 4}}>
      <span style={{position: "absolute", left: 10, top: -16, background: "#1F1D1A", padding: "0 6px", color: active ? G : TXT, fontWeight: 700}}>{title}</span>
      <div style={{padding: "12px 12px", whiteSpace: "pre"}}>{body}</div>
    </div>
  );
  const W = x1 - x0;
  return (
    <div style={{position: "absolute", left: x0, top: top + (1 - k) * 80, width: W, height: bot - top, borderRadius: 18, overflow: "hidden", background: "#1F1D1A", opacity: k,
      transform: `scale(${0.94 + 0.06 * k})`, boxShadow: "0 0 0 1px rgba(0,0,0,.2), 0 30px 80px rgba(60,40,20,.3)", fontFamily: MONO, fontSize: 22, lineHeight: "32px", color: TXT}}>
      <div style={{height: 44, display: "flex", alignItems: "center", padding: "0 16px", background: "#2A2724", color: DIM, fontFamily: INTER, fontSize: 19, fontWeight: 500, position: "relative"}}>
        {["#EC6A5E", "#F4BF4F", "#61C554"].map((c) => <i key={c} style={{width: 14, height: 14, borderRadius: 7, background: c, marginRight: 8}} />)}
        <span style={{position: "absolute", left: "50%", transform: "translateX(-50%)"}}>~/code/app — lazygit</span>
      </div>
      <div style={{position: "relative", height: bot - top - 44}}>
        {box("[1]-Status", 14, 22, 360, 62, false, <span><span style={{color: G}}>✓</span> app → main</span>)}
        {box("[2]-Files", 14, 104, 360, 132, true, <>
          <div style={{color: staged ? G : "#E07A5F"}}>{staged ? "MM" : " M"} <span style={{color: TXT}}>src/timer.ts</span></div>
          <div><span style={{color: "#E07A5F"}}> M</span> README.md</div></>)}
        {box("[3]-Local branches", 14, 256, 360, 62, false, <span><span style={{color: G}}>*</span> main</span>)}
        {box("[4]-Commits", 14, 338, 360, 62, false, <span><span style={{color: "#D9A54A"}}>a1f3c2e</span> fix drift</span>)}
        {box("Unstaged changes", 392, 22, W - 410, 220, false, <>
          <div style={{color: "#7FB6E8"}}>@@ -12,6 +12,7 @@</div>
          <div>{"  const start = now()"}</div>
          <div style={{color: "#E07A5F"}}>{"- let left = total"}</div>
          <div style={{color: G}}>{"+ let left = total - t"}</div>
          {!staged && <div style={{color: G, background: sel ? "#3A4A3A" : undefined}}>{"+ if (left < 0) left = 0"}</div>}
        </>)}
        {box("Staged changes", 392, 262, W - 410, 138, staged, staged ? <div style={{color: G}}>{"+ if (left < 0) left = 0"}</div> : <div style={{color: DIM}}>{" "}</div>)}
        {/* the line riding down to the staged pane */}
        {t >= tStage && t < tStage + 0.35 && <div style={{position: "absolute", left: 404, top: lerp(22 + 12 + 4 * 32, 262 + 12, ride), color: G, background: "#3A4A3A", whiteSpace: "pre"}}>{"+ if (left < 0) left = 0"}</div>}
        <div style={{position: "absolute", left: 14, right: 14, bottom: 10, color: DIM, fontSize: 20}}>Stage: <span style={{color: "#7FB6E8"}}>{"<space>"}</span> | Select lines: <span style={{color: "#7FB6E8"}}>a</span> | Commit: <span style={{color: "#7FB6E8"}}>c</span></div>
      </div>
    </div>
  );
};

// the twin from the cell division: bursts out, lands on the selected diff line, rides it into "Staged changes"
const Twin: React.FC<{t: number; tSplit: number; tMerge: number; tStage: number; from: [number, number]; px: number}> = ({t, tSplit, tMerge, tStage, from, px}) => {
  const lineY = 920 + 44 + 22 + 12 + 4 * 32, stagedY = 920 + 44 + 262 + 12;
  const land = tSplit + 0.65;
  const ride = eo(seg(t, tStage, tStage + 0.35));
  let x = 860, y = lerp(lineY, stagedY, ride), legs = "stand", sq = 0, eyes = t > tStage + 0.3 ? "happy" : "d", arms = t > tStage + 0.3 && t < tStage + 1 ? "up" : "down";
  if (t < land) {
    const k = seg(t, tSplit + 0.15, land);
    x = lerp(from[0], 860, k); y = lerp(from[1], lineY, k) - (90 + Math.abs(lineY - from[1]) * 0.25) * 4 * k * (1 - k); legs = "tuck"; eyes = "u";
  } else if (t - land < 0.3) sq = 0.24 * Math.exp(-(t - land) * 9) * Math.cos((t - land) * 26);
  if (t > tMerge - 0.3) { const k = seg(t, tMerge - 0.3, tMerge + 0.2); x = lerp(x, from[0], k); y = lerp(y, from[1], k) - 80 * 4 * k * (1 - k); legs = "tuck"; }
  const burst = (bx: number, by: number, k: number) => Array.from({length: 14}, (_, i) => {
    const a = random(`a${i}`) * Math.PI * 2, r = (20 + random(`r${i}`) * 70) * eo(k), sz = 7 * (1 - k * 0.6);
    return <div key={i} style={{position: "absolute", left: bx + Math.cos(a) * r, top: by + Math.sin(a) * r * 0.7, width: sz, height: sz, background: i % 3 ? CLAY : "#F2C14E", opacity: 1 - k}} />;
  });
  return (
    <>
      {t > tSplit + 0.1 && t < tSplit + 0.55 && burst(from[0], from[1] - 50, seg(t, tSplit + 0.1, tSplit + 0.55))}
      {t > tMerge + 0.1 && t < tMerge + 0.55 && burst(from[0], from[1] - 50, seg(t, tMerge + 0.1, tMerge + 0.55))}
      {t < tMerge + 0.15 && <Sprite x={Math.round(x / (px / 2)) * (px / 2)} y={Math.round(y / (px / 2)) * (px / 2)} px={px} legs={legs} sq={sq} eyes={eyes} arms={arms} flip={t < land} />}
      {t > tStage + 0.3 && t < tStage + 0.9 && <Spark x={x + 70} y={y - 130} op={1 - seg(t, tStage + 0.6, tStage + 0.9)} />}
    </>
  );
};

// end card: the mascot hops from word to word as they are spoken (karaoke-ball words)
const EndCard: React.FC<{t: number; tEnd: number; keyword: string; tKey: number}> = ({t, tEnd, keyword, tKey}) => {
  const a = seg(t, tEnd + 0.1, tEnd + 0.4), b = seg(t, tKey - 0.05, tKey + 0.2), c = seg(t, tKey + 0.5, tKey + 0.8);
  return (
    <>
      <div style={{position: "absolute", left: 0, right: 0, top: 830, textAlign: "center", fontFamily: NEWS, fontSize: 130, color: T.ink, opacity: a, transform: `translateY(${(1 - a) * 20}px)`}}>Comment</div>
      <div style={{position: "absolute", left: 0, right: 0, top: 1030, textAlign: "center", fontFamily: NEWS, fontStyle: "italic", fontSize: 190, color: T.clay2, opacity: b, transform: `scale(${0.85 + 0.15 * eo(b)})`, letterSpacing: "-.01em"}}>{keyword.toUpperCase()}</div>
      <div style={{position: "absolute", left: 0, right: 0, top: 1300, textAlign: "center", fontFamily: INTER, fontSize: 40, fontWeight: 500, color: T.mute, opacity: c}}>and I'll DM you the links</div>
      <div style={{position: "absolute", left: 0, right: 0, top: 1390, display: "flex", justifyContent: "center", opacity: c}}>
        <span style={{fontFamily: INTER, fontWeight: 700, fontSize: 30, color: T.ink2, background: T.oat, borderRadius: 999, padding: "8px 22px"}}>@itsongit</span></div>
    </>
  );
};

const CoverText: React.FC<{kicker: string; big: string}> = ({kicker, big}) => (
  <AbsoluteFill>
    <AbsoluteFill style={{background: "linear-gradient(rgba(233,225,209,0) 30%, rgba(233,225,209,.0) 50%)"}} />
    <div style={{position: "absolute", left: 60, right: 60, top: 1020, padding: "34px 40px 40px", background: "rgba(250,249,245,.94)", borderRadius: 30, boxShadow: "0 0 0 1px rgba(0,0,0,.06), 0 20px 60px rgba(60,40,20,.18)"}}>
      <div style={{fontFamily: MONO, fontSize: 34, fontWeight: 700, color: T.clay2}}>{kicker}</div>
      <div style={{fontFamily: NEWS, fontSize: 120, lineHeight: 1.0, color: T.ink, marginTop: 10, letterSpacing: "-.02em"}}>{big}</div>
    </div>
  </AbsoluteFill>
);

export const ScreencastCover: React.FC<ScreencastProps> = (p) => <Screencast {...p} coverAt={p.coverAt ?? 1.2} />;
export const screencastDuration = (p: ScreencastProps) => Math.round(p.end * 30);
export const _f = f;
export const _interp = interpolate;
