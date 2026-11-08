import React from "react";
import {interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {C, rgba} from "./brand";
import {useAccent, type Word} from "./kit";
import {ClayFilter} from "./Clay";

// "Kit", the @itsongit cat: the cat head from our GitMark logo, grown a body. Original character (no borrowed design).
// Lip sync comes from the voiceover's word timings: the mouth chatters while a word is spoken (one open/close per
// syllable-ish), rests between words. Blinks every few seconds. Mood changes brows, eyes, mouth and arms.
export type Mood = "neutral" | "shock" | "smug" | "excited" | "worried" | "point";

const syllables = (w: string) => Math.max(1, (w.toLowerCase().match(/[aeiouy]+/g) || []).length);

const useMouth = (words: Word[], t: number) => {
  const w = words.find((x) => t >= x.start && t < x.end + 0.02);
  if (!w) return 0.05;
  const n = syllables(w.text);
  const p = (t - w.start) / Math.max(0.08, w.end - w.start);
  return 0.25 + 0.75 * Math.abs(Math.sin(p * Math.PI * n));
};

export const Mascot: React.FC<{words: Word[]; mood: Mood; moodAt: number; size?: number; talking?: boolean; style?: React.CSSProperties;
  clay?: boolean}> = ({
  words, mood, moodAt, size = 420, talking = true, style, clay = false,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const accent = useAccent();
  const fg = clay ? "#FBF4EA" : "#FFFFFF"; // white fur… (warm off-white clay on the clay set)
  const ink = clay ? "#4A3326" : C.TEXT; // …with charcoal cartoon outlines (soft brown "pressed line" in clay)
  const O = {stroke: ink, strokeWidth: 4.5, strokeLinejoin: "round" as const};
  const react = spring({frame: frame - moodAt * fps, fps, config: {damping: 9, stiffness: 200, mass: 0.7}}); // pop on mood change
  const mouth = talking ? useMouth(words, t) : 0.05; // eslint-disable-line react-hooks/rules-of-hooks
  const blink = ((t + 1.9) % 3.7) < 0.12 ? 0.1 : 1; // never mid-blink on frame 0
  const bob = Math.sin(t * 2.4) * 6;
  const tail = Math.sin(t * 3.1) * 14;
  const shock = mood === "shock";
  const eyeH = shock ? 22 : mood === "smug" ? 7 : mood === "excited" ? 18 : 14;
  const browY = shock ? -14 : mood === "worried" ? -4 : mood === "smug" ? 2 : -6;
  const browTilt = mood === "worried" ? 14 : mood === "smug" ? -10 : shock ? 0 : -4;
  const pupilX = mood === "point" ? 4 : Math.sin(t * 0.7) * 2;
  // arms: angle of the right (viewer's left) and left arm from the shoulder
  const armR = mood === "point" ? -70 : mood === "excited" ? -140 : shock ? -160 : mood === "worried" ? -30 : 15 + Math.sin(t * 2) * 4;
  const armL = mood === "excited" ? 140 : shock ? 160 : mood === "smug" ? 40 : -15 + Math.sin(t * 2 + 1) * 4;
  const scale = 1 + 0.08 * Math.sin(Math.min(react, 1) * Math.PI); // squash/stretch on mood change
  const sweat = mood === "worried" ? interpolate(t % 1.2, [0, 1.2], [0, 26]) : null;
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 200 250" style={{overflow: "visible", ...style}}>
      {clay && <defs><ClayFilter id="clayKit" /></defs>}
      <g filter={clay ? "url(#clayKit)" : undefined} transform={`translate(0 ${bob}) translate(100 245) scale(${scale} ${2 - scale}) translate(-100 -245)`}>
        {/* tail */}
        <path d={`M140 215 C175 210, 180 ${170 + tail}, ${165 + tail / 2} ${150 + tail}`} stroke={ink} strokeWidth={21} strokeLinecap="round" fill="none" />
        <path d={`M140 215 C175 210, 180 ${170 + tail}, ${165 + tail / 2} ${150 + tail}`} stroke={fg} strokeWidth={12} strokeLinecap="round" fill="none" />
        {/* body + hoodie in the accent */}
        <path d="M58 245 C55 190, 70 160, 100 160 C130 160, 145 190, 142 245 Z" fill={accent.hex} {...O} />
        <path d="M80 175 Q100 190 120 175" stroke={accent.ink} strokeWidth={4} fill="none" strokeLinecap="round" />
        <circle cx={100} cy={215} r={7} fill={accent.ink} opacity={0.5} />
        {/* arms */}
        <g transform={`rotate(${armR} 66 180)`}><path d="M66 180 L32 200" stroke={ink} strokeWidth={24} strokeLinecap="round" /><path d="M66 180 L32 200" stroke={accent.hex} strokeWidth={15} strokeLinecap="round" /><circle cx={30} cy={201} r={11} fill={fg} {...O} /></g>
        <g transform={`rotate(${armL} 134 180)`}><path d="M134 180 L168 200" stroke={ink} strokeWidth={24} strokeLinecap="round" /><path d="M134 180 L168 200" stroke={accent.hex} strokeWidth={15} strokeLinecap="round" /><circle cx={170} cy={201} r={11} fill={fg} {...O} /></g>
        {/* head (same shape language as the logo's cat) */}
        <path d="M48 70 L50 18 L84 46 Z M152 70 L150 18 L116 46 Z" fill={fg} {...O} strokeWidth={6} />
        <path d="M56 58 L57 32 L76 47 Z M144 58 L143 32 L124 47 Z" fill={accent.hex} opacity={0.7} />
        <ellipse cx={100} cy={100} rx={62} ry={56} fill={fg} {...O} strokeWidth={5} />
        {/* eyes */}
        {mood === "excited" ? (
          <g>
            <path d="M78 98 l4 -10 l4 10 l10 1 l-8 6 l3 10 l-9 -6 l-9 6 l3 -10 l-8 -6 z" fill={accent.hex} stroke={ink} strokeWidth={2} />
            <path d="M122 98 l4 -10 l4 10 l10 1 l-8 6 l3 10 l-9 -6 l-9 6 l3 -10 l-8 -6 z" fill={accent.hex} stroke={ink} strokeWidth={2} />
          </g>
        ) : (
          <g fill={ink}>
            <ellipse cx={80 + pupilX} cy={100} rx={shock ? 11 : 8} ry={eyeH * blink} />
            <ellipse cx={120 + pupilX} cy={100} rx={shock ? 11 : 8} ry={eyeH * blink} />
            <circle cx={83 + pupilX} cy={95} r={2.5} fill="#fff" opacity={blink > 0.5 ? 1 : 0} />
            <circle cx={123 + pupilX} cy={95} r={2.5} fill="#fff" opacity={blink > 0.5 ? 1 : 0} />
          </g>
        )}
        {/* brows */}
        <path d={`M70 ${80 + browY} l20 0`} transform={`rotate(${browTilt} 80 ${80 + browY})`} stroke={ink} strokeWidth={5} strokeLinecap="round" />
        <path d={`M110 ${80 + browY} l20 0`} transform={`rotate(${-browTilt} 120 ${80 + browY})`} stroke={ink} strokeWidth={5} strokeLinecap="round" />
        {/* nose + mouth (lip sync) */}
        <path d="M96 113 L104 113 L100 118 Z" fill={accent.hex} />
        {mood === "smug" && mouth < 0.2 ? (
          <path d="M88 128 Q102 136 114 124" stroke={ink} strokeWidth={4} fill="none" strokeLinecap="round" />
        ) : (
          <ellipse cx={100} cy={128 + mouth * 3} rx={shock ? 10 : 7 + mouth * 5} ry={1.5 + mouth * (shock ? 14 : 10)} fill={ink} />
        )}
        {/* whiskers */}
        <path d="M44 112 l22 3 M44 122 l22 -1 M156 112 l-22 3 M156 122 l-22 -1" stroke={rgba(ink, 0.4)} strokeWidth={2.5} strokeLinecap="round" />
        {sweat !== null && <path d={`M152 ${70 + sweat} q6 10 0 14 q-6 -4 0 -14`} fill="#58a6ff" opacity={1 - sweat / 30} />}
      </g>
    </svg>
  );
};
