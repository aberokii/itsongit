import React from "react";
import {AbsoluteFill, Img, interpolate, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {AccentCtx, f, rgba, Sfx, useAccent, type Word} from "./kit";
import {THEMES, ThemeCtx, useTheme, type ThemeId} from "./themes";
import {accentFor} from "./brand";
import {GitMark} from "./Logo";
import {Mascot, type Mood} from "./Mascot";

// Format C, "story": an animated explainer, not the ad template. Layout grammar (paper theme):
//   y 196  mono header row:  "// 03 — mixxx"  ·  "SERATO → $0"
//   y 262  the spoken line, word-timed, top-left, charcoal; the beat's accent word in tomato italic serif,
//          its `select` word inside a blue Figma-style selection box
//   y 600–1260  the scene (slam / counter / app / versus / list / character / cta) on white cards with warm shadows
//   bottom-right  Kit the cat, big and cut off by the frame edge, reacting per beat with lip sync
// Cuts are whip pans with motion blur; slams land with an impact shake; the first beat owns frame 0 (its whole line
// and scene are on screen at once). pipeline/make.py builds the props from video.json "beats".
type Img2 = {src: string; w: number; h: number};
export type Beat = {
  start: number; end: number;
  scene: "slam" | "counter" | "app" | "versus" | "list" | "character" | "cta" | "terminal" | "rank";
  mood?: Mood;
  text?: string; accent?: string; select?: string; sub?: string;
  from?: number; to?: number; prefix?: string; suffix?: string; label?: string; tone?: "neg" | "accent";
  image?: Img2;
  paid?: string; price?: string; name?: string;
  items?: {label: string; at: number}[];
  cmd?: string; out?: string[]; n?: number; total?: number; stars?: number; // terminal / rank
};
export type StoryProps = {accent: number; dir: string; words: Word[]; beats: Beat[]; keyword: string; end: number; icon?: string;
  name?: string; paid?: string; theme?: ThemeId; mascot?: boolean};
const alpha = (c: string, a: number) => (c.startsWith("#") ? rgba(c, a) : c);

const WHIP = 0.2;
const TOP = 600; // scene area starts below the spoken line
const PILLS = ["#2F6BFF", "#E5462C", "#F2A900", "#14A35A", "#7A4DFF"];
const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9$€£]/g, "");

const useBeat = (b: Beat) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps + b.start;
  const pop = (at: number, damping = 11) => spring({frame: frame - (at - b.start) * fps, fps, config: {damping, stiffness: 190, mass: 0.75}});
  return {t, pop, lt: t - b.start};
};

const Whip: React.FC<{b: Beat; children: React.ReactNode}> = ({b, children}) => {
  const {t} = useBeat(b);
  const first = b.start < 0.2;
  const inn = first ? 0 : interpolate(t, [b.start, b.start + WHIP], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3)});
  const out = interpolate(t, [b.end - 0.12, b.end], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => x * x});
  const blur = (inn + out) * 24;
  const kick = first ? 1 : 1 + 0.05 * interpolate(t, [b.start + WHIP, b.start + WHIP + 0.25], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return <AbsoluteFill style={{transform: `translateX(${inn * 900 - out * 900}px) scale(${kick})`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined}}>{children}</AbsoluteFill>;
};

// Figma-style selection box with corner handles
const Select: React.FC<{children: React.ReactNode; on: number}> = ({children, on}) => {
  const C = useTheme();
  return (
  <span style={{position: "relative", display: "inline-block", padding: "0 10px", margin: "0 -4px"}}>
    <span style={{position: "absolute", inset: "4px 0 -2px", border: `3px solid ${C.SELECT}`, opacity: on, background: rgba(C.SELECT, 0.08)}}>
      {[[-7, -7], [-7, null], [null, -7], [null, null]].map(([l, t], i) => (
        <span key={i} style={{position: "absolute", width: 12, height: 12, background: "#fff", border: `3px solid ${C.SELECT}`,
          left: l ?? undefined, right: l === null ? -7 : undefined, top: t ?? undefined, bottom: t === null ? -7 : undefined}} />
      ))}
    </span>
    <span style={{position: "relative"}}>{children}</span>
  </span>
  );
};

