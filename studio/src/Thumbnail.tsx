import React from "react";
import {AbsoluteFill, Img, staticFile} from "remotion";
import {AccentCtx, Background, C, INTER, rgba, useAccent} from "./kit";
import {accentFor} from "./brand";

// Reel cover, 1080×1920. Everything that matters sits inside the centre 1080×1350 (y 285–1635), the part Instagram
// keeps on the profile grid (3:4) and in the feed (4:5). Few words, huge type: it has to read at grid size.
export type ThumbProps = {
  accent: number;
  icon: string; // public/ path
  paid: string; // "CleanMyMac"
  price: string; // "$40/yr"
  big: string; // "FREE"
  line1: string; // "CleanMyMac"
  line2: string; // "alternative"
  repo: string; // "momenbasel/PureMac"
  job?: string; // "Cleans the junk off your Mac": when set, it is the headline (what the app does), line1+line2 go small
};

const Body: React.FC<ThumbProps> = ({icon, paid, price, big, line1, line2, repo, job}) => {
  const accent = useAccent();
  return (
    <AbsoluteFill style={{fontFamily: INTER, color: C.TEXT, alignItems: "center"}}>
      <Background />
      <div style={{position: "absolute", top: 330, display: "flex", alignItems: "center", gap: 22}}>
        <span style={{fontWeight: 800, fontSize: 50, color: C.MUTED}}>{paid}</span>
        <span style={{position: "relative", fontWeight: 900, fontSize: 64, color: C.NEG}}>
          {price}
          <span style={{position: "absolute", left: -8, right: -8, top: "50%", height: 10, marginTop: -2, borderRadius: 5, background: C.NEG, rotate: "-8deg"}} />
        </span>
        <span style={{fontWeight: 900, fontSize: 64, color: C.MUTED}}>→</span>
        <span style={{fontWeight: 900, fontSize: 64, color: accent.hex}}>$0</span>
      </div>
      <Img src={staticFile(icon)} style={{position: "absolute", top: 440, width: 400, height: 400, filter: `drop-shadow(0 30px 80px ${rgba(accent.hex, 0.45)})`}} />
      <div style={{position: "absolute", top: 860, padding: "0 64px 18px", borderRadius: 44, background: accent.hex, color: accent.ink, fontWeight: 900, fontSize: 230, letterSpacing: "-0.06em", lineHeight: 1.04, rotate: "-3deg", boxShadow: `0 30px 90px ${rgba(accent.hex, 0.5)}`}}>
        {big}
      </div>
      {job ? (
        <>
          <div style={{position: "absolute", top: 1140, left: 60, right: 60, textAlign: "center", fontWeight: 900, fontSize: job.length > 22 ? 104 : 120, letterSpacing: "-0.05em", lineHeight: 1.02, textWrap: "balance", textShadow: "0 8px 40px rgba(0,0,0,0.7)"}}>
            {job}
          </div>
          <div style={{position: "absolute", top: 1385, fontWeight: 800, fontSize: 46, color: C.MUTED}}>
            free <span style={{color: accent.hex}}>{line1}</span> {line2}
          </div>
        </>
      ) : (
        <div style={{position: "absolute", top: 1150, textAlign: "center", fontWeight: 900, fontSize: 128, letterSpacing: "-0.05em", lineHeight: 1.02, textShadow: "0 8px 40px rgba(0,0,0,0.7)"}}>
          {line1}
          <br />
          {line2}
        </div>
      )}
      <div style={{position: "absolute", top: job ? 1490 : 1470, display: "flex", alignItems: "center", gap: 14, padding: "12px 30px", borderRadius: 999, background: C.CARD, border: `3px solid ${C.LINE}`, fontWeight: 800, fontSize: 38, color: C.MUTED}}>
        <svg width="40" height="40" viewBox="0 0 16 16" fill={C.TEXT}>
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        <span style={{color: C.TEXT}}>{repo}</span>
      </div>
    </AbsoluteFill>
  );
};

export const Thumbnail: React.FC<ThumbProps> = (p) => (
  <AccentCtx.Provider value={accentFor(p.accent)}>
    <Body {...p} />
  </AccentCtx.Provider>
);
