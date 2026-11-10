import React from "react";
import {AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {loadFont as loadBrush} from "@remotion/google-fonts/CaveatBrush";
import {loadFont as loadHand} from "@remotion/google-fonts/Caveat";
import {AccentCtx, f, INTER, rgba, Sfx, useAccent, type Word} from "./kit";
import {accentFor} from "./brand";
import {GitMark} from "./Logo";
import type {Beat, StoryProps} from "./Story";

// Format "paint": the story beat structure (slam / versus / app / list / counter / character / cta) in a painted,
// watercolour look. No mascot. Layout grammar mirrors Story.tsx so make.py's beats drive both:
//   y 190  hand-written header ("no. 03 · mixxx"  ·  "Serato → $0")
//   y 262  the spoken line, word-timed (Inter for legibility); accent word in tomato brush script with a painted
//          underline; the `select` word gets an ochre highlighter swipe
//   y 600–1300  the scene on painted daubs (rough brush edges via SVG displacement)
// Cuts are paint-stroke wipes (a broad brush band sweeps across and reveals the next scene); slams splatter.
const {fontFamily: BRUSH} = loadBrush("normal", {weights: ["400"], subsets: ["latin"]});
const {fontFamily: HAND} = loadHand("normal", {weights: ["700"], subsets: ["latin"]});

const P = {
  PAPER: "#F3ECDF", INK: "#2A251F", MUTED: "#7A6F62", TOMATO: "#D9472B", OCHRE: "#E6A93A", TEAL: "#3C8C86",
  BLUE: "#3557A6", ROSE: "#C9577A", CARD: "#FBF7EF",
};
const PIGMENTS = [P.TOMATO, P.TEAL, P.OCHRE, P.BLUE, P.ROSE];
const TOP = 600;
const WIPE = 0.42;
const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9$€£]/g, "");

const useBeat = (b: Beat) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps + b.start;
  const pop = (at: number, damping = 12) => spring({frame: frame - (at - b.start) * fps, fps, config: {damping, stiffness: 170, mass: 0.8}});
  return {t, pop, lt: t - b.start};
};

// SVG filters shared by every painted element (CSS `filter: url(#…)` works on HTML in Chrome)
const Defs: React.FC = () => (
  <svg width={0} height={0} style={{position: "absolute"}}>
    <defs>
      <filter id="p-rough" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.032" numOctaves={3} seed={4} />
        <feDisplacementMap in="SourceGraphic" scale={16} xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="p-wash" x="-30%" y="-30%" width="160%" height="160%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={4} seed={9} />
        <feDisplacementMap in="SourceGraphic" scale={70} xChannelSelector="R" yChannelSelector="G" />
        <feGaussianBlur stdDeviation={3} />
      </filter>
      <filter id="p-bristle" x="-5%" y="-30%" width="110%" height="160%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9 0.012" numOctaves={2} seed={2} result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.25" result="streaks" />
        <feComposite in="SourceGraphic" in2="streaks" operator="in" result="s" />
        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={7} />
        <feDisplacementMap in="s" scale={22} xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="p-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} seed={1} />
        <feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 0.55 0" />
      </filter>
    </defs>
  </svg>
);

// a painted patch: rough-edged pigment behind its children (the text itself stays crisp)
const Daub: React.FC<{color: string; style?: React.CSSProperties; inset?: number; wet?: boolean; children?: React.ReactNode; radius?: number}> = ({
  color, style, inset = 0, wet, children, radius = 26}) => (
  <div style={{position: "relative", ...style}}>
    <div style={{position: "absolute", inset: -inset, borderRadius: radius, background: color, filter: `url(#${wet ? "p-wash" : "p-rough"})`}} />
    <div style={{position: "absolute", inset: -inset + 10, borderRadius: radius, background: `radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.28), transparent 60%)`,
      filter: "url(#p-rough)"}} />
    <div style={{position: "relative"}}>{children}</div>
  </div>
);

