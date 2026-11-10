import React, {createContext, useContext} from "react";
import {AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {loadFont as loadBrush} from "@remotion/google-fonts/CaveatBrush";
import {loadFont as loadCaveat} from "@remotion/google-fonts/Caveat";
import {loadFont as loadGochi} from "@remotion/google-fonts/GochiHand";
import {loadFont as loadArch} from "@remotion/google-fonts/ArchitectsDaughter";
import {loadFont as loadKalam} from "@remotion/google-fonts/Kalam";
import {loadFont as loadOswald} from "@remotion/google-fonts/Oswald";
import {loadFont as loadTechMono} from "@remotion/google-fonts/ShareTechMono";
import {loadFont as loadAnton} from "@remotion/google-fonts/Anton";
import {loadFont as loadCabin} from "@remotion/google-fonts/CabinSketch";
import {loadFont as loadGaegu} from "@remotion/google-fonts/Gaegu";
import {loadFont as loadPatrick} from "@remotion/google-fonts/PatrickHand";
import {AccentCtx, f, INTER, MONO, rgba, Sfx, type Word} from "./kit";
import {accentFor} from "./brand";
import {GitMark} from "./Logo";
import type {Beat, StoryProps} from "./Story";

// Format "paint": the story beat structure (slam / versus / app / list / counter / character / cta) rendered in one of
// five hand-made film looks adapted from the open Lemo-Opuscar style library (github.com/lemomo-ai/lemo-opuscar,
// MIT / CC BY 4.0): watercolor, whiteboard, blueprint, risograph, chalkboard. No mascot. Layout grammar mirrors
// Story.tsx so make.py's beats drive both:
//   y 178  hand-lettered header ("no. 03 · mixxx"  ·  "Serato → $0")
//   y 262  the spoken line, word-timed; the accent word in the look's display face with a drawn underline, the
//          `select` word highlighted the look's way (paint swipe, marker loop, dashed callout, ink tint, chalk ring)
//   y 600–1300  the scene; bottom-right the app icon in a frame (where Kit used to sit)
type Look = "watercolor" | "whiteboard" | "blueprint" | "risograph" | "chalkboard" | "crayon";
const fam = (x: {fontFamily: string}) => x.fontFamily;
const F = {
  brush: fam(loadBrush("normal", {weights: ["400"], subsets: ["latin"]})),
  caveat: fam(loadCaveat("normal", {weights: ["700"], subsets: ["latin"]})),
  gochi: fam(loadGochi("normal", {weights: ["400"], subsets: ["latin"]})),
  arch: fam(loadArch("normal", {weights: ["400"], subsets: ["latin"]})),
  kalam: fam(loadKalam("normal", {weights: ["700"], subsets: ["latin"]})),
  oswald: fam(loadOswald("normal", {weights: ["500", "700"], subsets: ["latin"]})),
  tech: fam(loadTechMono("normal", {weights: ["400"], subsets: ["latin"]})),
  anton: fam(loadAnton("normal", {weights: ["400"], subsets: ["latin"]})),
  cabin: fam(loadCabin("normal", {weights: ["700"], subsets: ["latin"]})),
  gaegu: fam(loadGaegu("normal", {weights: ["700"], subsets: ["latin"]})),
  patrick: fam(loadPatrick("normal", {weights: ["400"], subsets: ["latin"]})),
};

type Theme = {
  look: Look; paper: string; ink: string; muted: string; card: string; acc: string; accInk: string; neg: string; hi: string;
  pig: string[]; solid: boolean; // solid = colour fields (paint, ink); otherwise drawn outlines (marker, line, chalk)
  display: string; displayUpper?: boolean; hand: string; body: string; bodyWeight: number; bodySize: number;
  textFilter?: string; displayShadow?: string; edge: string; wipe: "brush" | "eraser" | "scan" | "roller" | "crayon";
};
const THEMES: Record<Look, (slotAcc: {hex: string; ink: string}) => Theme> = {
  watercolor: (a) => ({look: "watercolor", paper: "#F3ECDF", ink: "#2A251F", muted: "#7A6F62", card: "#FBF7EF", acc: a.hex, accInk: a.ink, neg: "#D9472B",
    hi: "#E6A93A", pig: ["#D9472B", "#3C8C86", "#E6A93A", "#3557A6", "#C9577A"], solid: true, display: F.brush, hand: F.caveat, body: INTER, bodyWeight: 800,
    bodySize: 1, edge: "url(#p-rough)", wipe: "brush"}),
  whiteboard: () => ({look: "whiteboard", paper: "#F6F7F5", ink: "#23262C", muted: "#6B717A", card: "#FFFFFF", acc: "#D97757", accInk: "#D97757", neg: "#D97757",
    hi: "#2A5CB3", pig: ["#2A5CB3", "#D97757", "#23262C"], solid: false, display: F.gochi, hand: F.arch, body: F.kalam, bodyWeight: 700, bodySize: 1.04,
    edge: "url(#p-marker)", wipe: "eraser"}),
  crayon: () => ({look: "crayon", paper: "#F4EFE3", ink: "#2E3577", muted: "#6A6A9A", card: "#FBF8F0", acc: "#E3452F", accInk: "#2E3577", neg: "#E3452F",
    hi: "#F4C430", pig: ["#E3452F", "#2F6FD6", "#3FA34D", "#EE7FA6", "#F4C430"], solid: false, display: F.gaegu, hand: F.patrick, body: F.patrick, bodyWeight: 400,
    bodySize: 1.12, textFilter: "url(#p-wax-lite)", edge: "url(#p-wax)", wipe: "crayon"}),
  blueprint: () => ({look: "blueprint", paper: "#1E4387", ink: "#E7F0F9", muted: "#A9C1E2", card: "#22488F", acc: "#E7F0F9", accInk: "#E7F0F9",
    neg: "#E7F0F9", hi: "#E7F0F9", pig: ["#E7F0F9", "#E7F0F9", "#E7F0F9"], solid: false, display: F.oswald, displayUpper: true, hand: F.tech, body: F.oswald,
    bodyWeight: 500, bodySize: 1.02, edge: "url(#p-line)", wipe: "scan"}),
  risograph: () => ({look: "risograph", paper: "#F2EBDD", ink: "#1D3E8F", muted: "#5B6E9C", card: "#F7F1E6", acc: "#FF48B0", accInk: "#FFFFFF", neg: "#FF48B0",
    hi: "#FFE14D", pig: ["#FF48B0", "#1D6FD8", "#FFB000"], solid: true, display: F.anton, displayUpper: true, hand: MONO, body: INTER, bodyWeight: 900, bodySize: 1,
    displayShadow: "6px 4px 0 rgba(29,111,216,0.55)", edge: "url(#p-riso)", wipe: "roller"}),
  chalkboard: () => ({look: "chalkboard", paper: "#22392F", ink: "#EEEDE3", muted: "#B9C2B6", card: "#26402F", acc: "#F2A65A", accInk: "#F2A65A",
    neg: "#F2A65A", hi: "#F3E28A", pig: ["#EEEDE3", "#F2A65A", "#F3E28A"], solid: false, display: F.cabin, hand: F.caveat, body: F.kalam, bodyWeight: 700,
    bodySize: 1.02, textFilter: "url(#p-chalk)", edge: "url(#p-chalk)", wipe: "eraser"}),
};
const ThemeCtx = createContext<Theme>(THEMES.watercolor({hex: "#14A35A", ink: "#fff"}));
const useTheme = () => useContext(ThemeCtx);

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

const Defs: React.FC = () => (
  <svg width={0} height={0} style={{position: "absolute"}}>
    <defs>
      <filter id="p-rough" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.032" numOctaves={3} seed={4} />
        <feDisplacementMap in="SourceGraphic" scale={16} xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="p-marker" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves={2} seed={3} />
        <feDisplacementMap in="SourceGraphic" scale={5} xChannelSelector="R" yChannelSelector="G" result="d" />
        <feTurbulence type="fractalNoise" baseFrequency="0.6 0.05" numOctaves={1} seed={8} result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.7 1.25" result="streak" />
        <feComposite in="d" in2="streak" operator="in" />
      </filter>
      <filter id="p-line" x="-2%" y="-2%" width="104%" height="104%">
        <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves={1} seed={6} result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.5 1.15" result="m" />
        <feComposite in="SourceGraphic" in2="m" operator="in" />
      </filter>
      <filter id="p-chalk" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves={2} seed={5} result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.25 1.4" result="m" />
        <feComposite in="SourceGraphic" in2="m" operator="in" result="c" />
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves={2} seed={2} />
        <feDisplacementMap in="c" scale={3} xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="p-chalk-lite" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves={2} seed={5} result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.7 1.3" result="m" />
        <feComposite in="SourceGraphic" in2="m" operator="in" />
      </filter>
      <filter id="p-wax" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={3} seed={13} result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.45" result="m" />
        <feComposite in="SourceGraphic" in2="m" operator="in" result="w" />
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={14} />
        <feDisplacementMap in="w" scale={5} xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="p-wax-lite" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={3} seed={13} result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.8 1.3" result="m" />
        <feComposite in="SourceGraphic" in2="m" operator="in" />
      </filter>
      <filter id="p-riso" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={11} result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.4" result="m" />
        <feComposite in="SourceGraphic" in2="m" operator="in" />
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

const halftone = (c: string, a: number, size = 9) => `radial-gradient(${rgba(c, a)} 34%, transparent 36%) 0 0 / ${size}px ${size}px`;

// a patch in the look's medium: "fill" = colour field (paint / ink / marker tint), "card" = a plain surface
const Patch: React.FC<{color?: string; mode?: "fill" | "card"; radius?: number; style?: React.CSSProperties; children?: React.ReactNode}> = ({
  color, mode = "card", radius = 26, style, children}) => {
  const T = useTheme();
  const c = color ?? T.acc;
  let bg: React.ReactNode;
  if (T.look === "watercolor") {
    bg = <>
      <div style={{position: "absolute", inset: 0, borderRadius: radius, background: mode === "fill" ? c : T.card, filter: T.edge}} />
      <div style={{position: "absolute", inset: 10, borderRadius: radius, background: "radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.28), transparent 60%)", filter: T.edge}} />
    </>;
  } else if (T.look === "risograph") {
    bg = mode === "fill"
      ? <>
        <div style={{position: "absolute", inset: 0, transform: "translate(7px, 5px)", borderRadius: radius, background: T.pig[1], opacity: 0.55, mixBlendMode: "multiply", filter: T.edge}} />
        <div style={{position: "absolute", inset: 0, borderRadius: radius, background: c, mixBlendMode: "multiply", filter: T.edge}} />
      </>
      : <div style={{position: "absolute", inset: 0, borderRadius: radius, background: `${halftone(T.pig[2], 0.5)}, ${T.card}`, mixBlendMode: "multiply", filter: T.edge}} />;
  } else if (T.look === "blueprint") {
    bg = <>
      <div style={{position: "absolute", inset: 0, background: mode === "fill" ? `repeating-linear-gradient(45deg, ${rgba(T.ink, 0.16)} 0 3px, transparent 3px 16px)` : T.card,
        border: `3px solid ${T.ink}`, filter: T.edge}} />
      <div style={{position: "absolute", inset: 8, border: `1.5px solid ${rgba(T.ink, 0.7)}`, filter: T.edge}} />
    </>;
  } else if (T.look === "crayon") {
    bg = <>
      {mode === "fill" && <div style={{position: "absolute", inset: -10, borderRadius: radius, transform: "rotate(-1.5deg)", filter: T.edge,
        background: `repeating-linear-gradient(-32deg, ${rgba(c, 0.9)} 0 9px, transparent 9px 15px), repeating-linear-gradient(28deg, ${rgba(c, 0.35)} 0 6px, transparent 6px 17px)`}} />}
      {mode === "card" && <div style={{position: "absolute", inset: 0, borderRadius: radius, background: T.card}} />}
      <div style={{position: "absolute", inset: 0, borderRadius: radius, border: `8px solid ${T.ink}`, filter: T.edge}} />
    </>;
  } else { // whiteboard, chalkboard: drawn outline, tinted inside when "fill"
    bg = <div style={{position: "absolute", inset: 0, borderRadius: radius, border: `${T.look === "chalkboard" ? 6 : 7}px solid ${mode === "fill" ? c : T.ink}`,
      background: mode === "fill" ? rgba(c, 0.12) : T.card, filter: T.edge}} />;
  }
  return <div style={{position: "relative", ...style}}>{bg}<div style={{position: "relative"}}>{children}</div></div>;
};
const onFill = (T: Theme, c: string) => (T.look === "crayon" ? T.ink : T.solid ? (c === T.pig[2] || c === "#FFB000" ? T.ink : "#fff") : c);

const Background: React.FC = () => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const t = frame / 30;
  if (T.look === "watercolor") {
    const blob = (x: number, y: number, w: number, h: number, c: string, o: number, ph: number) => (
      <div style={{position: "absolute", left: x + Math.sin(t * 0.25 + ph) * 30, top: y + Math.cos(t * 0.2 + ph) * 24, width: w, height: h, borderRadius: "50%",
        background: c, opacity: o, filter: "url(#p-wash)", mixBlendMode: "multiply"}} />
    );
    return (
      <AbsoluteFill style={{background: T.paper, overflow: "hidden"}}>
        {blob(-260, -180, 900, 760, T.acc, 0.16, 0)}{blob(560, 1380, 760, 640, "#E6A93A", 0.14, 2)}
        {blob(700, 380, 520, 420, "#C9577A", 0.07, 4)}{blob(-200, 1100, 600, 520, "#3C8C86", 0.08, 1)}
        <AbsoluteFill style={{filter: "url(#p-grain)", background: "#fff", opacity: 0.55, mixBlendMode: "multiply"}} />
        <AbsoluteFill style={{background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(90,70,40,0.16) 100%)"}} />
      </AbsoluteFill>
    );
  }
  if (T.look === "crayon") {
    return (
      <AbsoluteFill style={{background: T.paper, overflow: "hidden"}}>
        <div style={{position: "absolute", left: -200, top: -260, width: 1500, height: 620, borderRadius: "50%", background: "#3D6BE0", opacity: 0.09, filter: "url(#p-wash)",
          transform: `translateX(${Math.sin(t * 0.2) * 20}px)`}} />
        <div style={{position: "absolute", left: -100, top: 1620, width: 1300, height: 500, borderRadius: "50%", background: "#3FA34D", opacity: 0.08, filter: "url(#p-wash)"}} />
        <AbsoluteFill style={{filter: "url(#p-grain)", background: "#fff", opacity: 0.4, mixBlendMode: "multiply"}} />
        <AbsoluteFill style={{background: `repeating-linear-gradient(0deg, rgba(120,100,60,0.035) 0 1px, transparent 1px 4px)`}} />
      </AbsoluteFill>
    );
  }
  if (T.look === "whiteboard") {
    const sx = -60 + ((t * 9) % 260);
    return (
      <AbsoluteFill style={{background: "linear-gradient(165deg, #FBFCFB, #EDF0EE)", overflow: "hidden"}}>
        {/* ghosts of old lessons */}
        {[[120, 1440, 520, -6], [560, 560, 380, 4], [300, 900, 640, -2]].map(([x, y, w, r], i) => (
          <div key={i} style={{position: "absolute", left: x, top: y, width: w, height: 70, borderTop: "10px solid rgba(60,70,80,0.05)", borderRadius: "50%",
            transform: `rotate(${r}deg)`, filter: "url(#p-marker)"}} />
        ))}
        <AbsoluteFill style={{background: `linear-gradient(112deg, transparent ${sx}%, rgba(255,255,255,0.85) ${sx + 8}%, transparent ${sx + 18}%)`}} />
        <AbsoluteFill style={{boxShadow: "inset 0 0 0 26px #C9CED3, inset 0 0 0 30px #AEB4BA, inset 0 0 60px 30px rgba(0,0,0,0.05)"}} />
      </AbsoluteFill>
    );
  }
  if (T.look === "blueprint") {
    return (
      <AbsoluteFill style={{background: "radial-gradient(ellipse at 40% 35%, #2A58A6, #18336B 85%)", overflow: "hidden"}}>
        <AbsoluteFill style={{background: `repeating-linear-gradient(0deg, ${rgba("#E7F0F9", 0.16)} 0 2px, transparent 2px 270px),
          repeating-linear-gradient(90deg, ${rgba("#E7F0F9", 0.16)} 0 2px, transparent 2px 270px),
          repeating-linear-gradient(0deg, ${rgba("#E7F0F9", 0.07)} 0 1px, transparent 1px 54px),
          repeating-linear-gradient(90deg, ${rgba("#E7F0F9", 0.07)} 0 1px, transparent 1px 54px)`}} />
        <div style={{position: "absolute", left: 0, right: 0, top: 1110, height: 3, background: "rgba(231,240,249,0.12)", boxShadow: "0 3px 0 rgba(0,0,30,0.18)"}} />
        <AbsoluteFill style={{filter: "url(#p-grain)", background: "#fff", opacity: 0.35, mixBlendMode: "overlay"}} />
        <AbsoluteFill style={{boxShadow: "inset 0 0 0 22px rgba(231,240,249,0.18), inset 0 0 0 25px rgba(13,17,22,0.4), inset 0 0 120px rgba(5,10,30,0.5)"}} />
      </AbsoluteFill>
    );
  }
  if (T.look === "risograph") {
    return (
      <AbsoluteFill style={{background: T.paper, overflow: "hidden"}}>
        <div style={{position: "absolute", left: 520, top: -260, width: 900, height: 900, borderRadius: "50%", background: halftone(T.pig[2], 0.6, 11), mixBlendMode: "multiply"}} />
        <div style={{position: "absolute", left: -300, top: 1450, width: 1000, height: 700, borderRadius: "50%", background: halftone(T.pig[1], 0.35, 11), mixBlendMode: "multiply"}} />
        <AbsoluteFill style={{filter: "url(#p-grain)", background: "#fff", opacity: 0.5, mixBlendMode: "multiply"}} />
      </AbsoluteFill>
    );
  }
  // chalkboard
  return (
    <AbsoluteFill style={{background: T.paper, overflow: "hidden"}}>
      {[[-200, 200, 900, "rgba(255,255,255,0.035)"], [500, 1100, 800, "rgba(0,0,0,0.12)"], [100, 1500, 700, "rgba(255,255,255,0.03)"]].map(([x, y, w, c], i) => (
        <div key={i} style={{position: "absolute", left: x as number, top: y as number, width: w as number, height: (w as number) * 0.7, borderRadius: "50%", background: c as string,
          filter: "url(#p-wash)"}} />
      ))}
      <AbsoluteFill style={{filter: "url(#p-grain)", background: "#fff", opacity: 0.22, mixBlendMode: "overlay"}} />
      {/* a very thin even haze from the last wipe */}
      <div style={{position: "absolute", left: -100, top: 1250, width: 1300, height: 160, background: "rgba(238,237,227,0.035)", filter: "blur(30px)", transform: "rotate(-6deg)"}} />
      <div style={{position: "absolute", left: 0, right: 0, top: 0, height: 58, background: "linear-gradient(#7B5134, #5E3B24)", boxShadow: "0 6px 14px rgba(0,0,0,0.35)"}} />
      <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 74, background: "linear-gradient(#7B5134, #4E311E)", boxShadow: "0 -6px 14px rgba(0,0,0,0.35)"}} />
      <div style={{position: "absolute", left: 120, bottom: 50, width: 120, height: 22, borderRadius: 6, background: "#EEEDE3"}} />
      <div style={{position: "absolute", left: 270, bottom: 50, width: 90, height: 22, borderRadius: 6, background: "#F2A65A"}} />
    </AbsoluteFill>
  );
};