// the spoken line, word by word, top-left (the first beat shows its whole line from frame 0)
const Line: React.FC<{b: Beat; words: Word[]}> = ({b, words}) => {
  const C = useTheme();
  const {t, pop} = useBeat(b);
  const ws = words.filter((w) => w.start >= b.start - 0.05 && w.start < b.end - 0.05);
  const first = b.start < 0.2;
  const n = ws.reduce((a, w) => a + w.text.length + 1, 0);
  const size = (n > 70 ? 58 : n > 48 ? 66 : 76) * C.textScale;
  return (
    <div style={{position: "absolute", top: 262, left: 66, right: 66, fontFamily: C.SANS, fontWeight: 700, fontSize: size, lineHeight: 1.12,
      letterSpacing: "-0.035em", color: C.TEXT, display: "flex", flexWrap: "wrap", gap: "0 0.26em"}}>
      {ws.map((w, i) => {
        const shown = first || t >= w.start - 0.06;
        const p = first ? 1 : pop(w.start - 0.06, 14);
        const word = w.text;
        const isAcc = b.accent && clean(word) === clean(b.accent);
        const isSel = b.select && clean(word) === clean(b.select);
        const body = isAcc
          ? <span style={{fontFamily: C.SERIF, fontStyle: C.serifItalic ? "italic" : "normal", fontWeight: 400, color: C.NEG, fontSize: "1.18em", letterSpacing: "-0.01em", lineHeight: 0.9}}>{word}</span>
          : word;
        return (
          <span key={i} style={{display: "inline-block", opacity: shown ? Math.min(p * 1.6, 1) : 0, transform: `translateY(${(1 - Math.min(p, 1)) * 24}px)`}}>
            {isSel ? <Select on={first ? 1 : pop(w.start + 0.1)}>{body}</Select> : body}
          </span>
        );
      })}
    </div>
  );
};

const Header: React.FC<{i: number; name: string; right: string}> = ({i, name, right}) => {
  const C = useTheme();
  return (
  <div style={{position: "absolute", top: 196, left: 66, right: 66, display: "flex", justifyContent: "space-between", fontFamily: C.MONO, fontWeight: 700,
    fontSize: 25 * C.textScale, color: C.MUTED, letterSpacing: "0.02em"}}>
    <span>{`// ${String(i + 1).padStart(2, "0")} — ${name.toLowerCase()}`}</span>
    <span style={{textTransform: "uppercase"}}>{right}</span>
  </div>
  );
};

const Slam: React.FC<{b: Beat}> = ({b}) => {
  const C = useTheme();
  const {pop, lt} = useBeat(b);
  const words = (b.text || "").split(" ");
  const len = (b.text || "").length;
  const size = len <= 8 ? 230 : len <= 14 ? 170 : len <= 24 ? 130 : 100;
  const first = b.start < 0.2;
  return (
    <div style={{position: "absolute", top: TOP, left: 50, right: 50, height: 620, display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center",
      gap: "0 30px", textAlign: "center", transform: `scale(${1 + lt * 0.015})`}}>
      {words.map((w, i) => {
        const p = first ? 1 + 0.03 * Math.sin(lt * 5 + i) : pop(b.start + 0.05 + i * 0.09, 9);
        const hot = b.accent && clean(w) === clean(b.accent);
        const money = /[$€£]\d|\d+%/.test(w);
        const red = hot || money;
        return (
          <span key={i} style={{display: "inline-block", fontFamily: red ? C.SERIF : C.SANS, fontStyle: red && C.serifItalic ? "italic" : "normal", fontWeight: red ? 400 : 900,
            fontSize: red ? size * 1.25 : size, lineHeight: 1, letterSpacing: red ? "-0.02em" : "-0.055em", color: red ? C.NEG : C.TEXT,
            textShadow: red ? `0 0 70px ${rgba(C.NEG, 0.45)}` : "none",
            opacity: Math.min(p * 2, 1), transform: `scale(${first ? p : 2.2 - 1.2 * Math.min(p, 1.08)}) rotate(${first ? 0 : (1 - Math.min(p, 1)) * (i % 2 ? 8 : -8)}deg)`}}>{w}</span>
        );
      })}
      {b.sub && <div style={{width: "100%", marginTop: 30, fontFamily: C.SANS, fontWeight: 700, fontSize: 52, color: C.MUTED, opacity: first ? 1 : pop(b.start + 0.45)}}>{b.sub}</div>}
    </div>
  );
};