const Background: React.FC<{accent: string}> = ({accent}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const blob = (x: number, y: number, w: number, h: number, c: string, o: number, ph: number) => (
    <div style={{position: "absolute", left: x + Math.sin(t * 0.25 + ph) * 30, top: y + Math.cos(t * 0.2 + ph) * 24, width: w, height: h, borderRadius: "50%",
      background: c, opacity: o, filter: "url(#p-wash)", mixBlendMode: "multiply"}} />
  );
  return (
    <AbsoluteFill style={{background: P.PAPER, overflow: "hidden"}}>
      {blob(-260, -180, 900, 760, accent, 0.16, 0)}
      {blob(560, 1380, 760, 640, P.OCHRE, 0.14, 2)}
      {blob(700, 380, 520, 420, P.ROSE, 0.07, 4)}
      {blob(-200, 1100, 600, 520, P.TEAL, 0.08, 1)}
      <AbsoluteFill style={{filter: "url(#p-grain)", background: "#fff", opacity: 0.55, mixBlendMode: "multiply"}} />
      <AbsoluteFill style={{background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(90,70,40,0.16) 100%)"}} />
    </AbsoluteFill>
  );
};

// the cut: a broad brush band sweeps left→right; the new scene is revealed behind its leading edge
const Wipe: React.FC<{b: Beat; color: string; children: React.ReactNode}> = ({b, color, children}) => {
  const {t} = useBeat(b);
  const first = b.start < 0.2;
  const k = first ? 1 : interpolate(t, [b.start, b.start + WIPE], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 2.4)});
  const out = interpolate(t, [b.end - 0.1, b.end], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const edge = -500 + k * 2300; // leading edge of the band, px
  return (
    <>
      <AbsoluteFill style={{clipPath: first ? undefined : `polygon(0 0, ${edge + 220}px 0, ${edge - 160}px 100%, 0 100%)`, opacity: out}}>{children}</AbsoluteFill>
      {!first && k < 1 && (
        <div style={{position: "absolute", top: -200, height: 2400, left: edge - 300, width: 420, background: color, transform: "skewX(-11deg)",
          filter: "url(#p-bristle)", opacity: 0.92}} />
      )}
    </>
  );
};

const Header: React.FC<{i: number; name: string; right: string}> = ({i, name, right}) => (
  <div style={{position: "absolute", top: 178, left: 66, right: 66, display: "flex", justifyContent: "space-between", fontFamily: HAND, fontWeight: 700,
    fontSize: 44, color: P.MUTED}}>
    <span>{`no. ${String(i + 1).padStart(2, "0")} · ${name.toLowerCase()}`}</span>
    <span>{right}</span>
  </div>
);

const Underline: React.FC<{on: number; color: string}> = ({on, color}) => (
  <svg viewBox="0 0 200 24" preserveAspectRatio="none" style={{position: "absolute", left: -6, right: -6, bottom: -14, width: "calc(100% + 12px)", height: 26, overflow: "visible"}}>
    <path d="M4 16 C 50 6, 120 22, 196 9" stroke={color} strokeWidth={9} strokeLinecap="round" fill="none" pathLength={1}
      strokeDasharray={1} strokeDashoffset={1 - on} style={{filter: "url(#p-rough)"}} />
  </svg>
);

