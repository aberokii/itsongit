import React from "react";
import {AbsoluteFill} from "remotion";
import {accentFor, C} from "./brand";

// The itsongit mark: a git branch graph (main line, two commits) whose branch ends in a play button, meaning
// "git + video". Reads as GitHub-related without using GitHub's own logo.
export const GitMark: React.FC<{size: number; fg?: string; accent?: string; style?: React.CSSProperties}> = ({size, fg = C.TEXT, accent = accentFor(0).hex, style}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
    <path d="M34 30 V80" stroke={fg} strokeWidth={8} strokeLinecap="round" fill="none" />
    <path d="M34 66 C34 48, 60 54, 60 40" stroke={fg} strokeWidth={8} strokeLinecap="round" fill="none" />
    {/* the top commit is a cat head sitting on the branch: an original nod to GitHub's Octocat */}
    <path d="M21 22 L22 6 L32 14 Z M47 22 L46 6 L36 14 Z" fill={fg} stroke={fg} strokeWidth={3} strokeLinejoin="round" />
    <ellipse cx={34} cy={24} rx={15} ry={13} fill={fg} />
    <ellipse cx={28.5} cy={24} rx={2.6} ry={3.6} fill={C.BG} />
    <ellipse cx={39.5} cy={24} rx={2.6} ry={3.6} fill={C.BG} />
    <path d="M32.2 29.5 L35.8 29.5 L34 31.6 Z" fill={accent} />
    <circle cx={34} cy={80} r={9} fill={fg} />
    <path d="M57 18 L82 33 Q85 35 82 37 L57 52 Q53 54 53 50 L53 20 Q53 16 57 18 Z" fill={accent} />
  </svg>
);

// Round logo with a transparent outside: for anywhere a circular badge is needed.
export const LogoRound: React.FC<{accent: number}> = ({accent}) => {
  const a = accentFor(accent);
  return (
    <AbsoluteFill style={{alignItems: "center", justifyContent: "center"}}>
      <div style={{width: "100%", height: "100%", borderRadius: "50%", background: `radial-gradient(circle at 50% 35%, #1a222c, ${C.BG} 70%)`, boxShadow: `inset 0 0 0 28px ${a.hex}`, display: "flex", alignItems: "center", justifyContent: "center"}}>
        <GitMark size={720} accent={a.hex} style={{marginLeft: 24}} />
      </div>
    </AbsoluteFill>
  );
};

// Instagram profile picture: a square that Instagram crops to a circle, so the mark stays well inside it.
export const LogoIG: React.FC<{accent: number}> = ({accent}) => {
  const a = accentFor(accent);
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% 38%, #1a222c, ${C.BG} 68%)`, alignItems: "center", justifyContent: "center"}}>
      <GitMark size={780} accent={a.hex} style={{marginLeft: 28}} />
    </AbsoluteFill>
  );
};