const Counter: React.FC<{b: Beat}> = ({b}) => {
  const C = useTheme();
  const {t, pop} = useBeat(b);
  const accent = useAccent();
  const dur = Math.min(1.4, (b.end - b.start) * 0.7);
  const k = interpolate(t, [b.start + 0.15, b.start + 0.15 + dur], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3)});
  const v = (b.from ?? 0) + ((b.to ?? 0) - (b.from ?? 0)) * k;
  const dec = Math.abs((b.to ?? 0) % 1) > 0 ? 2 : 0;
  const txt = `${b.prefix ?? ""}${v.toLocaleString("en-US", {minimumFractionDigits: dec, maximumFractionDigits: dec})}${b.suffix ?? ""}`;
  const done = pop(b.start + 0.15 + dur, 8);
  const col = b.tone === "accent" ? accent.hex : C.NEG;
  return (
    <div style={{position: "absolute", top: TOP, left: 0, right: 0, height: 620, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: `radial-gradient(circle at 50% 50%, ${rgba(col, 0.22)}, transparent 55%)`}}>
      {b.label && <div style={{fontFamily: C.MONO, fontWeight: 700, fontSize: 34, color: C.MUTED, marginBottom: 10, textTransform: "uppercase", opacity: pop(b.start)}}>{b.label}</div>}
      <div style={{fontFamily: C.SERIF, fontStyle: C.serifItalic ? "italic" : "normal", fontSize: txt.length > 7 ? 230 : 290, lineHeight: 1, color: col, letterSpacing: "-0.02em",
        fontVariantNumeric: "tabular-nums", textShadow: `0 0 90px ${rgba(col, 0.5)}`, transform: `scale(${1 + 0.12 * Math.sin(Math.min(done, 1) * Math.PI)})`}}>{txt}</div>
      {b.sub && <div style={{fontFamily: C.SANS, fontWeight: 800, fontSize: 54, color: C.TEXT, marginTop: 10, opacity: done}}>{b.sub}</div>}
    </div>
  );
};

const App: React.FC<{b: Beat}> = ({b}) => {
  const C = useTheme();
  const {lt, pop} = useBeat(b);
  const accent = useAccent();
  if (!b.image) return null;
  const p = pop(b.start);
  return (
    <>
      <div style={{position: "absolute", top: TOP + 10, left: 60, width: 960, height: 640, borderRadius: C.radius, overflow: "hidden", background: C.CARD,
        border: `2px solid ${C.LINE}`, boxShadow: `0 40px 90px ${C.SHADOW}`, transform: `rotate(${(1 - p) * -4}deg)`}}>
        <div style={{height: 44, background: C.dark ? "rgba(255,255,255,0.05)" : "#F7F5F1", borderBottom: `2px solid ${C.LINE}`, display: "flex", alignItems: "center", gap: 10, paddingLeft: 20}}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{width: 14, height: 14, borderRadius: 7, background: c}} />)}
        </div>
        <Img src={staticFile(b.image.src)} style={{width: "100%", height: 596, objectFit: "cover", objectPosition: "50% 30%", transform: `scale(${1.2 + lt * 0.04}) translateX(${-lt * 10}px)`}} />
      </div>
      {b.text && <div style={{position: "absolute", top: TOP - 22, right: 80, padding: "10px 30px 14px", borderRadius: 999, background: accent.hex, color: accent.ink,
        fontFamily: C.SANS, fontWeight: 900, fontSize: 48, boxShadow: `0 14px 34px ${rgba(accent.hex, 0.35)}`, transform: `scale(${pop(b.start + 0.25, 9)}) rotate(3deg)`}}>{b.text}</div>}
    </>
  );
};