const Line: React.FC<{b: Beat; words: Word[]}> = ({b, words}) => {
  const {t, pop} = useBeat(b);
  const ws = words.filter((w) => w.start >= b.start - 0.05 && w.start < b.end - 0.05);
  const first = b.start < 0.2;
  const n = ws.reduce((a, w) => a + w.text.length + 1, 0);
  const size = n > 70 ? 56 : n > 48 ? 64 : 74;
  return (
    <div style={{position: "absolute", top: 262, left: 66, right: 66, fontFamily: INTER, fontWeight: 800, fontSize: size, lineHeight: 1.16,
      letterSpacing: "-0.03em", color: P.INK, display: "flex", flexWrap: "wrap", gap: "0 0.26em"}}>
      {ws.map((w, i) => {
        const shown = first || t >= w.start - 0.06;
        const p = first ? 1 : pop(w.start - 0.06, 14);
        const isAcc = b.accent && clean(w.text) === clean(b.accent);
        const isSel = b.select && clean(w.text) === clean(b.select);
        const on = first ? 1 : Math.min(pop(w.start + 0.08), 1);
        return (
          <span key={i} style={{position: "relative", display: "inline-block", opacity: shown ? Math.min(p * 1.6, 1) : 0, transform: `translateY(${(1 - Math.min(p, 1)) * 22}px)`}}>
            {isSel && <span style={{position: "absolute", left: -10, right: -10, top: "18%", bottom: "-4%", background: rgba(P.OCHRE, 0.55), filter: "url(#p-rough)",
              transformOrigin: "left", transform: `scaleX(${on}) rotate(-1.5deg)`}} />}
            <span style={{position: "relative", ...(isAcc ? {fontFamily: BRUSH, fontWeight: 400, color: P.TOMATO, fontSize: "1.25em", lineHeight: 0.85, letterSpacing: 0} : {})}}>
              {w.text}
            </span>
            {isAcc && <Underline on={on} color={P.TOMATO} />}
          </span>
        );
      })}
    </div>
  );
};

const Splatter: React.FC<{at: number; b: Beat; color: string}> = ({at, b, color}) => {
  const {pop} = useBeat(b);
  const p = Math.min(pop(at, 9), 1);
  const dots = [[140, 120, 46], [880, 90, 30], [930, 520, 54], [90, 560, 26], [520, 40, 22], [760, 640, 34], [260, 650, 40]];
  return (
    <>
      {dots.map(([x, y, r], i) => (
        <div key={i} style={{position: "absolute", left: x, top: TOP + y, width: r * 2 * p, height: r * 2 * p, marginLeft: -r * p, marginTop: -r * p, borderRadius: "50%",
          background: color, opacity: 0.85, filter: "url(#p-rough)"}} />
      ))}
    </>
  );
};

const Slam: React.FC<{b: Beat; color: string}> = ({b, color}) => {
  const {pop, lt} = useBeat(b);
  const words = (b.text || "").split(" ");
  const len = (b.text || "").length;
  const size = len <= 8 ? 260 : len <= 14 ? 190 : len <= 24 ? 146 : 112;
  const first = b.start < 0.2;
  const wash = first ? 1 : Math.min(pop(b.start + 0.02, 14), 1);
  return (
    <>
      <div style={{position: "absolute", top: TOP + 40, left: 70, width: 940, height: 560, borderRadius: "48%", background: color, opacity: 0.32 * wash,
        transform: `scale(${0.6 + 0.4 * wash}) rotate(-4deg)`, filter: "url(#p-wash)"}} />
      {!first && <Splatter at={b.start + 0.12} b={b} color={color} />}
      <div style={{position: "absolute", top: TOP, left: 50, right: 50, height: 640, display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center",
        gap: "0 34px", textAlign: "center", transform: `scale(${1 + lt * 0.012}) rotate(-2deg)`}}>
        {words.map((w, i) => {
          const p = first ? 1 : pop(b.start + 0.06 + i * 0.09, 9);
          const red = (b.accent && clean(w) === clean(b.accent)) || /[$€£]\d|\d+%/.test(w);
          return (
            <span key={i} style={{display: "inline-block", fontFamily: BRUSH, fontSize: red ? size * 1.15 : size, lineHeight: 0.95, color: red ? P.TOMATO : P.INK,
              opacity: Math.min(p * 2, 1), transform: `scale(${first ? 1 : 1.8 - 0.8 * Math.min(p, 1.06)}) rotate(${(i % 2 ? 3 : -3)}deg)`}}>{w}</span>
          );
        })}
        {b.sub && <div style={{width: "100%", marginTop: 26, fontFamily: HAND, fontWeight: 700, fontSize: 62, color: P.MUTED, opacity: first ? 1 : pop(b.start + 0.45)}}>{b.sub}</div>}
      </div>
    </>
  );
};