const Wipe: React.FC<{b: Beat; color: string; children: React.ReactNode}> = ({b, color, children}) => {
  const T = useTheme();
  const {t} = useBeat(b);
  const first = b.start < 0.2;
  const k = first ? 1 : interpolate(t, [b.start, b.start + WIPE], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 2.4)});
  const out = interpolate(t, [b.end - 0.1, b.end], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const edge = -500 + k * 2300;
  const band: React.CSSProperties =
    T.wipe === "brush" ? {left: edge - 300, width: 420, background: color, transform: "skewX(-11deg)", filter: "url(#p-bristle)", opacity: 0.92}
      : T.wipe === "crayon" ? {left: edge - 320, width: 400, transform: "skewX(-9deg)", filter: "url(#p-wax)",
        background: `repeating-linear-gradient(-58deg, ${color} 0 14px, transparent 14px 20px)`}
      : T.wipe === "eraser" ? {left: edge - 360, width: 460, background: T.paper, transform: "skewX(-8deg)", filter: "blur(14px)", opacity: 0.97}
        : T.wipe === "scan" ? {left: edge - 20, width: 6, background: "#F4F9FF", boxShadow: "0 0 30px 10px rgba(231,240,249,0.5)"}
          : {left: edge - 320, width: 380, background: `${halftone("#ffffff", 0.25, 9)}, ${color}`, transform: "skewX(-6deg)", mixBlendMode: "multiply", filter: "url(#p-riso)"};
  return (
    <>
      <AbsoluteFill style={{clipPath: first ? undefined : `polygon(0 0, ${edge + 220}px 0, ${edge - 160}px 100%, 0 100%)`, opacity: out}}>{children}</AbsoluteFill>
      {!first && k < 1 && <div style={{position: "absolute", top: -200, height: 2400, ...band}} />}
    </>
  );
};