const Versus: React.FC<{b: Beat; dir: string; icon?: string}> = ({b, dir, icon}) => {
  const C = useTheme();
  const {t, pop} = useBeat(b);
  const accent = useAccent();
  const tip = interpolate(t, [b.start + 0.6, b.start + 1.3], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3)});
  const ang = -12 * tip + Math.sin(t * 6) * 2 * (1 - tip);
  const vs = pop(b.start + 0.3, 8);
  const card = (children: React.ReactNode, top: number, left: number, p: number) => (
    <div style={{position: "absolute", top, left, width: 400, padding: "26px 20px", borderRadius: 30, background: C.CARD, border: `2px solid ${C.LINE}`,
      boxShadow: `0 24px 60px ${C.SHADOW}`, display: "flex", flexDirection: "column", alignItems: "center", opacity: p, transform: `scale(${0.8 + 0.2 * p})`}}>{children}</div>
  );
  return (
    <div style={{position: "absolute", top: TOP, left: 0, right: 0, height: 660}}>
      <div style={{position: "absolute", top: 440, left: 140, width: 800, height: 14, borderRadius: 7, background: C.TEXT, transform: `rotate(${-ang}deg)`}} />
      <div style={{position: "absolute", top: 452, left: 527, width: 26, height: 230, background: C.TEXT, borderRadius: 8}} />
      {card(<>
        <div style={{fontFamily: C.SANS, fontWeight: 800, fontSize: 44, color: C.TEXT, textAlign: "center"}}>{b.paid}</div>
        <div style={{position: "relative", fontFamily: C.SERIF, fontStyle: C.serifItalic ? "italic" : "normal", fontSize: (b.price || "").length > 7 ? 96 : 116, color: C.NEG, whiteSpace: "nowrap"}}>
          {b.price}
          <div style={{position: "absolute", left: -8, right: -8, top: "52%", height: 10, borderRadius: 5, background: C.TEXT, transformOrigin: "left", transform: `scaleX(${tip}) rotate(-6deg)`}} />
        </div>
      </>, 170 - tip * 85, 50, pop(b.start))}
      {card(<>
        {icon ? <Img src={staticFile(`${dir}/${icon}`)} style={{width: 96, height: 96, borderRadius: 22}} /> : <GitMark size={96} fg={C.TEXT} accent={accent.hex} />}
        <div style={{fontFamily: C.SANS, fontWeight: 800, fontSize: 44, color: C.TEXT}}>{b.name}</div>
        <div style={{fontFamily: C.SERIF, fontStyle: C.serifItalic ? "italic" : "normal", fontSize: 116, lineHeight: 1, color: accent.hex}}>$0</div>
      </>, 40 + tip * 85, 630, pop(b.start + 0.15))}
      <div style={{position: "absolute", top: 520, left: 0, right: 0, textAlign: "center", fontFamily: C.SANS, fontWeight: 900, fontSize: 120, color: C.NEG,
        letterSpacing: "-0.05em", opacity: Math.min(vs * 2, 1), transform: `scale(${2 - Math.min(vs, 1)}) rotate(-6deg)`}}>VS</div>
    </div>
  );
};

const List: React.FC<{b: Beat}> = ({b}) => {
  const C = useTheme();
  const {pop} = useBeat(b);
  return (
    <div style={{position: "absolute", top: TOP + 40, left: 70, right: 70, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 34}}>
      {(b.items || []).map((it, i) => {
        const p = pop(it.at, 10);
        const c = PILLS[i % PILLS.length];
        return (
          <div key={i} style={{display: "flex", alignItems: "center", gap: 22, padding: "18px 40px 22px 22px", borderRadius: 999, background: c, color: c === "#F2A900" ? C.TEXT : "#fff",
            boxShadow: `0 18px 40px ${rgba(c, 0.35)}`, fontFamily: C.SANS, fontWeight: 900, fontSize: it.label.length > 16 ? 60 : 72, letterSpacing: "-0.03em",
            opacity: Math.min(p * 1.6, 1), transform: `translateX(${(1 - p) * 300}px) rotate(${(i % 2 ? 2 : -2) * p}deg)`, marginLeft: i * 40}}>
            <span style={{width: 70, height: 70, borderRadius: 35, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44}}>✓</span>
            {it.label}
          </div>
        );
      })}
    </div>
  );
};

