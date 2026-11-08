import React, {createContext, useContext} from "react";
import {AbsoluteFill, random, useCurrentFrame} from "remotion";
import {localFont} from "./fonts";
import {ClayBg, ClayOverlay} from "./Clay";
import {C as PAPER, INTER, MONO, SERIF, Background, rgba, useAccent} from "./kit";

// Visual skins for the story engine (Story.tsx). "paper" is the locked house style (BRAND.md). The others are test
// skins for the developer-first line, adapted from Lemo-Opuscar style prompts (github.com/lemomo-ai/lemo-opuscar,
// MIT): ascii-crt -> "crt", dark-keynote -> "keynote", blueprint -> "blueprint". Palettes and techniques only;
// no code or footage copied. Each theme = colour tokens + fonts + a background + an overlay drawn over everything.
export type ThemeId = "paper" | "crt" | "keynote" | "blueprint" | "clay";
export type Theme = {
  id: ThemeId; dark: boolean;
  BG: string; CARD: string; LINE: string; TEXT: string; MUTED: string; NEG: string; SHADOW: string; SELECT: string;
  SANS: string; SERIF: string; MONO: string; DISPLAY: string; NUM: string; textScale: number;
  serifItalic: boolean;   // the accent word font is italic (paper) or not (crt/keynote)
  glow: (c: string) => string; // text-shadow for lit text (CRT phosphor, keynote accent)
  radius: number;
  accentOverride?: string; // CRT is monochrome: the slot accent is replaced by phosphor
  Bg: React.FC; Overlay: React.FC;
};

const VT = localFont("VT323");
const TIGHT = localFont("Inter Tight");
const ARCH = localFont("Architects Daughter");
const B612 = localFont("B612 Mono");
const FRED = localFont("Fredoka");

const none = () => "none";
const Nothing: React.FC = () => null;

// ── ascii-crt: amber P3 phosphor on unlit glass, scanlines, bloom, vignette, deterministic flicker ──
const PHOS = "#FFB000";
const CrtBg: React.FC = () => <AbsoluteFill style={{background: "radial-gradient(ellipse at 50% 45%, #1c1105, #090604 78%)"}} />;
const CrtOverlay: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <AbsoluteFill style={{background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.34) 0 1px, transparent 1px 3px)", pointerEvents: "none"}} />
      <AbsoluteFill style={{boxShadow: "inset 0 0 260px 60px rgba(0,0,0,0.9)", borderRadius: 70}} />
      <AbsoluteFill style={{background: PHOS, opacity: 0.012 + 0.012 * random(`fl${f}`)}} />
      <AbsoluteFill style={{background: "radial-gradient(ellipse at 50% 40%, rgba(255,176,0,0.06), transparent 60%)"}} />
    </>
  );
};

// ── dark-keynote: near-black, 48px hairline grid, one accent, soft panels ──
const KeyBg: React.FC = () => {
  const accent = useAccent();
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% 38%, ${rgba(accent.hex, 0.1)}, transparent 50%),
      linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px) 0 0 / 48px 48px,
      linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px) 0 0 / 48px 48px,
      radial-gradient(ellipse at 50% 0%, #151822, #0A0B0F 70%)`}} />
  );
};

// ── blueprint: white line work on mottled Prussian blue, drafting grid ──
const BlueBg: React.FC = () => (
  <AbsoluteFill>
    <AbsoluteFill style={{background: "radial-gradient(ellipse at 40% 30%, #2A58A6, #18336B 75%)"}} />
    <svg width={1080} height={1920} style={{position: "absolute", inset: 0, opacity: 0.55, mixBlendMode: "soft-light"}}>
      <filter id="bpn"><feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves={4} seed={3} /><feColorMatrix values="0 0 0 0 0.1  0 0 0 0 0.2  0 0 0 0 0.45  0 0 0 1.2 -0.1" /></filter>
      <rect width="1080" height="1920" filter="url(#bpn)" />
    </svg>
    <AbsoluteFill style={{background: `linear-gradient(rgba(231,240,249,0.08) 1px, transparent 1px) 0 0 / 40px 40px,
      linear-gradient(90deg, rgba(231,240,249,0.08) 1px, transparent 1px) 0 0 / 40px 40px,
      linear-gradient(rgba(231,240,249,0.14) 2px, transparent 2px) 0 0 / 200px 200px,
      linear-gradient(90deg, rgba(231,240,249,0.14) 2px, transparent 2px) 0 0 / 200px 200px`}} />
  </AbsoluteFill>
);
const BlueOverlay: React.FC = () => (
  // title block, bottom-left above the safe line: the drawing's frame
  <div style={{position: "absolute", left: 40, right: 40, top: 150, bottom: 150, border: "3px solid rgba(231,240,249,0.55)", outline: "1px solid rgba(231,240,249,0.3)", outlineOffset: 10}} />
);