const Header: React.FC<{i: number; name: string; right: string}> = ({i, name, right}) => {
  const T = useTheme();
  const tech = T.look === "blueprint" || T.look === "risograph";
  return (
    <div style={{position: "absolute", top: 178, left: 66, right: 66, display: "flex", justifyContent: "space-between", fontFamily: T.hand, fontWeight: 700,
      fontSize: tech ? 32 : 44, color: T.muted, filter: T.textFilter, textTransform: tech ? "uppercase" : undefined, letterSpacing: tech ? "0.06em" : undefined}}>
      <span>{T.look === "blueprint" ? `FIG. ${i + 1} — ${name}` : `no. ${String(i + 1).padStart(2, "0")} · ${name.toLowerCase()}`}</span>
      <span>{right}</span>
    </div>
  );
};

const Underline: React.FC<{on: number; color: string}> = ({on, color}) => {
  const T = useTheme();
  return (
    <svg viewBox="0 0 200 24" preserveAspectRatio="none" style={{position: "absolute", left: -6, right: -6, bottom: -14, width: "calc(100% + 12px)", height: 26, overflow: "visible"}}>
      <path d={T.look === "blueprint" ? "M4 12 L 196 12" : "M4 16 C 50 6, 120 22, 196 9"} stroke={color} strokeWidth={T.look === "blueprint" ? 4 : 9} strokeLinecap="round"
        fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - on} style={{filter: T.edge}} />
    </svg>
  );
};

