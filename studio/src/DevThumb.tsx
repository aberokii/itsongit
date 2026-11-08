import React from "react";
import {AbsoluteFill} from "remotion";
import {AccentCtx, useAccent} from "./kit";
import {accentFor} from "./brand";
import {THEMES, ThemeCtx, useTheme, type ThemeId} from "./themes";
import {Mascot} from "./Mascot";
import {ClayBuddy} from "./Clay";

// Cover for the developer-first line, drawn in the reel's own theme. Key content inside the centre 1080×1350
// (y 285–1635). Top to bottom: a mono kicker ("// 03 terminal tools"), the 2–4 word promise, a sub line, the repo pill.
export type DevThumbProps = {theme: ThemeId; accent: number; kicker: string; big: string; line: string; repo: string};

const Body: React.FC<DevThumbProps> = ({kicker, big, line, repo}) => {
  const C = useTheme();
  const accent = useAccent();
  const words = big.split(" ");
  const cast = C.id === "clay"; // dialogue covers show Kit and the assistant on the clay table
  return (
    <AbsoluteFill style={{background: C.BG, textShadow: C.glow(C.TEXT), alignItems: "center"}}>
      <C.Bg />
      <div style={{position: "absolute", top: 360, left: 80, right: 80, fontFamily: C.MONO, fontWeight: 700, fontSize: C.id === "crt" ? 74 : 54, color: C.MUTED}}>{kicker}</div>
      <div style={{position: "absolute", top: 480, left: 80, right: 80, fontFamily: C.DISPLAY, fontWeight: 900, fontSize: big.length > 16 ? 190 : 230, lineHeight: 0.95,
        letterSpacing: C.id === "crt" ? "0" : "-0.055em", color: C.TEXT}}>
        {words.map((w, i) => <span key={i} style={{color: i === words.length - 1 ? accent.hex : C.TEXT, textShadow: i === words.length - 1 ? C.glow(accent.hex) : undefined}}>{w} </span>)}
      </div>
      {cast && <>
        <div style={{position: "absolute", left: 60, top: 1110}}><Mascot clay words={[]} talking={false} mood="excited" moodAt={0} size={400} /></div>
        <div style={{position: "absolute", left: 640, top: 1150}}><ClayBuddy words={[]} talking={false} mood="smug" moodAt={0} size={380} /></div>
      </>}
      <div style={{position: "absolute", top: cast ? 940 : 1290, left: 80, right: 80, fontFamily: C.SANS, fontWeight: 800, fontSize: C.id === "crt" ? 76 : 60, lineHeight: 1.1, color: C.MUTED}}>{line}</div>
      <div style={{position: "absolute", top: cast ? 1030 : 1490, left: 80, padding: "12px 30px", borderRadius: C.radius ? 999 : 0, border: `3px solid ${C.LINE}`, background: C.CARD,
        fontFamily: C.MONO, fontWeight: 700, fontSize: C.id === "crt" ? 52 : 38, color: C.TEXT}}>{repo}</div>
      <C.Overlay />
    </AbsoluteFill>
  );
};

export const DevThumb: React.FC<DevThumbProps> = (p) => {
  const C = THEMES[p.theme];
  const a = accentFor(p.accent);
  return (
    <ThemeCtx.Provider value={C}>
      <AccentCtx.Provider value={C.accentOverride ? {...a, hex: C.accentOverride, ink: C.BG} : a}>
        <Body {...p} />
      </AccentCtx.Provider>
    </ThemeCtx.Provider>
  );
};