const Counter: React.FC<{b: Beat; color: string}> = ({b, color}) => {
  const {t, pop} = useBeat(b);
  const dur = Math.min(1.4, (b.end - b.start) * 0.7);
  const k = interpolate(t, [b.start + 0.15, b.start + 0.15 + dur], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3)});
  const v = (b.from ?? 0) + ((b.to ?? 0) - (b.from ?? 0)) * k;
  const dec = Math.abs((b.to ?? 0) % 1) > 0 ? 2 : 0;
  const txt = `${b.prefix ?? ""}${v.toLocaleString("en-US", {minimumFractionDigits: dec, maximumFractionDigits: dec})}${b.suffix ?? ""}`;
  const done = Math.min(pop(b.start + 0.15 + dur, 8), 1);
  return (
    <div style={{position: "absolute", top: TOP, left: 0, right: 0, height: 640, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"}}>
      <div style={{position: "absolute", width: 820, height: 480, borderRadius: "50%", background: color, opacity: 0.3, filter: "url(#p-wash)", transform: `scale(${0.8 + 0.2 * done})`}} />
      {b.label && <div style={{position: "relative", fontFamily: HAND, fontWeight: 700, fontSize: 60, color: P.MUTED, opacity: pop(b.start)}}>{b.label}</div>}
      <div style={{position: "relative", fontFamily: BRUSH, fontSize: txt.length > 7 ? 230 : 290, lineHeight: 1, color: b.tone === "accent" ? color : P.TOMATO,
        fontVariantNumeric: "tabular-nums", transform: `scale(${1 + 0.1 * Math.sin(done * Math.PI)}) rotate(-3deg)`}}>{txt}</div>
      {b.sub && <div style={{position: "relative", fontFamily: INTER, fontWeight: 800, fontSize: 54, color: P.INK, marginTop: 6, opacity: done}}>{b.sub}</div>}
    </div>
  );
};

const Tape: React.FC<{x: number; y: number; r: number}> = ({x, y, r}) => (
  <div style={{position: "absolute", left: x, top: y, width: 190, height: 56, background: rgba(P.OCHRE, 0.55), transform: `rotate(${r}deg)`, filter: "url(#p-rough)"}} />
);

const App: React.FC<{b: Beat}> = ({b}) => {
  const {lt, pop} = useBeat(b);
  const accent = useAccent();
  if (!b.image) return null;
  const p = Math.min(pop(b.start + 0.1), 1);
  const tall = b.image.h > b.image.w * 1.15; // phone screenshots get a tall frame instead of a hard crop
  return (
    <>
      <div style={{position: "absolute", top: TOP + 20, ...(tall ? {left: 270, width: 420, height: 746} : {left: 64, width: 952, height: 640}),
        transform: `rotate(${-2 + (1 - p) * -4}deg) scale(${0.94 + 0.06 * p})`}}>
        <div style={{position: "absolute", inset: -26, background: P.CARD, filter: "url(#p-rough)", boxShadow: "0 30px 70px rgba(80,60,30,0.22)"}} />
        <div style={{position: "absolute", inset: 0, overflow: "hidden", borderRadius: 6}}>
          <Img src={staticFile(b.image.src)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: tall ? "50% 0%" : "50% 30%",
            transform: tall ? `scale(${1.02 + lt * 0.01})` : `scale(${1.12 + lt * 0.035}) translateX(${-lt * 8}px)`}} />
          <AbsoluteFill style={{filter: "url(#p-grain)", background: "#fff", opacity: 0.18, mixBlendMode: "multiply"}} />
        </div>
        <Tape x={-60} y={-30} r={-24} />
        <Tape x={tall ? 300 : 830} y={-24} r={21} />
      </div>
      {b.text && (
        <div style={{position: "absolute", top: tall ? TOP + 640 : TOP + 580, right: tall ? 40 : 70, transform: `scale(${Math.min(pop(b.start + 0.3, 9), 1.04)}) rotate(-3deg)`}}>
          <Daub color={accent.hex} inset={0} radius={40}>
            <div style={{padding: "14px 40px 20px", fontFamily: BRUSH, fontSize: 70, color: accent.ink, whiteSpace: "nowrap"}}>{b.text}</div>
          </Daub>
        </div>
      )}
    </>
  );
};