const Line: React.FC<{b: Beat; words: Word[]}> = ({b, words}) => {
  const T = useTheme();
  const {t, pop} = useBeat(b);
  const ws = words.filter((w) => w.start >= b.start - 0.05 && w.start < b.end - 0.05);
  const first = b.start < 0.2;
  const n = ws.reduce((a, w) => a + w.text.length + 1, 0);
  const size = (n > 70 ? 56 : n > 48 ? 64 : 74) * T.bodySize;
  return (
    <div style={{position: "absolute", top: 262, left: 66, right: 66, fontFamily: T.body, fontWeight: T.bodyWeight, fontSize: size, lineHeight: 1.16,
      letterSpacing: T.body === INTER ? "-0.03em" : "0", color: T.ink, display: "flex", flexWrap: "wrap", gap: "0 0.26em",
      filter: T.look === "chalkboard" ? "url(#p-chalk-lite)" : T.textFilter}}>
      {ws.map((w, i) => {
        const shown = first || t >= w.start - 0.06;
        const p = first ? 1 : pop(w.start - 0.06, 14);
        const isAcc = b.accent && clean(w.text) === clean(b.accent);
        const isSel = b.select && clean(w.text) === clean(b.select);
        const on = first ? 1 : Math.min(pop(w.start + 0.08), 1);
        const sel = isSel && (T.look === "watercolor" || T.look === "risograph"
          ? <span style={{position: "absolute", left: -10, right: -10, top: "18%", bottom: "-4%", background: rgba(T.hi, T.look === "risograph" ? 0.8 : 0.55), filter: T.edge,
            mixBlendMode: "multiply", transformOrigin: "left", transform: `scaleX(${on}) rotate(-1.5deg)`}} />
          : <span style={{position: "absolute", left: -16, right: -16, top: "-6%", bottom: "-10%", borderRadius: T.look === "blueprint" ? 0 : "50%",
            border: `${T.look === "blueprint" ? 3 : 6}px ${T.look === "blueprint" ? "dashed" : "solid"} ${T.hi}`, opacity: on, transform: `rotate(-3deg) scale(${0.85 + 0.15 * on})`,
            filter: T.edge}} />);
        return (
          <span key={i} style={{position: "relative", display: "inline-block", opacity: shown ? Math.min(p * 1.6, 1) : 0, transform: `translateY(${(1 - Math.min(p, 1)) * 22}px)`}}>
            {sel}
            <span style={{position: "relative", ...(isAcc ? {fontFamily: T.display, fontWeight: T.look === "blueprint" ? 700 : 400, color: T.neg, fontSize: "1.2em", lineHeight: 0.85,
              textTransform: T.displayUpper ? "uppercase" : undefined, letterSpacing: 0} : {})}}>{w.text}</span>
            {isAcc && <Underline on={on} color={T.neg} />}
          </span>
        );
      })}
    </div>
  );
};

