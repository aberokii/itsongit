import React from "react";
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig, spring} from "remotion";
import type {Word} from "./kit";

// Clay look for the "clay" skin: a plasticine stop-motion feel drawn in 2D SVG. Characters get a bumpy, lit clay
// surface (specular lighting on a blurred alpha), fingerprint grain and a tiny "boil" (the displacement noise seed
// changes every 2 frames, like re-posed clay between stop-motion shots). Text never goes through the filter.
// Original designs; no borrowed characters, logos or brand marks.

export const ClayFilter: React.FC<{id: string; boil?: boolean}> = ({id, boil = true}) => {
  const frame = useCurrentFrame();
  const seed = boil ? Math.floor(frame / 2) % 7 : 1;
  return (
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={seed} result="wob" />
      <feDisplacementMap in="SourceGraphic" in2="wob" scale={3.2} xChannelSelector="R" yChannelSelector="G" result="shape" />
      <feGaussianBlur in="shape" stdDeviation={3.2} result="soft" />
      <feSpecularLighting in="soft" surfaceScale={4} specularConstant={0.55} specularExponent={16} lightingColor="#fff6ea" result="spec">
        <fePointLight x={-120} y={-260} z={260} />
      </feSpecularLighting>
      <feComposite in="spec" in2="shape" operator="in" result="specIn" />
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={1} seed={seed + 3} result="grain" />
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.15  0 0 0 0 0.08  0 0 0 -0.45 0.24" result="grainA" />
      <feComposite in="grainA" in2="shape" operator="in" result="grainIn" />
      <feComposite in="shape" in2="specIn" operator="arithmetic" k1={0} k2={1} k3={0.75} k4={0} result="lit" />
      <feComposite in="grainIn" in2="lit" operator="over" />
    </filter>
  );
};

// the set: a warm paper "cyc" sweep, a clay tabletop at the bottom, soft key light from top-left
export const ClayBg: React.FC = () => {
  const frame = useCurrentFrame();
  const jit = (random(`cam${Math.floor(frame / 2)}`) - 0.5) * 1.6; // stop-motion camera nudge
  return (
    <AbsoluteFill style={{transform: `translate(${jit}px, ${-jit}px)`}}>
      <AbsoluteFill style={{background: "radial-gradient(ellipse at 30% 18%, #FBF1E3, #EAD7BF 55%, #D9C0A0 100%)"}} />
      <div style={{position: "absolute", left: -40, right: -40, top: 1500, bottom: -40, borderRadius: "50% 50% 0 0 / 60px 60px 0 0",
        background: "linear-gradient(#C98F68, #B27752)", boxShadow: "inset 0 14px 22px rgba(255,235,210,0.45), inset 0 -30px 50px rgba(60,30,10,0.35)"}} />
      <svg width={1080} height={1920} style={{position: "absolute", inset: 0, opacity: 0.35, mixBlendMode: "multiply"}}>
        <filter id="paperGrain"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={2} seed={4} /><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0.35 0" /></filter>
        <rect width="1080" height="1920" filter="url(#paperGrain)" />
      </svg>
    </AbsoluteFill>
  );
};

export const ClayOverlay: React.FC = () => (
  <AbsoluteFill style={{boxShadow: "inset 0 0 240px 30px rgba(80,45,20,0.35)", pointerEvents: "none"}} />
);

// faux-clay bevel for HTML cards (keeps text crisp)
export const clayCard = (bg: string): React.CSSProperties => ({
  background: bg, borderRadius: 40,
  boxShadow: "inset 0 8px 14px rgba(255,248,236,0.55), inset 0 -14px 22px rgba(70,40,20,0.22), 0 26px 0 -6px rgba(90,55,30,0.18), 0 34px 60px rgba(90,55,30,0.28)",
});

const syl = (w: string) => Math.max(1, (w.toLowerCase().match(/[aeiouy]+/g) || []).length);
export const mouthAt = (words: Word[], t: number) => {
  const w = words.find((x) => t >= x.start && t < x.end + 0.02);
  if (!w) return 0.05;
  const p = (t - w.start) / Math.max(0.08, w.end - w.start);
  return 0.25 + 0.75 * Math.abs(Math.sin(p * Math.PI * syl(w.text)));
};

