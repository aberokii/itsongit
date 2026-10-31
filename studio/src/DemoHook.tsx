import React from "react";
import {AbsoluteFill, Img, interpolate, staticFile} from "remotion";
import {Video} from "@remotion/media";
import {C, INTER, rgba, useAccent, usePop, useScene, useT} from "./kit";

// Hook B ("demo"): the app is already running on frame 0. Instagram's skip rate counts the first 3 s, and the
// price-slash hook (A) spends them on a text card. Here the product is the first thing anyone sees, moving,
// with the outcome written above it and the price strip on its lower edge. Same voiceover, same word anchors as A, so an
// A/B difference in skip rate is the visual alone.
export type DemoMedia = {video?: string; images?: {src: string; w: number; h: number}[]; w: number; h: number};
export type HookText = {paid: string; price: string; job: string; name: string};

const CARD_W = 1000;
const CARD_TOP = 560; // job text above (y 290–540); card to y ~1450 with the price strip on its lower edge; captions at 1530

export const DemoHook: React.FC<{dur: number; dir: string; demo: DemoMedia; text: HookText;
  b: {t40: number; tThis: number; tFree1: number; tName: number}}> = ({dur, dir, demo, text, b}) => {
  const t = useT();
  const accent = useAccent();
  const {out} = useScene(dur, 0.3);
  // a tall card filled with the app (cropped, zoomed in): big, legible UI beats a tiny whole-window screenshot
  const cardH = 880;
  // constant motion from frame 0: slow push-in + drift (a still screenshot never reads as a still)
  const push = interpolate(t, [0, dur], [1.0, 1.12]);
  const drift = interpolate(t, [0, dur], [0, -30]);
  const imgs = demo.images ?? [];
  const cut = imgs.length > 1 ? b.tThis - 0.05 : Infinity; // pattern interrupt: second screen cuts in on "This"
  const shown = !demo.video && imgs.length ? (t >= cut ? imgs[1] : imgs[0]) : null;
  const strike = usePop(b.tThis, 0, 18);
  const stamp = usePop(b.tFree1 - 0.04, 0, 9);
  const name = usePop(b.tName, 0, 12);
  const priceHit = usePop(b.t40, 0, 10);
  const jobSize = text.job.length <= 30 ? 112 : 92; // two lines max
  return (
    <AbsoluteFill style={{opacity: 1 - out, transform: `scale(${1 - out * 0.08})`}}>
      {/* blurred copy fills the frame with the app's own colours */}
      <AbsoluteFill style={{filter: "blur(60px) saturate(1.3)", opacity: 0.45, transform: "scale(1.3)"}}>
        {demo.video ? <Video src={staticFile(demo.video)} muted style={{width: "100%", height: "100%", objectFit: "cover"}} />
          : shown ? <Img src={staticFile(shown.src)} style={{width: "100%", height: "100%", objectFit: "cover"}} /> : null}
      </AbsoluteFill>
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${rgba(C.BG, 0.85)} 0%, ${rgba(C.BG, 0.2)} 30%, ${rgba(C.BG, 0.2)} 70%, ${rgba(C.BG, 0.9)} 100%)`}} />

      {/* the outcome, readable on frame 0 */}
      <div style={{position: "absolute", top: 290, left: 50, right: 50, height: 250, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
        fontFamily: INTER, fontWeight: 900, fontSize: jobSize, lineHeight: 1.02, letterSpacing: "-0.045em", color: C.TEXT,
        textShadow: "0 8px 40px rgba(0,0,0,0.8)"}}>
        {text.job}
      </div>

      {/* the app in action */}
      <div style={{position: "absolute", top: CARD_TOP, left: (1080 - CARD_W) / 2, width: CARD_W, height: cardH, borderRadius: 34, overflow: "hidden",
        border: `4px solid ${rgba(accent.hex, 0.9)}`, boxShadow: `0 50px 120px rgba(0,0,0,0.7), 0 0 80px ${rgba(accent.hex, 0.25)}`, background: "#000"}}>
        <div style={{width: "100%", height: "100%", transform: `scale(${push}) translateY(${drift}px)`}}>
          {demo.video ? <Video src={staticFile(demo.video)} muted style={{width: "100%", height: "100%", objectFit: "cover", display: "block"}} />
            : shown ? <Img src={staticFile(shown.src)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 35%", display: "block"}} /> : null}
        </div>
        {/* app icon + name punch in on the product name */}
        <div style={{position: "absolute", left: 28, top: 28, display: "flex", alignItems: "center", gap: 18, padding: "12px 30px 12px 12px", borderRadius: 999,
          background: rgba(C.BG, 0.88), border: `3px solid ${accent.hex}`, opacity: Math.min(name * 1.5, 1), transform: `scale(${0.6 + 0.4 * name})`, transformOrigin: "left top"}}>
          <Img src={staticFile(`${dir}/icon.png`)} style={{width: 76, height: 76, borderRadius: 18}} />
          <span style={{fontFamily: INTER, fontWeight: 900, fontSize: 54, letterSpacing: "-0.03em", color: C.TEXT}}>{text.name}</span>
        </div>
      </div>

      {/* price strip: visible from frame 0, struck on "This", FREE stamps on "free" */}
      <div style={{position: "absolute", top: CARD_TOP + cardH - 120, left: 0, right: 0, display: "flex", justifyContent: "center"}}>
        <div style={{position: "relative", display: "flex", alignItems: "baseline", gap: 22, padding: "16px 40px 22px", borderRadius: 28,
          background: rgba(C.BG, 0.92), border: `4px solid ${C.NEG}`, boxShadow: "0 20px 60px rgba(0,0,0,0.7)", transform: `scale(${1 + 0.08 * Math.sin(Math.min(priceHit, 1) * Math.PI)})`}}>
          <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 62, color: C.TEXT, letterSpacing: "-0.02em"}}>{text.paid}</span>
          <span style={{fontFamily: INTER, fontWeight: 900, fontSize: 96, color: C.NEG, letterSpacing: "-0.05em"}}>{text.price}</span>
          <div style={{position: "absolute", left: 20, right: 20, top: "52%", height: 16, borderRadius: 8, background: C.NEG, transformOrigin: "left center",
            transform: `scaleX(${strike}) rotate(-6deg)`, boxShadow: `0 0 30px ${rgba(C.NEG, 0.6)}`}} />
          <div style={{position: "absolute", right: -70, top: -70, padding: "8px 34px 14px", borderRadius: 26, background: accent.hex, color: accent.ink,
            fontFamily: INTER, fontWeight: 900, fontSize: 92, letterSpacing: "-0.04em", boxShadow: `0 24px 70px ${rgba(accent.hex, 0.55)}`,
            opacity: Math.min(stamp * 2, 1), transform: `scale(${2.2 - 1.2 * Math.min(stamp, 1.05)}) rotate(${8 - 2 * stamp}deg)`}}>FREE</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