const Versus: React.FC<{b: Beat; dir: string; icon?: string}> = ({b, dir, icon}) => {
  const {t, pop} = useBeat(b);
  const accent = useAccent();
  const strike = interpolate(t, [b.start + 0.6, b.start + 1.05], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3)});
  const vs = Math.min(pop(b.start + 0.3, 8), 1);
  // "$9.99 once" / "$11.99/mo" → big "$9.99", small "once" / "a month" underneath
  const pm = (b.price || "").match(/^\s*([$€£]?\s?[\d.,]+\s?[€£]?)(.*)$/);
  const priceMain = pm ? pm[1].trim() : b.price || "";
  const priceRest = (pm ? pm[2] : "").trim().replace(/^\/mo$/, "a month").replace(/^\/yr$/, "a year").replace(/^one-time$/, "once");
  const card =(children: React.ReactNode, left: number, top: number, rot: number, p: number) => (
    <div style={{position: "absolute", left, top, width: 430, opacity: Math.min(p * 1.5, 1), transform: `rotate(${rot}deg) scale(${0.8 + 0.2 * Math.min(p, 1)})`}}>
      <Daub color={P.CARD} inset={0} radius={34}>
        <div style={{padding: "34px 20px 30px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6}}>{children}</div>
      </Daub>
    </div>
  );
  return (
    <div style={{position: "absolute", top: TOP, left: 0, right: 0, height: 700}}>
      {card(<>
        <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 42, color: P.INK, textAlign: "center", lineHeight: 1.1}}>{b.paid}</div>
        <div style={{position: "relative", fontFamily: BRUSH, fontSize: priceMain.length > 6 ? 108 : 128, color: P.TOMATO, whiteSpace: "nowrap", lineHeight: 1.05}}>
          {priceMain}
          <svg viewBox="0 0 200 40" preserveAspectRatio="none" style={{position: "absolute", left: -20, right: -20, top: "38%", width: "calc(100% + 40px)", height: 46, overflow: "visible"}}>
            <path d="M4 30 C 70 18, 130 26, 196 6" stroke={P.INK} strokeWidth={11} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1}
              strokeDashoffset={1 - strike} style={{filter: "url(#p-rough)"}} />
          </svg>
        </div>
        {priceRest && <div style={{fontFamily: HAND, fontWeight: 700, fontSize: 50, color: P.MUTED, marginTop: -8}}>{priceRest}</div>}
      </>, 40, 110, -4, pop(b.start))}
      {card(<>
        {icon ? <Img src={staticFile(`${dir}/${icon}`)} style={{width: 104, height: 104, borderRadius: 24}} /> : <GitMark size={104} fg={P.INK} accent={accent.hex} />}
        <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 42, color: P.INK, textAlign: "center", lineHeight: 1.1}}>{b.name}</div>
        <div style={{fontFamily: BRUSH, fontSize: 140, lineHeight: 1, color: accent.hex}}>$0</div>
      </>, 610, 230, 4, pop(b.start + 0.15))}
      <div style={{position: "absolute", top: 380, left: 0, right: 0, textAlign: "center", fontFamily: BRUSH, fontSize: 150, color: P.TOMATO,
        opacity: Math.min(vs * 2, 1), transform: `scale(${1.8 - 0.8 * vs}) rotate(-8deg)`}}>vs</div>
    </div>
  );
};

const List: React.FC<{b: Beat}> = ({b}) => {
  const {pop} = useBeat(b);
  return (
    <div style={{position: "absolute", top: TOP + 30, left: 80, right: 70, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 46}}>
      {b.text && <div style={{fontFamily: HAND, fontWeight: 700, fontSize: 64, color: P.MUTED, opacity: pop(b.start)}}>{b.text}</div>}
      {(b.items || []).map((it, i) => {
        const p = Math.min(pop(it.at, 10), 1);
        const c = PIGMENTS[(i + 1) % PIGMENTS.length];
        return (
          <div key={i} style={{marginLeft: i * 46, opacity: Math.min(p * 1.6, 1), transform: `translateX(${(1 - p) * 260}px) rotate(${i % 2 ? 2 : -2}deg)`}}>
            <Daub color={c} radius={60}>
              <div style={{padding: "14px 48px 22px 30px", display: "flex", alignItems: "center", gap: 20, fontFamily: BRUSH, fontSize: it.label.length > 16 ? 76 : 92,
                color: c === P.OCHRE ? P.INK : "#fff", whiteSpace: "nowrap"}}>
                <span style={{fontSize: "0.8em"}}>✓</span>{it.label}
              </div>
            </Daub>
          </div>
        );
      })}
    </div>
  );
};