// "Claude" in the dialogue reels: an original clay buddy (a soft terracotta pebble with a speech-bubble tail, dot eyes
// and a mono ">_" badge). Deliberately NOT any company logo or official mascot; the name tag is text only.
export type BuddyMood = "neutral" | "smug" | "excited" | "point" | "worried" | "shock";
export const ClayBuddy: React.FC<{words: Word[]; mood: BuddyMood; moodAt: number; size?: number; talking: boolean; name?: string}> = ({
  words, mood, moodAt, size = 380, talking, name = "Claude",
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const react = spring({frame: frame - moodAt * fps, fps, config: {damping: 9, stiffness: 200, mass: 0.7}});
  const sq = 1 + 0.07 * Math.sin(Math.min(react, 1) * Math.PI);
  const m = talking ? mouthAt(words, t) : 0.05;
  const blink = ((t + 0.8) % 4.1) < 0.12 ? 0.12 : 1;
  const bob = Math.sin(t * 2.1 + 1) * 5;
  const lookX = mood === "point" ? -5 : Math.sin(t * 0.6) * 2;
  const arm = mood === "point" ? -55 : mood === "excited" ? -120 : mood === "smug" ? 20 : 8 + Math.sin(t * 2) * 5;
  const body = "#D9774F", shade = "#B85C38", ink = "#3A2418";
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 200 240" style={{overflow: "visible"}}>
      <defs><ClayFilter id="clayBuddy" /></defs>
      <g transform={`translate(0 ${bob}) translate(100 235) scale(${sq} ${2 - sq}) translate(-100 -235)`}>
      <g filter="url(#clayBuddy)">
        <ellipse cx={100} cy={236} rx={70} ry={9} fill="rgba(70,35,15,0.28)" />
        {/* arm (viewer's left) */}
        <g transform={`rotate(${arm} 48 150)`}><path d="M48 150 L14 168" stroke={shade} strokeWidth={22} strokeLinecap="round" /><circle cx={12} cy={169} r={13} fill={body} /></g>
        {/* body: rounded pebble with a little speech-bubble tail */}
        <path d="M100 58 C160 58, 178 102, 176 150 C174 200, 140 228, 100 228 C60 228, 26 200, 24 150 C22 102, 40 58, 100 58 Z" fill={body} />
        <path d="M150 210 L176 236 L134 220 Z" fill={body} />
        <path d="M40 170 C52 210, 90 222, 120 220" stroke={shade} strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.6} />
        {/* other arm */}
        <g transform={`rotate(${-8 + Math.sin(t * 2 + 2) * 4} 152 152)`}><path d="M152 152 L184 170" stroke={shade} strokeWidth={22} strokeLinecap="round" /><circle cx={186} cy={171} r={13} fill={body} /></g>
        {/* face */}
        <ellipse cx={80 + lookX} cy={120} rx={9} ry={(mood === "shock" ? 15 : 12) * blink} fill={ink} />
        <ellipse cx={120 + lookX} cy={120} rx={9} ry={(mood === "shock" ? 15 : 12) * blink} fill={ink} />
        <circle cx={83 + lookX} cy={115} r={3} fill="#fff" opacity={blink > 0.5 ? 0.9 : 0} />
        <circle cx={123 + lookX} cy={115} r={3} fill="#fff" opacity={blink > 0.5 ? 0.9 : 0} />
        <ellipse cx={66} cy={142} rx={11} ry={6} fill="#F2A27E" opacity={0.8} />
        <ellipse cx={134} cy={142} rx={11} ry={6} fill="#F2A27E" opacity={0.8} />
        {mood === "smug" && m < 0.2
          ? <path d="M88 150 Q100 160 114 148" stroke={ink} strokeWidth={5} fill="none" strokeLinecap="round" />
          : <ellipse cx={100} cy={152 + m * 3} rx={8 + m * 6} ry={2 + m * 11} fill={ink} />}
        {/* chest badge ">_" */}
        <rect x={78} y={176} width={44} height={26} rx={8} fill="#2E2622" />
      </g>
      <text x={86} y={196} fontFamily="JetBrains Mono" fontWeight={700} fontSize={16} fill="#F7D9B5">{">_"}</text>
      </g>
      <g transform="translate(100 18)">
        <rect x={-58} y={-20} width={116} height={36} rx={18} fill="#FFF7EC" stroke="#CDB89C" strokeWidth={3} />
        <text x={0} y={6} textAnchor="middle" fontFamily="Fredoka" fontWeight={700} fontSize={22} fill={ink}>{name}</text>
      </g>
    </svg>
  );
};