const Splatter: React.FC<{at: number; b: Beat; color: string}> = ({at, b, color}) => {
  const T = useTheme();
  const {pop} = useBeat(b);
  if (!T.solid) return null;
  const p = Math.min(pop(at, 9), 1);
  const dots = [[140, 120, 46], [880, 90, 30], [930, 520, 54], [90, 560, 26], [520, 40, 22], [760, 640, 34], [260, 650, 40]];
  return <>{dots.map(([x, y, r], i) => (
    <div key={i} style={{position: "absolute", left: x, top: TOP + y, width: r * 2 * p, height: r * 2 * p, marginLeft: -r * p, marginTop: -r * p, borderRadius: "50%",
      background: T.look === "risograph" ? halftone(color, 0.9, 8) : color, opacity: 0.85, filter: T.edge, mixBlendMode: "multiply"}} />
  ))}</>;
};

// the look's big colour field behind a slam / counter / splash
const Field: React.FC<{color: string; k: number; w?: number; h?: number; top?: number; rot?: number}> = ({color, k, w = 940, h = 560, top = TOP + 40, rot = -4}) => {
  const T = useTheme();
  const base: React.CSSProperties = {position: "absolute", top, left: (1080 - w) / 2, width: w, height: h, transform: `scale(${0.6 + 0.4 * k}) rotate(${rot}deg)`};
  if (T.look === "watercolor") return <div style={{...base, borderRadius: "48%", background: color, opacity: 0.32 * k, filter: "url(#p-wash)"}} />;
  if (T.look === "risograph") return <div style={{...base, borderRadius: "50%", background: halftone(color, 0.85, 10), opacity: k, mixBlendMode: "multiply", filter: T.edge}} />;
  if (T.look === "blueprint") return <div style={{...base, border: `2px dashed ${rgba(T.ink, 0.5)}`, opacity: k}} />;
  if (T.look === "crayon") return <div style={{...base, borderRadius: "50%", opacity: k, filter: T.edge, border: `8px solid ${T.ink}`,
    background: `repeating-linear-gradient(-30deg, ${rgba(color, 0.55)} 0 10px, transparent 10px 17px)`}} />;
  return <div style={{...base, borderRadius: "50%", border: `7px solid ${color}`, opacity: 0.9 * k, filter: T.edge}} />;
};

const Slam: React.FC<{b: Beat; color: string}> = ({b, color}) => {
  const T = useTheme();
  const {pop, lt} = useBeat(b);
  const words = (b.text || "").split(" ");
  const len = (b.text || "").length;
  const size = (len <= 8 ? 250 : len <= 14 ? 184 : len <= 24 ? 140 : 108) * (T.look === "blueprint" || T.look === "risograph" ? 0.95 : 1);
  const first = b.start < 0.2;
  const k = first ? 1 : Math.min(pop(b.start + 0.02, 14), 1);
  return (
    <>
      <Field color={color} k={k} />
      {!first && <Splatter at={b.start + 0.12} b={b} color={color} />}
      <div style={{position: "absolute", top: TOP, left: 50, right: 50, height: 640, display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center",
        gap: "0 34px", textAlign: "center", transform: `scale(${1 + lt * 0.012}) rotate(${T.look === "blueprint" ? 0 : -2}deg)`, filter: T.textFilter}}>
        {words.map((w, i) => {
          const p = first ? 1 : pop(b.start + 0.06 + i * 0.09, 9);
          const red = (b.accent && clean(w) === clean(b.accent)) || /[$€£]\d|\d+%/.test(w);
          return (
            <span key={i} style={{display: "inline-block", fontFamily: T.display, fontWeight: T.look === "blueprint" ? 700 : 400, fontSize: red ? size * 1.12 : size, lineHeight: 0.98,
              color: red ? T.neg : T.ink, textTransform: T.displayUpper ? "uppercase" : undefined, textShadow: T.displayShadow,
              opacity: Math.min(p * 2, 1), transform: `scale(${first ? 1 : 1.8 - 0.8 * Math.min(p, 1.06)}) rotate(${T.look === "blueprint" ? 0 : i % 2 ? 3 : -3}deg)`}}>{w}</span>
          );
        })}
        {b.sub && <div style={{width: "100%", marginTop: 26, fontFamily: T.hand, fontWeight: 700, fontSize: 60, color: T.muted, opacity: first ? 1 : pop(b.start + 0.45)}}>{b.sub}</div>}
      </div>
    </>
  );
};