export const THEMES: Record<ThemeId, Theme> = {
  paper: {id: "paper", dark: false, ...PAPER, SANS: INTER, SERIF, MONO, DISPLAY: INTER, NUM: INTER, textScale: 1, serifItalic: true, glow: none, radius: 28,
    Bg: Background, Overlay: Nothing},
  crt: {id: "crt", dark: true, BG: "#090604", CARD: "rgba(255,176,0,0.04)", LINE: "rgba(255,176,0,0.55)", TEXT: PHOS, MUTED: "#B86A10",
    NEG: "#FFEBB8", SHADOW: "transparent", SELECT: "#B8E0FF", SANS: VT, SERIF: VT, MONO: VT, DISPLAY: VT, NUM: VT, textScale: 1.3, serifItalic: false,
    glow: (c) => `0 0 2px ${c}, 0 0 10px rgba(255,102,5,0.45), 0 0 30px rgba(255,102,5,0.18)`, radius: 0, accentOverride: PHOS,
    Bg: CrtBg, Overlay: CrtOverlay},
  keynote: {id: "keynote", dark: true, BG: "#0A0B0F", CARD: "#12151C", LINE: "rgba(255,255,255,0.09)", TEXT: "#E8EAF0", MUTED: "#8A90A0",
    NEG: "#FF5A5F", SHADOW: "rgba(0,0,0,0.6)", SELECT: "#8B7CFF", SANS: INTER, SERIF: TIGHT, MONO, DISPLAY: TIGHT, NUM: TIGHT, textScale: 1, serifItalic: false,
    glow: (c) => `0 0 40px ${rgba(c, 0.55)}`, radius: 22, Bg: KeyBg, Overlay: Nothing},
  blueprint: {id: "blueprint", dark: true, BG: "#18336B", CARD: "rgba(13,17,22,0.18)", LINE: "#E7F0F9", TEXT: "#E7F0F9", MUTED: "rgba(231,240,249,0.65)",
    NEG: "#E5462C", SHADOW: "transparent", SELECT: "#F2C14E", SANS: ARCH, SERIF: ARCH, MONO: B612, DISPLAY: ARCH, NUM: B612, textScale: 1.05, serifItalic: false,
    glow: () => "0 0 1.5px rgba(231,240,249,0.7)", radius: 6, Bg: BlueBg, Overlay: BlueOverlay},
  // clay: plasticine stop-motion set (warm paper sweep, clay tabletop), rounded Fredoka type, characters through
  // the clay SVG filter (Clay.tsx). Built for the two-character dialogue reels (Kit asks, the assistant answers).
  clay: {id: "clay", dark: false, BG: "#EAD7BF", CARD: "#FFF7EC", LINE: "#D9C3A5", TEXT: "#3A2418", MUTED: "#8A6A52", NEG: "#D9572B",
    SHADOW: "rgba(90,55,30,0.28)", SELECT: "#3F7BE0", SANS: FRED, SERIF: FRED, MONO, DISPLAY: FRED, NUM: FRED, textScale: 1.06,
    serifItalic: false, glow: none, radius: 40, Bg: ClayBg, Overlay: ClayOverlay},
};

export const ThemeCtx = createContext<Theme>(THEMES.paper);
export const useTheme = () => useContext(ThemeCtx);