// replaces Kit's speech bubble: a big painted splash with the exclamation in brush script
const Splash: React.FC<{b: Beat; color: string}> = ({b, color}) => {
  const {pop, lt} = useBeat(b);
  const p = Math.min(pop(b.start + 0.08, 9), 1.05);
  if (!b.text) return null;
  return (
    <div style={{position: "absolute", top: TOP + 10, left: 60, right: 60, height: 620, display: "flex", alignItems: "center", justifyContent: "center"}}>
      <div style={{position: "absolute", width: 900, height: 560, borderRadius: "46% 54% 52% 48%", background: color, opacity: 0.9, filter: "url(#p-wash)",
        transform: `scale(${0.5 + 0.5 * p}) rotate(${-3 + Math.sin(lt * 3) * 1.2}deg)`}} />
      <Splatter at={b.start + 0.1} b={b} color={color} />
      <div style={{position: "relative", maxWidth: 820, textAlign: "center", fontFamily: BRUSH, fontSize: b.text.length > 24 ? 110 : 136, lineHeight: 1.02, color: "#fff",
        textShadow: "0 4px 0 rgba(0,0,0,0.12)", opacity: Math.min(p * 2, 1), transform: `scale(${0.7 + 0.3 * p}) rotate(-3deg)`}}>{b.text}</div>
    </div>
  );
};

const Cta: React.FC<{b: Beat; keyword: string}> = ({b, keyword}) => {
  const {t, pop} = useBeat(b);
  const accent = useAccent();
  const a = pop(b.start), m = Math.min(pop(b.start + 0.35, 8), 1.05), c = pop(b.start + 1.0);
  const wig = Math.sin((t - b.start) * 8) * 3 * Math.max(0, 1 - (t - b.start - 0.6) / 1.2);
  const kw = keyword.toUpperCase();
  return (
    <AbsoluteFill style={{alignItems: "center"}}>
      <div style={{position: "absolute", top: TOP - 60, fontFamily: BRUSH, fontSize: 170, color: P.INK, opacity: a, transform: "rotate(-3deg)"}}>Comment</div>
      <div style={{position: "absolute", top: TOP + 170, opacity: Math.min(m * 1.5, 1), transform: `scale(${0.4 + 0.6 * m}) rotate(${wig - 3}deg)`}}>
        <Daub color={accent.hex} radius={70}>
          <div style={{padding: "10px 70px 26px", fontFamily: BRUSH, fontSize: kw.length > 6 ? 190 : 240, lineHeight: 1, color: accent.ink}}>{kw}</div>
        </Daub>
      </div>
      <div style={{position: "absolute", top: TOP + 520, opacity: c, transform: "rotate(2deg)"}}>
        <Daub color={P.CARD} radius={50}>
          <div style={{padding: "14px 36px 18px", fontFamily: HAND, fontWeight: 700, fontSize: 66, color: P.INK}}>💬 I'll DM you the link</div>
        </Daub>
      </div>
    </AbsoluteFill>
  );
};