const Counter: React.FC<{b: Beat; color: string}> = ({b, color}) => {
  const T = useTheme();
  const {t, pop} = useBeat(b);
  const dur = Math.min(1.4, (b.end - b.start) * 0.7);
  const k = interpolate(t, [b.start + 0.15, b.start + 0.15 + dur], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3)});
  const v = (b.from ?? 0) + ((b.to ?? 0) - (b.from ?? 0)) * k;
  const dec = Math.abs((b.to ?? 0) % 1) > 0 ? 2 : 0;
  const txt = `${b.prefix ?? ""}${v.toLocaleString("en-US", {minimumFractionDigits: dec, maximumFractionDigits: dec})}${b.suffix ?? ""}`;
  const done = Math.min(pop(b.start + 0.15 + dur, 8), 1);
  return (
    <>
      <Field color={color} k={0.8 + 0.2 * done} w={820} h={480} top={TOP + 80} rot={-3} />
      <div style={{position: "absolute", top: TOP, left: 0, right: 0, height: 640, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", filter: T.textFilter}}>
        {b.label && <div style={{fontFamily: T.hand, fontWeight: 700, fontSize: 56, color: T.muted, opacity: pop(b.start), textTransform: T.look === "blueprint" ? "uppercase" : undefined}}>{b.label}</div>}
        <div style={{fontFamily: T.display, fontWeight: T.look === "blueprint" ? 700 : 400, fontSize: txt.length > 7 ? 220 : 280, lineHeight: 1, color: T.neg, textShadow: T.displayShadow,
          fontVariantNumeric: "tabular-nums", transform: `scale(${1 + 0.1 * Math.sin(done * Math.PI)}) rotate(${T.look === "blueprint" ? 0 : -3}deg)`}}>{txt}</div>
        {b.sub && <div style={{fontFamily: T.body, fontWeight: T.bodyWeight, fontSize: 54, color: T.ink, marginTop: 6, opacity: done}}>{b.sub}</div>}
      </div>
    </>
  );
};

const Pin: React.FC<{x: number; y: number; r: number}> = ({x, y, r}) => {
  const T = useTheme();
  if (T.look === "whiteboard") return <div style={{position: "absolute", left: x + 60, top: y + 10, width: 54, height: 54, borderRadius: "50%",
    background: "radial-gradient(circle at 35% 30%, #fff 0 10%, #E26A4A 30%, #A63A22)", boxShadow: "4px 8px 10px rgba(0,0,0,0.3)"}} />;
  if (T.look === "blueprint") return null;
  if (T.look === "risograph") return <div style={{position: "absolute", left: x, top: y, width: 190, height: 56, background: halftone(T.pig[0], 0.8, 8), mixBlendMode: "multiply",
    transform: `rotate(${r}deg)`}} />;
  return <div style={{position: "absolute", left: x, top: y, width: 190, height: 56, background: T.look === "chalkboard" ? "rgba(238,237,227,0.75)" : rgba("#E6A93A", 0.55),
    transform: `rotate(${r}deg)`, filter: T.edge}} />;
};

const App: React.FC<{b: Beat}> = ({b}) => {
  const T = useTheme();
  const {lt, pop} = useBeat(b);
  if (!b.image) return null;
  const p = Math.min(pop(b.start + 0.1), 1);
  const tall = b.image.h > b.image.w * 1.15;
  const frameBg: React.CSSProperties = T.look === "watercolor" ? {background: T.card, filter: T.edge, boxShadow: "0 30px 70px rgba(80,60,30,0.22)"}
    : T.look === "whiteboard" ? {background: "#fff", border: `7px solid ${T.ink}`, borderRadius: 14, filter: T.edge, boxShadow: "0 18px 40px rgba(0,0,0,0.12)"}
      : T.look === "blueprint" ? {border: `3px solid ${T.ink}`, outline: `1.5px solid ${rgba(T.ink, 0.6)}`, outlineOffset: -12}
        : T.look === "risograph" ? {background: T.pig[1], transform: "translate(10px, 8px)", mixBlendMode: "multiply", opacity: 0.7, filter: T.edge}
          : {border: `6px solid ${T.ink}`, filter: T.edge};
  return (
    <>
      <div style={{position: "absolute", top: TOP + 20, ...(tall ? {left: 270, width: 420, height: 746} : {left: 64, width: 952, height: 640}),
        transform: `rotate(${T.look === "blueprint" ? 0 : -2 + (1 - p) * -4}deg) scale(${0.94 + 0.06 * p})`}}>
        <div style={{position: "absolute", inset: T.look === "watercolor" ? -26 : -18, ...frameBg}} />
        <div style={{position: "absolute", inset: 0, overflow: "hidden", borderRadius: 6}}>
          <Img src={staticFile(b.image.src)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: tall ? "50% 0%" : "50% 30%",
            transform: tall ? `scale(${1.02 + lt * 0.01})` : `scale(${1.12 + lt * 0.035}) translateX(${-lt * 8}px)`}} />
          {T.solid && <AbsoluteFill style={{filter: "url(#p-grain)", background: "#fff", opacity: 0.18, mixBlendMode: "multiply"}} />}
        </div>
        {T.look === "blueprint" && <div style={{position: "absolute", left: 0, top: -58, fontFamily: F.tech, fontSize: 32, color: T.muted}}>FIG. A — THE APP, IN USE</div>}
        <Pin x={-60} y={-30} r={-24} />
        <Pin x={tall ? 300 : 830} y={-24} r={21} />
      </div>
      {b.text && (
        <div style={{position: "absolute", top: tall ? TOP + 640 : TOP + 600, right: tall ? 40 : 70, transform: `scale(${Math.min(pop(b.start + 0.3, 9), 1.04)}) rotate(${T.look === "blueprint" ? 0 : -3}deg)`}}>
          <Patch mode={T.solid ? "fill" : "card"} color={T.acc} radius={40}>
            <div style={{padding: "14px 40px 20px", fontFamily: T.display, fontWeight: T.look === "blueprint" ? 700 : 400, fontSize: 66, color: T.solid ? T.accInk : T.acc,
              whiteSpace: "nowrap", textTransform: T.displayUpper ? "uppercase" : undefined, filter: T.textFilter}}>{b.text}</div>
          </Patch>
        </div>
      )}
    </>
  );
};

const Versus: React.FC<{b: Beat; dir: string; icon?: string}> = ({b, dir, icon}) => {
  const T = useTheme();
  const {t, pop} = useBeat(b);
  const strike = interpolate(t, [b.start + 0.6, b.start + 1.05], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3)});
  const vs = Math.min(pop(b.start + 0.3, 8), 1);
  const pm = (b.price || "").match(/^\s*([$€£]?\s?[\d.,]+\s?[€£]?)(.*)$/);
  const priceMain = pm ? pm[1].trim() : b.price || "";
  const priceRest = (pm ? pm[2] : "").trim().replace(/^\/mo$/, "a month").replace(/^\/yr$/, "a year").replace(/^one-time$/, "once");
  const dw = T.look === "blueprint" ? 700 : 400;
  const card = (children: React.ReactNode, left: number, top: number, rot: number, p: number) => (
    <div style={{position: "absolute", left, top, width: 430, opacity: Math.min(p * 1.5, 1), transform: `rotate(${T.look === "blueprint" ? 0 : rot}deg) scale(${0.8 + 0.2 * Math.min(p, 1)})`}}>
      <Patch radius={34}><div style={{padding: "34px 20px 30px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, filter: T.textFilter}}>{children}</div></Patch>
    </div>
  );
  const freeCol = T.look === "watercolor" ? T.acc : T.look === "crayon" ? "#2E8F3E" : T.look === "risograph" ? T.pig[1] : T.look === "blueprint" ? T.ink : T.hi;
  return (
    <div style={{position: "absolute", top: TOP, left: 0, right: 0, height: 700}}>
      {card(<>
        <div style={{fontFamily: T.body, fontWeight: T.bodyWeight, fontSize: 42, color: T.ink, textAlign: "center", lineHeight: 1.1}}>{b.paid}</div>
        <div style={{position: "relative", fontFamily: T.display, fontWeight: dw, fontSize: priceMain.length > 6 ? 104 : 124, color: T.neg, whiteSpace: "nowrap", lineHeight: 1.05,
          textShadow: T.displayShadow}}>
          {priceMain}
          <svg viewBox="0 0 200 40" preserveAspectRatio="none" style={{position: "absolute", left: -20, right: -20, top: "38%", width: "calc(100% + 40px)", height: 46, overflow: "visible"}}>
            <path d="M4 30 C 70 18, 130 26, 196 6" stroke={T.ink} strokeWidth={11} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1}
              strokeDashoffset={1 - strike} style={{filter: T.edge}} />
          </svg>
        </div>
        {priceRest && <div style={{fontFamily: T.hand, fontWeight: 700, fontSize: 48, color: T.muted, marginTop: -8}}>{priceRest}</div>}
      </>, 40, 110, -4, pop(b.start))}
      {card(<>
        {icon ? <Img src={staticFile(`${dir}/${icon}`)} style={{width: 104, height: 104, borderRadius: 24}} /> : <GitMark size={104} fg={T.ink} accent={T.acc} />}
        <div style={{fontFamily: T.body, fontWeight: T.bodyWeight, fontSize: 42, color: T.ink, textAlign: "center", lineHeight: 1.1}}>{b.name}</div>
        <div style={{fontFamily: T.display, fontWeight: dw, fontSize: 140, lineHeight: 1, color: freeCol, textShadow: T.displayShadow}}>$0</div>
      </>, 610, 230, 4, pop(b.start + 0.15))}
      {T.look === "blueprint"
        ? <div style={{position: "absolute", top: 400, left: 0, right: 0, textAlign: "center", opacity: Math.min(vs * 2, 1)}}>
          <span style={{display: "inline-block", padding: "6px 26px", border: "6px solid #D8322B", color: "#D8322B", fontFamily: F.oswald, fontWeight: 700, fontSize: 84,
            transform: `rotate(-10deg) scale(${1.6 - 0.6 * vs})`, filter: "url(#p-riso)", background: "rgba(216,50,43,0.06)"}}>VS</span>
        </div>
        : <div style={{position: "absolute", top: 380, left: 0, right: 0, textAlign: "center", fontFamily: T.display, fontSize: 150, color: T.neg, filter: T.textFilter,
          textTransform: T.displayUpper ? "uppercase" : undefined, textShadow: T.displayShadow, opacity: Math.min(vs * 2, 1), transform: `scale(${1.8 - 0.8 * vs}) rotate(-8deg)`}}>vs</div>}
    </div>
  );
};