const Bubble: React.FC<{b: Beat}> = ({b}) => {
  const C = useTheme();
  const {pop} = useBeat(b);
  const p = pop(b.start + 0.1, 9);
  if (!b.text) return null;
  return (
    <div style={{position: "absolute", top: TOP + 10, left: 80, right: 80, display: "flex", justifyContent: "center", opacity: Math.min(p * 2, 1),
      transform: `scale(${0.6 + 0.4 * Math.min(p, 1.05)}) rotate(-2deg)`, transformOrigin: "50% 100%"}}>
      <div style={{position: "relative", padding: "32px 46px", borderRadius: 46, background: C.CARD, border: `4px solid ${C.TEXT}`, color: C.TEXT, fontFamily: C.SANS, fontWeight: 900,
        fontSize: b.text.length > 30 ? 66 : 82, letterSpacing: "-0.03em", lineHeight: 1.05, textAlign: "center", boxShadow: `0 24px 60px ${C.SHADOW}`}}>
        {b.text}
        <div style={{position: "absolute", bottom: -40, left: "58%", width: 50, height: 50, background: C.CARD, borderRight: `4px solid ${C.TEXT}`, borderBottom: `4px solid ${C.TEXT}`, transform: "rotate(45deg) skew(10deg, 10deg)"}} />
      </div>
    </div>
  );
};

const Cta: React.FC<{b: Beat; keyword: string}> = ({b, keyword}) => {
  const C = useTheme();
  const {t, pop} = useBeat(b);
  const accent = useAccent();
  const a = pop(b.start), m = pop(b.start + 0.35, 8), c = pop(b.start + 1.0);
  const wig = Math.sin((t - b.start) * 9) * 3 * Math.max(0, 1 - (t - b.start - 0.6) / 1.2);
  const kw = keyword.toUpperCase();
  return (
    <AbsoluteFill style={{alignItems: "center"}}>
      <div style={{position: "absolute", top: TOP - 20, fontFamily: C.SANS, fontWeight: 900, fontSize: 120, letterSpacing: "-0.05em", color: C.TEXT, opacity: a}}>Comment</div>
      <div style={{position: "absolute", top: TOP + 150, padding: "8px 64px 20px", borderRadius: 44, background: accent.hex, color: accent.ink, fontFamily: C.SANS, fontWeight: 900,
        fontSize: kw.length > 5 ? 180 : 230, letterSpacing: "-0.05em", lineHeight: 1.05, boxShadow: `0 30px 80px ${rgba(accent.hex, 0.4)}`,
        opacity: Math.min(m * 1.5, 1), transform: `scale(${0.4 + 0.6 * m}) rotate(${wig - 2}deg)`}}>{kw}</div>
      <div style={{position: "absolute", top: TOP + 480, padding: "14px 30px", borderRadius: 999, background: C.CARD, border: `2px solid ${C.LINE}`, fontFamily: C.SANS, fontWeight: 800,
        fontSize: 46, color: C.TEXT, opacity: c, boxShadow: `0 12px 30px ${C.SHADOW}`}}>💬 I'll DM you the link</div>
    </AbsoluteFill>
  );
};

