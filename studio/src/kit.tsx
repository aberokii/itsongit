import React, {createContext, useContext} from "react";
import {AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio, Video} from "@remotion/media";
import {loadFont as loadInter} from "@remotion/google-fonts/Inter";
import {loadFont as loadMono} from "@remotion/google-fonts/JetBrainsMono";
import {accentFor, C, rgba, SAFE, type Accent} from "./brand";

export {C, SAFE, rgba};
export const {fontFamily: INTER} = loadInter("normal", {weights: ["600", "800", "900"], subsets: ["latin"]});
export const {fontFamily: MONO} = loadMono("normal", {weights: ["700"], subsets: ["latin"]});

export const AccentCtx = createContext<Accent>(accentFor(0));
export const useAccent = () => useContext(AccentCtx);

export const FPS = 30;
export const f = (s: number) => Math.round(s * FPS);

// Seconds on the global timeline (inside a Sequence, add its start back).
export const useT = (offset = 0) => useCurrentFrame() / FPS + offset;

// 0→1 spring that starts at `at` seconds. Snappy but not bouncy: kinetic, never jittery.
export const usePop = (at: number, offset = 0, damping = 15) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - (at - offset) * fps, fps, config: {damping, stiffness: 170, mass: 0.8}});
};

// Scene envelope: spring in at the start, quick scale-down fade on the way out.
export const useScene = (dur: number, outLen = 0.22) => {
  const t = useT();
  const inn = usePop(0);
  const out = interpolate(t, [dur - outLen, dur], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return {inn, out, opacity: Math.min(inn * 1.4, 1) * (1 - out)};
};

export const Background: React.FC = () => {
  const t = useT();
  const accent = useAccent();
  const gx = 50 + Math.sin(t * 0.35) * 8;
  const gy = 42 + Math.cos(t * 0.27) * 6;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${gx}% ${gy}%, ${rgba(accent.hex, 0.17)}, transparent 58%),
          radial-gradient(rgba(240,246,252,0.07) 2px, transparent 2px) 0 0 / 44px 44px, ${C.BG}`,
      }}
    />
  );
};

export const Chip: React.FC<{
  at: number;
  offset?: number;
  tone?: "plain" | "accent" | "solid";
  mono?: boolean;
  size?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({at, offset = 0, tone = "plain", mono, size = 46, style, children}) => {
  const p = usePop(at, offset, 12);
  const accent = useAccent();
  const solid = tone === "solid";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: `${size * 0.32}px ${size * 0.6}px`,
        borderRadius: size * 0.5,
        background: solid ? accent.hex : C.CARD,
        border: `3px solid ${tone === "plain" ? C.LINE : accent.hex}`,
        boxShadow: solid ? `0 18px 50px ${rgba(accent.hex, 0.45)}` : "0 18px 40px rgba(0,0,0,0.45)",
        color: solid ? accent.ink : tone === "accent" ? accent.hex : C.TEXT,
        fontFamily: mono ? MONO : INTER,
        fontWeight: 900,
        fontSize: size,
        letterSpacing: mono ? 0 : "-0.02em",
        whiteSpace: "nowrap",
        opacity: Math.min(p * 1.5, 1),
        transform: `translateY(${(1 - p) * 40}px) scale(${0.7 + 0.3 * p})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const PHONE = {width: 560, bezel: 16, status: 64, bar: 92};
export const phoneSize = () => ({w: PHONE.width + PHONE.bezel * 2, h: PHONE.width * 2.06 + PHONE.bezel * 2});

// iPhone-style frame: status bar + screen recording + Safari address bar, so captures read as a phone screen.
export const Phone: React.FC<{src: string; url: string; trimBefore?: number; children?: React.ReactNode}> = ({src, url, trimBefore = 0, children}) => {
  const {width, bezel, status, bar} = PHONE;
  const screenH = width * 2.06;
  return (
    <div
      style={{
        position: "relative",
        width: width + bezel * 2,
        height: screenH + bezel * 2,
        borderRadius: 86,
        padding: bezel,
        background: "linear-gradient(145deg, #2b3038, #12151a)",
        boxShadow: "0 50px 120px rgba(0,0,0,0.65), inset 0 0 0 2px #3a414b",
      }}
    >
      <div style={{position: "relative", width, height: screenH, borderRadius: 70, overflow: "hidden", background: "#000"}}>
        <div style={{height: status, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 44px 0", color: "#fff", fontFamily: INTER, fontWeight: 800, fontSize: 24}}>
          <span>9:41</span>
          <span style={{letterSpacing: 4, fontSize: 20}}>▮▮▮ ◔</span>
        </div>
        <div style={{position: "absolute", top: 16, left: width / 2 - 70, width: 140, height: 40, borderRadius: 20, background: "#000"}} />
        <div style={{position: "absolute", top: status, bottom: bar, left: 0, right: 0, overflow: "hidden"}}>
          <Video src={staticFile(src)} trimBefore={trimBefore} muted style={{width: "100%", display: "block"}} />
        </div>
        <div style={{position: "absolute", bottom: 0, left: 0, right: 0, height: bar, background: "#1c1c1e", display: "flex", justifyContent: "center", paddingTop: 14}}>
          <div style={{width: width - 60, height: 46, borderRadius: 14, background: "#2c2c2e", color: "#fff", fontFamily: INTER, fontWeight: 600, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center"}}>
            {url}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};

export const AppCard: React.FC<{src: string; width?: number; style?: React.CSSProperties}> = ({src, width = 960, style}) => (
  <div style={{width, borderRadius: 26, overflow: "hidden", border: `3px solid ${C.LINE}`, boxShadow: "0 40px 100px rgba(0,0,0,0.6)", background: C.CARD, ...style}}>
    <Img src={staticFile(src)} style={{width: "100%", display: "block"}} />
  </div>
);

export type Word = {text: string; start: number; end: number};
export type Zone = [number, number];

const inZone = (t: number, zones: Zone[]) => zones.some(([a, b]) => t >= a && t < b);

// Word-by-word captions in 1–3 word chunks; the spoken word lights up in the accent.
// Low (under the visuals) by default; big and centred inside `center` zones, where nothing else is on screen.
export const Captions: React.FC<{words: Word[]; center?: Zone[]; hide?: Zone[]}> = ({words, center = [], hide = []}) => {
  const t = useT();
  const {fps} = useVideoConfig();
  const frame = useCurrentFrame();
  const accent = useAccent();
  if (inZone(t, hide)) return null;
  const chunks: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const breakBefore = cur.length >= 3 || (prev && (/[.,!?]$/.test(prev.text) || w.start - prev.end > 0.35));
    if (breakBefore && cur.length) {
      chunks.push(cur);
      cur = [];
    }
    cur.push(w);
  });
  if (cur.length) chunks.push(cur);
  const idx = chunks.findIndex((c, i) => t >= c[0].start && t < (chunks[i + 1]?.[0].start ?? c[c.length - 1].end + 0.5));
  if (idx < 0) return null;
  const chunk = chunks[idx];
  const big = inZone(chunk[0].start + 0.01, center);
  const size = big ? 128 : 82;
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.side,
        right: SAFE.side,
        ...(big ? {top: 0, bottom: 0, alignContent: "center"} : {top: 1530}),
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: big ? "0 30px" : "0 22px",
      }}
    >
      {chunk.map((w, i) => {
        const p = spring({frame: frame - w.start * fps, fps, config: {damping: 13, stiffness: 220}});
        const next = chunk[i + 1]?.start ?? chunks[idx + 1]?.[0].start ?? w.end + 0.3;
        const active = t >= w.start && t < next;
        return (
          <span
            key={i}
            style={{
              fontFamily: INTER,
              fontWeight: 900,
              fontSize: size,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: active ? accent.hex : C.TEXT,
              textShadow: "0 6px 30px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)",
              opacity: t >= w.start ? 1 : 0,
              transform: `translateY(${(1 - p) * (big ? 40 : 26)}px) scale(${(active ? 1.06 : 1) * (big ? 0.85 + 0.15 * p : 1)})`,
              display: "inline-block",
            }}
          >
            {w.text.replace(/[.,]$/, "")}
          </span>
        );
      })}
    </div>
  );
};

const TRIM: Record<string, number> = {whoosh: 0.3, swish: 0.5, pop: 0.7, tick: 0.8, type: 0.8, ding: 0.45, click: 0.4, thud: 0.35, rise: 0.3};
export const Sfx: React.FC<{cues: [number, string][]; gain?: number}> = ({cues, gain = 0.5}) => (
  <>
    {cues.map(([t, file], i) => (
      <Sequence key={i} from={f(t)} durationInFrames={f(1.5)}>
        <Audio src={staticFile(`sfx/${file}.wav`)} volume={gain * (TRIM[file] ?? 0.5)} />
      </Sequence>
    ))}
  </>
);