const List: React.FC<{b: Beat}> = ({b}) => {
  const T = useTheme();
  const {pop} = useBeat(b);
  return (
    <div style={{position: "absolute", top: TOP + 30, left: 80, right: 70, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 46}}>
      {b.text && <div style={{fontFamily: T.hand, fontWeight: 700, fontSize: 60, color: T.muted, opacity: pop(b.start), filter: T.textFilter,
        textTransform: T.look === "blueprint" ? "uppercase" : undefined}}>{b.text}</div>}
      {(b.items || []).map((it, i) => {
        const p = Math.min(pop(it.at, 10), 1);
        const c = T.pig[i % T.pig.length];
        return (
          <div key={i} style={{marginLeft: i * 46, opacity: Math.min(p * 1.6, 1), transform: `translateX(${(1 - p) * 260}px) rotate(${T.look === "blueprint" ? 0 : i % 2 ? 2 : -2}deg)`}}>
            <Patch mode="fill" color={c} radius={60}>
              <div style={{padding: "14px 48px 22px 30px", display: "flex", alignItems: "center", gap: 20, fontFamily: T.display, fontWeight: T.look === "blueprint" ? 700 : 400,
                fontSize: (it.label.length > 16 ? 72 : 88) * (T.look === "risograph" || T.look === "blueprint" ? 0.85 : 1), color: onFill(T, c), whiteSpace: "nowrap",
                textTransform: T.displayUpper ? "uppercase" : undefined, filter: T.textFilter}}>
                <span style={{fontSize: "0.8em"}}>{it.label.toLowerCase().startsWith("no ") ? "✕" : "✓"}</span>{it.label}
              </div>
            </Patch>
          </div>
        );
      })}
    </div>
  );
};

// replaces Kit's speech bubble: the exclamation in the look's display face on its colour field
const Splash: React.FC<{b: Beat; color: string}> = ({b, color}) => {
  const T = useTheme();
  const {pop, lt} = useBeat(b);
  const p = Math.min(pop(b.start + 0.08, 9), 1.05);
  if (!b.text) return null;
  const solidBlob = T.look === "watercolor"
    ? <div style={{position: "absolute", width: 900, height: 560, borderRadius: "46% 54% 52% 48%", background: color, opacity: 0.9, filter: "url(#p-wash)",
      transform: `scale(${0.5 + 0.5 * p}) rotate(${-3 + Math.sin(lt * 3) * 1.2}deg)`}} />
    : T.look === "risograph"
      ? <><div style={{position: "absolute", width: 860, height: 560, borderRadius: "50%", background: T.pig[1], opacity: 0.6, mixBlendMode: "multiply", filter: T.edge,
        transform: `translate(12px, 9px) scale(${0.5 + 0.5 * p})`}} />
        <div style={{position: "absolute", width: 860, height: 560, borderRadius: "50%", background: color, mixBlendMode: "multiply", filter: T.edge, transform: `scale(${0.5 + 0.5 * p})`}} /></>
      : null;
  return (
    <div style={{position: "absolute", top: TOP + 10, left: 60, right: 60, height: 620, display: "flex", alignItems: "center", justifyContent: "center"}}>
      {solidBlob ?? (
        <div style={{position: "absolute", width: 880, height: 520, opacity: Math.min(p * 2, 1), transform: `scale(${0.7 + 0.3 * p})`}}>
          <Patch mode="fill" color={T.look === "blueprint" ? T.ink : color} radius={T.look === "blueprint" ? 0 : 260} style={{width: 880, height: 520}} />
          {T.look === "blueprint" && <div style={{position: "absolute", top: 18, left: 26, fontFamily: F.tech, fontSize: 30, color: T.muted}}>NOTE / {Math.max(1, Math.round(b.start))}</div>}
        </div>
      )}
      <Splatter at={b.start + 0.1} b={b} color={color} />
      <div style={{position: "relative", maxWidth: 800, textAlign: "center", fontFamily: T.display, fontWeight: T.look === "blueprint" ? 700 : 400,
        fontSize: (b.text.length > 24 ? 104 : 128) * (T.displayUpper ? 0.85 : 1), lineHeight: 1.04, color: T.solid ? "#fff" : T.look === "blueprint" || T.look === "crayon" ? T.ink : color,
        textTransform: T.displayUpper ? "uppercase" : undefined, textShadow: T.solid ? "0 4px 0 rgba(0,0,0,0.12)" : undefined, filter: T.textFilter,
        opacity: Math.min(p * 2, 1), transform: `scale(${0.7 + 0.3 * p}) rotate(${T.look === "blueprint" ? 0 : -3}deg)`}}>{b.text}</div>
    </div>
  );
};