// ── developer scenes ──
// terminal: a command typed live (frame 0 of the first beat is already mid-typing), then its output line by line
const typeDur = (b: Beat) => Math.min(1.0, (b.end - b.start) * 0.4, 0.035 * (b.cmd || "").length + 0.25);
const lineColor = (l: string, C: ReturnType<typeof useTheme>, acc: string) =>
  /^\s*[+✓✔]/.test(l) ? (C.id === "crt" ? C.NEG : "#3FB950") : /^\s*[-✗✕]/.test(l) ? (C.id === "crt" ? C.MUTED : "#FF6B6B")
    : /^\s*(#|\/\/)/.test(l) ? C.MUTED : /^\s*[>→★]/.test(l) ? acc : C.dark ? C.TEXT : "#E8EAF0";
const Terminal: React.FC<{b: Beat}> = ({b}) => {
  const C = useTheme();
  const accent = useAccent();
  const {t, pop} = useBeat(b);
  const first = b.start < 0.2;
  const cmd = b.cmd || "";
  const td = typeDur(b);
  const k0 = first ? 0.45 : 0;
  const k = Math.min(1, k0 + (1 - k0) * Math.max(0, (t - b.start - (first ? 0 : 0.12)) / td));
  const shown = cmd.slice(0, Math.round(cmd.length * k));
  const doneAt = b.start + (first ? 0 : 0.12) + td * (1 - k0);
  const out = b.out || [];
  const crt = C.id === "crt";
  const term = crt ? "transparent" : C.id === "blueprint" ? "rgba(13,17,22,0.35)" : "#0E1014";
  const size = cmd.length > 34 ? 42 : cmd.length > 20 ? 50 : 60;
  const fs = crt ? size * 1.35 : size;
  const outFs = crt ? size * 1.15 : size * 0.86;
  const lines = (s: string, f: number) => Math.max(1, Math.ceil((s.length + 2) * f * 0.6 / 920));
  const contentH = 52 + 52 + lines(cmd, fs) * fs * 1.32 + out.reduce((a, l) => a + lines(l, outFs) * outFs * 1.32, 0) + (out.length ? 10 : 0) + (b.text ? 90 : 20);
  const boxH = Math.max(C.id === "paper" ? 360 : 420, Math.min(C.id === "paper" ? 700 : 900, contentH));
  const boxTop = C.id === "paper" ? TOP - 10 : Math.max(TOP - 10, 1010 - boxH / 2);
  const caret = Math.floor(t * 2.2) % 2 === 0 || k < 1;
  const p = first ? 1 : pop(b.start, 13);
  return (
    <div style={{position: "absolute", top: boxTop, left: 50, width: 980, height: boxH, borderRadius: C.radius, overflow: "hidden", background: term,
      border: crt ? `3px double ${C.LINE}` : `2px solid ${C.dark ? C.LINE : "#2A2E37"}`, boxShadow: C.dark ? undefined : `0 40px 90px ${C.SHADOW}`,
      transform: `scale(${0.9 + 0.1 * Math.min(p, 1)})`, opacity: Math.min(p * 1.5, 1)}}>
      <div style={{height: 52, display: "flex", alignItems: "center", gap: 12, padding: "0 22px", borderBottom: `2px solid ${crt ? C.LINE : "rgba(255,255,255,0.08)"}`,
        fontFamily: C.MONO, fontSize: crt ? 34 : 24, color: crt ? C.TEXT : "#8A90A0"}}>
        {!crt && ["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{width: 15, height: 15, borderRadius: 8, background: c}} />)}
        <span style={{marginLeft: crt ? 0 : 14}}>{crt ? "[ tty1 ] ~/code" : "~/code — zsh"}</span>
      </div>
      <div style={{padding: "26px 30px", fontFamily: C.MONO, fontSize: fs, lineHeight: 1.32, fontWeight: 700, whiteSpace: "pre-wrap", wordBreak: "break-word"}}>
        <div style={{color: crt ? C.TEXT : "#E8EAF0"}}>
          <span style={{color: accent.hex}}>{crt ? "> " : "❯ "}</span>{shown}
          {(t < doneAt + 0.05 || out.length === 0) && <span style={{opacity: caret ? 1 : 0, background: crt ? C.TEXT : "#E8EAF0", marginLeft: 2}}>{" "}</span>}
        </div>
        {out.map((l, i) => {
          const at = doneAt + 0.12 + i * 0.14;
          if (t < at) return null;
          const q = Math.min(1, (t - at) / 0.08);
          return <div key={i} style={{color: lineColor(l, C, accent.hex), opacity: q, fontSize: outFs, marginTop: i ? 0 : 10}}>{l}</div>;
        })}
      </div>
      {b.text && <div style={{position: "absolute", right: 26, bottom: 26, padding: "10px 26px 14px", borderRadius: C.radius ? 999 : 0, background: accent.hex, color: accent.ink,
        fontFamily: C.SANS, fontWeight: 900, fontSize: crt ? 56 : 44, textShadow: "none", transform: `scale(${pop(doneAt + 0.3, 9)}) rotate(-2deg)`}}>{b.text}</div>}
    </div>
  );
};

// rank: a numbered listicle card "01 / 03", the repo name slammed big, a one-liner and the stars locking digit by digit
const Rank: React.FC<{b: Beat}> = ({b}) => {
  const C = useTheme();
  const accent = useAccent();
  const {t, pop} = useBeat(b);
  const first = b.start < 0.2;
  const a = first ? 1 : pop(b.start, 9), nm = first ? 1 : pop(b.start + 0.12, 10), sb = first ? 1 : pop(b.start + 0.4);
  const target = (b.stars ?? 0).toLocaleString("en-US");
  const fr = Math.round((t - b.start) * 30);
  let dig = 0;
  const stars = target.split("").map((ch) => {
    if (!/\d/.test(ch)) return ch;
    const lock = 8 + (dig++) * 3;
    return fr >= lock ? ch : "0123456789"[Math.floor(random(`${b.start}-${dig}-${fr}`) * 10)];
  }).join("");
  const name = b.text || "";
  return (
    <div style={{position: "absolute", top: C.id === "paper" ? TOP - 40 : TOP + 60, left: 66, right: 66, height: 700}}>
      <div style={{display: "flex", alignItems: "baseline", gap: 14, opacity: Math.min(a * 2, 1), transform: `translateY(${(1 - Math.min(a, 1)) * -60}px)`}}>
        <span style={{fontFamily: C.NUM, fontWeight: 800, fontSize: 250, lineHeight: 0.9, color: accent.hex, letterSpacing: "-0.05em",
          textShadow: C.id === "paper" ? "none" : C.glow(accent.hex)}}>{String(b.n ?? 1).padStart(2, "0")}</span>
        <span style={{fontFamily: C.MONO, fontWeight: 700, fontSize: 70, color: C.MUTED}}>/ {String(b.total ?? 3).padStart(2, "0")}</span>
      </div>
      <div style={{fontFamily: C.DISPLAY, fontWeight: 900, fontSize: name.length > 9 ? 150 : 190, lineHeight: 1, letterSpacing: "-0.05em", color: C.TEXT, marginTop: 10,
        transform: `scale(${first ? 1 : 1.6 - 0.6 * Math.min(nm, 1.05)})`, transformOrigin: "0 50%", opacity: Math.min(nm * 2, 1)}}>{name}</div>
      {b.sub && <div style={{fontFamily: C.SANS, fontWeight: 800, fontSize: 56, lineHeight: 1.15, color: C.MUTED, marginTop: 24, maxWidth: 900, opacity: sb}}>{b.sub}</div>}
      {b.stars ? <div style={{display: "inline-flex", gap: 14, alignItems: "center", marginTop: 34, padding: "12px 30px", borderRadius: C.radius ? 999 : 0,
        border: `3px solid ${C.LINE}`, background: C.CARD, fontFamily: C.MONO, fontWeight: 700, fontSize: 56, color: C.TEXT, fontVariantNumeric: "tabular-nums", opacity: sb}}>
        <span style={{color: "#F2A900"}}>★</span>{stars}</div> : null}
    </div>
  );
};

export const Story: React.FC<StoryProps> = (props) => {
  const C = THEMES[props.theme ?? "paper"];
  const showKit = props.mascot ?? C.id === "paper";
  const acc = C.accentOverride ? {...accentFor(props.accent), hex: C.accentOverride, ink: C.BG} : accentFor(props.accent);
  const p = {...props, beats: props.beats.map((b, i) => (i === 0 ? {...b, start: 0} : b))};
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const cur = p.beats.find((b) => t >= b.start && t < b.end) ?? p.beats[p.beats.length - 1];
  const idx = p.beats.indexOf(cur);
  const slam = p.beats.find((b, i) => i > 0 && b.scene === "slam" && t >= b.start + 0.12 && t < b.start + 0.42);
  const sh = slam ? Math.max(0, 1 - (t - slam.start - 0.12) / 0.3) * 14 : 0;
  const shake = sh ? `translate(${Math.sin(t * 90) * sh}px, ${Math.cos(t * 77) * sh}px)` : undefined;
  const big = cur.scene === "character";
  const prevBig = idx > 0 && p.beats[idx - 1].scene === "character";
  const sp = spring({frame: frame - cur.start * fps, fps, config: {damping: 13, stiffness: 160, mass: 0.8}});
  const k = big ? (prevBig ? 1 : sp) : prevBig ? 1 - sp : 0;
  const right = p.paid ? `${p.paid} → $0` : "free & open source";
  const cues: [number, string][] = p.beats.flatMap((b, i): [number, string][] => [
    ...(i ? [[b.start - 0.04, "whoosh"] as [number, string]] : []),
    ...(b.scene === "slam" ? [[b.start + 0.1, "thud"] as [number, string]] : []),
    ...(b.scene === "counter" ? [[b.start + 0.15 + Math.min(1.4, (b.end - b.start) * 0.7), "ding"] as [number, string]] : []),
    ...(b.scene === "versus" ? [[b.start + 0.3, "thud"] as [number, string]] : []),
    ...(b.scene === "character" ? [[b.start + 0.1, "pop"] as [number, string]] : []),
    ...(b.items || []).map((it): [number, string] => [it.at, "pop"]),
    ...(b.scene === "rank" ? [[b.start + 0.1, "thud"] as [number, string], [b.start + 0.95, "ding"] as [number, string]] : []),
    ...(b.scene === "terminal" ? [[b.start + typeDur(b) + 0.05, "pop"] as [number, string]] : []),
  ]);
  return (
    <ThemeCtx.Provider value={C}>
    <AccentCtx.Provider value={acc}>
      <AbsoluteFill style={{background: C.BG, textShadow: C.glow(C.TEXT)}}>
        <C.Bg />
        <AbsoluteFill style={{transform: shake}}>
          <Header i={idx} name={p.name || "itsongit"} right={right} />
          {p.beats.map((b, i) => (
            <Sequence key={i} from={f(b.start)} durationInFrames={Math.max(1, f(b.end) - f(b.start))} name={`${i}-${b.scene}`}>
              <Whip b={b}>
                {b.scene !== "cta" && <Line b={b} words={p.words} />}
                {b.scene === "slam" && <Slam b={b} />}
                {b.scene === "counter" && <Counter b={b} />}
                {b.scene === "app" && <App b={b} />}
                {b.scene === "versus" && <Versus b={b} dir={p.dir} icon={p.icon} />}
                {b.scene === "list" && <List b={b} />}
                {b.scene === "character" && <Bubble b={b} />}
                {b.scene === "cta" && <Cta b={b} keyword={p.keyword} />}
                {b.scene === "terminal" && <Terminal b={b} />}
                {b.scene === "rank" && <Rank b={b} />}
              </Whip>
            </Sequence>
          ))}
          {/* Kit: big in the bottom-right, cut off by the frame edge; centre stage on character beats */}
          {showKit && <div style={{position: "absolute", left: 560 + (250 - 560) * k, top: 1270 + (1060 - 1270) * k}}>
            <Mascot words={p.words} mood={cur.mood ?? (big ? "excited" : "neutral")} moodAt={cur.start} size={560 + 60 * k} />
          </div>}
        </AbsoluteFill>
        <div style={{position: "absolute", bottom: 210, left: 66, display: "flex", alignItems: "center", gap: 10, padding: "8px 20px 8px 10px",
          background: alpha(C.CARD, 0.9), border: `2px solid ${C.LINE}`, borderRadius: C.radius ? 999 : 0}}>
          <GitMark size={40} fg={C.TEXT} accent={acc.hex} />
          <span style={{fontFamily: C.SANS, fontWeight: 900, fontSize: 30, color: C.TEXT}}>@itsongit</span>
        </div>
        <Audio src={staticFile(`${p.dir}/vo.wav`)} />
        <Sfx cues={cues} />
        <C.Overlay />
      </AbsoluteFill>
    </AccentCtx.Provider>
    </ThemeCtx.Provider>
  );
};