export const PaintStory: React.FC<StoryProps> = (props) => {
  const p = {...props, beats: props.beats.map((b, i) => (i === 0 ? {...b, start: 0} : b))};
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const accent = accentFor(p.accent);
  const cur = p.beats.find((b) => t >= b.start && t < b.end) ?? p.beats[p.beats.length - 1];
  const idx = p.beats.indexOf(cur);
  const slam = p.beats.find((b, i) => i > 0 && b.scene === "slam" && t >= b.start + 0.12 && t < b.start + 0.4);
  const sh = slam ? Math.max(0, 1 - (t - slam.start - 0.12) / 0.28) * 10 : 0;
  const shake = sh ? `translate(${Math.sin(t * 90) * sh}px, ${Math.cos(t * 77) * sh}px)` : undefined;
  const pig = (i: number) => (i % 2 === 0 ? accent.hex : PIGMENTS[i % PIGMENTS.length]);
  const right = p.paid ? `${p.paid} → $0` : "free & open source";
  const cues: [number, string][] = p.beats.flatMap((b, i): [number, string][] => [
    ...(i ? [[b.start - 0.04, "whoosh"] as [number, string]] : []),
    ...(b.scene === "slam" && i ? [[b.start + 0.1, "thud"] as [number, string]] : []),
    ...(b.scene === "counter" ? [[b.start + 0.15 + Math.min(1.4, (b.end - b.start) * 0.7), "ding"] as [number, string]] : []),
    ...(b.scene === "versus" ? [[b.start + 0.3, "thud"] as [number, string]] : []),
    ...(b.scene === "character" ? [[b.start + 0.1, "pop"] as [number, string]] : []),
    ...(b.items || []).map((it): [number, string] => [it.at, "pop"]),
  ]);
  return (
    <AccentCtx.Provider value={accent}>
      <AbsoluteFill style={{background: P.PAPER}}>
        <Defs />
        <Background accent={accent.hex} />
        <AbsoluteFill style={{transform: shake}}>
          <Header i={idx} name={p.name || "itsongit"} right={right} />
          {p.beats.map((b, i) => (
            <Sequence key={i} from={f(b.start)} durationInFrames={Math.max(1, f(b.end) - f(b.start))} name={`${i}-${b.scene}`}>
              <Wipe b={b} color={pig(i)}>
                {b.scene !== "cta" && <Line b={b} words={p.words} />}
                {b.scene === "slam" && <Slam b={b} color={pig(i)} />}
                {b.scene === "counter" && <Counter b={b} color={pig(i)} />}
                {b.scene === "app" && <App b={b} />}
                {b.scene === "versus" && <Versus b={b} dir={p.dir} icon={p.icon} />}
                {b.scene === "list" && <List b={b} />}
                {b.scene === "character" && <Splash b={b} color={pig(i + 1)} />}
                {b.scene === "cta" && <Cta b={b} keyword={p.keyword} />}
              </Wipe>
            </Sequence>
          ))}
        </AbsoluteFill>
        {/* where Kit used to sit: the app icon in a painted frame, bobbing gently (hidden on the CTA) */}
        {p.icon && cur.scene !== "cta" && (
          <div style={{position: "absolute", left: 700, top: 1380, transform: `rotate(${4 + Math.sin(t * 1.6) * 3}deg) translateY(${Math.sin(t * 2.1) * 8}px)`}}>
            <Daub color={P.CARD} radius={60} inset={6}>
              <div style={{padding: 26, display: "flex", flexDirection: "column", alignItems: "center", gap: 4}}>
                <Img src={staticFile(`${p.dir}/${p.icon}`)} style={{width: 200, height: 200, borderRadius: 44}} />
                <span style={{fontFamily: HAND, fontWeight: 700, fontSize: 46, color: P.INK}}>{p.name}</span>
              </div>
            </Daub>
          </div>
        )}
        <div style={{position: "absolute", bottom: 222, left: 66, transform: "rotate(-2deg)"}}>
          <Daub color={P.CARD} radius={40}>
            <div style={{display: "flex", alignItems: "center", gap: 10, padding: "8px 24px 8px 12px"}}>
              <GitMark size={42} fg={P.INK} accent={accent.hex} />
              <span style={{fontFamily: HAND, fontWeight: 700, fontSize: 44, color: P.INK}}>@itsongit</span>
            </div>
          </Daub>
        </div>
        <Audio src={staticFile(`${p.dir}/vo.wav`)} />
        <Sfx cues={cues} />
      </AbsoluteFill>
    </AccentCtx.Provider>
  );
};