const Cta: React.FC<{b: Beat; keyword: string}> = ({b, keyword}) => {
  const T = useTheme();
  const {t, pop} = useBeat(b);
  const a = pop(b.start), m = Math.min(pop(b.start + 0.35, 8), 1.05), c = pop(b.start + 1.0);
  const wig = Math.sin((t - b.start) * 8) * 3 * Math.max(0, 1 - (t - b.start - 0.6) / 1.2);
  const kw = keyword.toUpperCase();
  const stamp = T.look === "blueprint";
  return (
    <AbsoluteFill style={{alignItems: "center"}}>
      <div style={{position: "absolute", top: TOP - 60, fontFamily: T.display, fontWeight: stamp ? 700 : 400, fontSize: T.displayUpper ? 140 : 170, color: T.ink, opacity: a,
        textTransform: T.displayUpper ? "uppercase" : undefined, textShadow: T.displayShadow, filter: T.textFilter, transform: `rotate(${stamp ? 0 : -3}deg)`}}>Comment</div>
      <div style={{position: "absolute", top: TOP + 170, opacity: Math.min(m * 1.5, 1), transform: `scale(${0.4 + 0.6 * m}) rotate(${wig - (stamp ? 8 : 3)}deg)`}}>
        {stamp
          // the blueprint's one non-blue colour, used once: a red rubber stamp carries the verdict
          ? <div style={{padding: "6px 50px 10px", border: "10px solid #D8322B", outline: "3px solid #D8322B", outlineOffset: 8, color: "#D8322B", fontFamily: F.oswald, fontWeight: 700,
            fontSize: kw.length > 6 ? 170 : 210, lineHeight: 1, filter: "url(#p-riso)", background: "rgba(216,50,43,0.08)"}}>{kw}</div>
          : <Patch mode="fill" color={T.acc} radius={70}>
            <div style={{padding: "10px 70px 26px", fontFamily: T.display, fontSize: (kw.length > 6 ? 180 : 230) * (T.displayUpper ? 0.85 : 1), lineHeight: 1,
              color: T.solid || T.look === "crayon" ? T.accInk : T.acc, filter: T.textFilter}}>{kw}</div>
          </Patch>}
      </div>
      <div style={{position: "absolute", top: TOP + 540, opacity: c, transform: `rotate(${stamp ? 0 : 2}deg)`}}>
        <Patch radius={50}>
          <div style={{padding: "14px 36px 18px", fontFamily: T.hand, fontWeight: 700, fontSize: stamp ? 46 : 62, color: T.ink, filter: T.textFilter,
            textTransform: stamp ? "uppercase" : undefined}}>💬 I'll DM you the link</div>
        </Patch>
      </div>
    </AbsoluteFill>
  );
};

export type PaintProps = StoryProps & {look?: Look};

export const PaintStory: React.FC<PaintProps> = (props) => {
  const p = {...props, beats: props.beats.map((b, i) => (i === 0 ? {...b, start: 0} : b))};
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const slotAcc = accentFor(p.accent);
  const T = (THEMES[p.look ?? "watercolor"] ?? THEMES.watercolor)(slotAcc);
  const cur = p.beats.find((b) => t >= b.start && t < b.end) ?? p.beats[p.beats.length - 1];
  const idx = p.beats.indexOf(cur);
  const slam = p.beats.find((b, i) => i > 0 && b.scene === "slam" && t >= b.start + 0.12 && t < b.start + 0.4);
  const sh = slam ? Math.max(0, 1 - (t - slam.start - 0.12) / 0.28) * 3 : 0;
  const shake = sh ? `translate(${Math.sin(t * 90) * sh}px, ${Math.cos(t * 77) * sh}px)` : undefined;
  const pig = (i: number) => (T.look === "watercolor" && i % 2 === 0 ? T.acc : T.pig[i % T.pig.length]);
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
    <ThemeCtx.Provider value={T}>
      <AccentCtx.Provider value={{...slotAcc, hex: T.acc, ink: T.accInk}}>
        <AbsoluteFill style={{background: T.paper}}>
          <Defs />
          <Background />
          <AbsoluteFill style={{transform: [shake, T.look === "crayon" ? (() => { const n = Math.floor(frame / 2);
            return `translate(${(Math.sin(n * 12.9898) * 43758.5453 % 1) * 0.7}px, ${(Math.sin(n * 78.233) * 12345.678 % 1) * 0.7}px)`; })() : ""].filter(Boolean).join(" ") || undefined}}>
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
                  {b.scene === "character" && <Splash b={b} color={T.look === "risograph" ? T.pig[0] : T.look === "whiteboard" ? T.pig[0] : pig(i + 1)} />}
                  {b.scene === "cta" && <Cta b={b} keyword={p.keyword} />}
                </Wipe>
              </Sequence>
            ))}
          </AbsoluteFill>
          {/* where Kit used to sit: the app icon in a frame, bobbing gently (hidden on the CTA) */}
          {p.icon && cur.scene !== "cta" && (
            <div style={{position: "absolute", left: 700, top: 1380, transform: `rotate(${T.look === "blueprint" ? 0 : 4 + Math.sin(t * 1.6) * 3}deg) translateY(${Math.sin(t * 2.1) * 8}px)`}}>
              <Patch radius={60}>
                <div style={{padding: 26, display: "flex", flexDirection: "column", alignItems: "center", gap: 4}}>
                  <Img src={staticFile(`${p.dir}/${p.icon}`)} style={{width: 200, height: 200, borderRadius: 44}} />
                  <span style={{fontFamily: T.hand, fontWeight: 700, fontSize: T.look === "blueprint" || T.look === "risograph" ? 34 : 46, color: T.ink, filter: T.textFilter,
                    textTransform: T.look === "blueprint" ? "uppercase" : undefined}}>{p.name}</span>
                </div>
              </Patch>
            </div>
          )}
          <div style={{position: "absolute", bottom: 222, left: 66, transform: `rotate(${T.look === "blueprint" ? 0 : -2}deg)`}}>
            <Patch radius={40}>
              <div style={{display: "flex", alignItems: "center", gap: 10, padding: "8px 24px 8px 12px"}}>
                <GitMark size={42} fg={T.ink} accent={T.acc} />
                <span style={{fontFamily: T.hand, fontWeight: 700, fontSize: T.look === "blueprint" || T.look === "risograph" ? 32 : 44, color: T.ink, filter: T.textFilter}}>@itsongit</span>
              </div>
            </Patch>
          </div>
          <Audio src={staticFile(`${p.dir}/vo.wav`)} />
          <Sfx cues={cues} />
        </AbsoluteFill>
      </AccentCtx.Provider>
    </ThemeCtx.Provider>
  );
};
