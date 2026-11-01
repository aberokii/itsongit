import React from "react";
import {AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {AccentCtx, Background, C, Captions, f, INTER, rgba, SAFE, Sfx, useAccent, type Word} from "./kit";
import {accentFor} from "./brand";
import {GitMark} from "./Logo";
import {Mascot, type Mood} from "./Mascot";

// Format C, "story": an animated explainer instead of the ad template. One beat per spoken line, each beat a scene
// type; cuts are whip pans with motion blur, slams land with an impact shake, and Kit the cat reacts in the corner
// (or takes the whole frame on "character" beats) with lip sync from the word timings. Nothing sits still: every
// scene has continuous motion so there are no flat moments. pipeline/make.py builds the props from video.json "beats".
type Img2 = {src: string; w: number; h: number};
export type Beat = {
  start: number; end: number;
  scene: "slam" | "counter" | "app" | "versus" | "list" | "character" | "cta";
  mood?: Mood;
  text?: string; accent?: string; sub?: string; // slam / character bubble / app label
  from?: number; to?: number; prefix?: string; suffix?: string; label?: string; tone?: "neg" | "accent"; // counter
  image?: Img2; // app
  paid?: string; price?: string; name?: string; // versus
  items?: {label: string; at: number}[]; // list
};
export type StoryProps = {accent: number; dir: string; words: Word[]; beats: Beat[]; keyword: string; end: number; icon?: string};

const WHIP = 0.2;

const useBeat = (b: Beat) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps + b.start; // global seconds (inside a Sequence that starts at b.start)
  const pop = (at: number, damping = 11) => spring({frame: frame - (at - b.start) * fps, fps, config: {damping, stiffness: 190, mass: 0.75}});
  return {t, pop, lt: t - b.start};
};

// whip pan in from the right, out to the left, with horizontal motion blur
const Whip: React.FC<{b: Beat; children: React.ReactNode}> = ({b, children}) => {
  const {t} = useBeat(b);
  const first = b.start < 0.2;
  const inn = first ? 0 : interpolate(t, [b.start, b.start + WHIP], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3)});
  const out = interpolate(t, [b.end - 0.12, b.end], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => x * x});
  const x = inn * 900 - out * 900;
  const blur = (inn + out) * 26;
  const kick = first ? 1 : 1 + 0.06 * interpolate(t, [b.start + WHIP, b.start + WHIP + 0.25], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return <AbsoluteFill style={{transform: `translateX(${x}px) scale(${kick})`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined}}>{children}</AbsoluteFill>;
};

const BIG = (s: number): React.CSSProperties => ({fontFamily: INTER, fontWeight: 900, fontSize: s, letterSpacing: "-0.05em", lineHeight: 0.98, color: C.TEXT,
  textShadow: "0 10px 40px rgba(0,0,0,0.6)"});

const Slam: React.FC<{b: Beat}> = ({b}) => {
  const {pop, lt} = useBeat(b);
  const accent = useAccent();
  const words = (b.text || "").split(" ");
  const len = (b.text || "").length;
  const size = len <= 8 ? 230 : len <= 16 ? 170 : len <= 28 ? 130 : 104;
  const drift = 1 + lt * 0.02;
  return (
    <div style={{position: "absolute", top: 300, left: 60, right: 60, height: 760, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", transform: `scale(${drift})`}}>
      <div style={{display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 28px", textAlign: "center"}}>
        {words.map((w, i) => {
          const p = b.start < 0.2 ? 1 + 0.04 * Math.sin(lt * 5 + i) : pop(b.start + 0.05 + i * 0.09, 9);
          const hot = b.accent && w.toLowerCase().replace(/[^a-z0-9$]/g, "") === b.accent.toLowerCase().replace(/[^a-z0-9$]/g, "");
          return <span key={i} style={{...BIG(size), color: hot ? (b.tone === "neg" ? C.NEG : accent.hex) : C.TEXT, display: "inline-block",
            opacity: Math.min(p * 2, 1), transform: `scale(${2.2 - 1.2 * Math.min(p, 1.08)}) rotate(${(1 - Math.min(p, 1)) * (i % 2 ? 8 : -8)}deg)`}}>{w}</span>;
        })}
      </div>
      {b.sub && <div style={{marginTop: 40, fontFamily: INTER, fontWeight: 800, fontSize: 58, color: C.MUTED, textAlign: "center", opacity: pop(b.start + 0.45), transform: `translateY(${(1 - pop(b.start + 0.45)) * 40}px)`}}>{b.sub}</div>}
    </div>
  );
};

const Counter: React.FC<{b: Beat}> = ({b}) => {
  const {t, pop} = useBeat(b);
  const accent = useAccent();
  const dur = Math.min(1.4, (b.end - b.start) * 0.7);
  const k = interpolate(t, [b.start + 0.15, b.start + 0.15 + dur], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3)});
  const v = (b.from ?? 0) + ((b.to ?? 0) - (b.from ?? 0)) * k;
  const dec = Math.abs((b.to ?? 0) % 1) > 0 ? 2 : 0;
  const txt = `${b.prefix ?? ""}${v.toLocaleString("en-US", {minimumFractionDigits: dec, maximumFractionDigits: dec})}${b.suffix ?? ""}`;
  const done = pop(b.start + 0.15 + dur, 8);
  const col = b.tone === "neg" ? C.NEG : accent.hex;
  return (
    <div style={{position: "absolute", top: 330, left: 0, right: 0, height: 700, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"}}>
      {b.label && <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 64, color: C.MUTED, marginBottom: 20, opacity: pop(b.start)}}>{b.label}</div>}
      <div style={{...BIG(txt.length > 7 ? 190 : 250), color: col, fontVariantNumeric: "tabular-nums", transform: `scale(${1 + 0.12 * Math.sin(Math.min(done, 1) * Math.PI)})`,
        textShadow: `0 0 80px ${rgba(col, 0.45)}`}}>{txt}</div>
      {b.sub && <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 58, color: C.TEXT, marginTop: 24, opacity: done}}>{b.sub}</div>}
    </div>
  );
};

const App: React.FC<{b: Beat}> = ({b}) => {
  const {lt, pop} = useBeat(b);
  const accent = useAccent();
  if (!b.image) return null;
  const w = 980, h = 780; // cropped + zoomed: a legible slice of the UI beats a tiny whole window
  const p = pop(b.start);
  return (
    <>
      <div style={{position: "absolute", top: 300 + (820 - h) / 2, left: 50, width: w, height: h, borderRadius: 30, overflow: "hidden",
        border: `4px solid ${accent.hex}`, boxShadow: `0 50px 120px rgba(0,0,0,0.7), 0 0 70px ${rgba(accent.hex, 0.25)}`, transform: `rotate(${(1 - p) * -4}deg)`}}>
        <Img src={staticFile(b.image.src)} style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 30%", transform: `scale(${1.25 + lt * 0.04}) translateX(${-lt * 10}px)`}} />
      </div>
      {b.text && <div style={{position: "absolute", top: 230, left: 0, right: 0, display: "flex", justifyContent: "center"}}>
        <div style={{padding: "12px 34px 16px", borderRadius: 999, background: accent.hex, color: accent.ink, fontFamily: INTER, fontWeight: 900, fontSize: 58,
          transform: `scale(${pop(b.start + 0.25, 9)})`}}>{b.text}</div></div>}
    </>
  );
};

const Versus: React.FC<{b: Beat; dir: string; icon?: string}> = ({b, dir, icon}) => {
  const {t, pop} = useBeat(b);
  const accent = useAccent();
  const tip = interpolate(t, [b.start + 0.6, b.start + 1.3], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3)});
  const ang = -12 * tip + Math.sin(t * 6) * 2 * (1 - tip); // beam tips toward the free side (right goes down... free is heavier on value)
  const vs = pop(b.start + 0.3, 8);
  return (
    <div style={{position: "absolute", top: 300, left: 0, right: 0, height: 820}}>
      <div style={{position: "absolute", top: 420, left: 140, width: 800, height: 16, borderRadius: 8, background: C.MUTED, transform: `rotate(${-ang}deg)`, transformOrigin: "50% 50%"}} />
      <div style={{position: "absolute", top: 436, left: 524, width: 32, height: 330, background: C.LINE, borderRadius: 10}} />
      <div style={{position: "absolute", top: 210 - tip * 85, left: 40, width: 440, display: "flex", flexDirection: "column", alignItems: "center", opacity: pop(b.start)}}>
        <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 54, color: C.TEXT, textAlign: "center"}}>{b.paid}</div>
        <div style={{...BIG((b.price || "").length > 7 ? 88 : (b.price || "").length > 5 ? 104 : 120), color: C.NEG, whiteSpace: "nowrap"}}>{b.price}</div>
      </div>
      <div style={{position: "absolute", top: 70 + tip * 85, left: 600, width: 440, display: "flex", flexDirection: "column", alignItems: "center", opacity: pop(b.start + 0.15)}}>
        {icon ? <Img src={staticFile(`${dir}/${icon}`)} style={{width: 120, height: 120, borderRadius: 28}} /> : <GitMark size={120} accent={accent.hex} />}
        <div style={{fontFamily: INTER, fontWeight: 800, fontSize: 54, color: C.TEXT}}>{b.name}</div>
        <div style={{...BIG(120), color: accent.hex}}>$0</div>
      </div>
      <div style={{position: "absolute", top: 560, left: 0, right: 0, textAlign: "center", ...BIG(150), WebkitTextStroke: `6px ${C.BG}`, color: C.TEXT, opacity: Math.min(vs * 2, 1), transform: `scale(${2 - Math.min(vs, 1)})`}}>VS</div>
    </div>
  );
};

const List: React.FC<{b: Beat}> = ({b}) => {
  const {pop} = useBeat(b);
  const accent = useAccent();
  return (
    <div style={{position: "absolute", top: 340, left: 80, right: 80, display: "flex", flexDirection: "column", gap: 44}}>
      {b.text && <div style={{...BIG(84), marginBottom: 10, opacity: pop(b.start)}}>{b.text}</div>}
      {(b.items || []).map((it, i) => {
        const p = pop(it.at, 10);
        return (
          <div key={i} style={{display: "flex", alignItems: "center", gap: 30, opacity: Math.min(p * 1.6, 1), transform: `translateX(${(1 - p) * 300}px)`}}>
            <div style={{width: 96, height: 96, borderRadius: 26, background: accent.hex, color: accent.ink, fontFamily: INTER, fontWeight: 900, fontSize: 60, display: "flex", alignItems: "center", justifyContent: "center",
              transform: `rotate(${(1 - p) * 90}deg)`}}>{i + 1}</div>
            <div style={{fontFamily: INTER, fontWeight: 900, fontSize: it.label.length > 16 ? 66 : 80, letterSpacing: "-0.03em", color: C.TEXT}}>{it.label}</div>
          </div>
        );
      })}
    </div>
  );
};

const Bubble: React.FC<{b: Beat}> = ({b}) => {
  const {pop} = useBeat(b);
  const p = pop(b.start + 0.1, 9);
  if (!b.text) return null;
  return (
    <div style={{position: "absolute", top: 300, left: 70, right: 70, display: "flex", justifyContent: "center", opacity: Math.min(p * 2, 1), transform: `scale(${0.6 + 0.4 * Math.min(p, 1.05)})`, transformOrigin: "50% 100%"}}>
      <div style={{position: "relative", padding: "34px 46px", borderRadius: 50, background: C.TEXT, color: C.BG, fontFamily: INTER, fontWeight: 900, fontSize: b.text.length > 40 ? 64 : 80, letterSpacing: "-0.03em", lineHeight: 1.05, textAlign: "center"}}>
        {b.text}
        <div style={{position: "absolute", bottom: -34, left: "50%", marginLeft: -30, width: 0, height: 0, borderLeft: "30px solid transparent", borderRight: "30px solid transparent", borderTop: `40px solid ${C.TEXT}`}} />
      </div>
    </div>
  );
};

const Cta: React.FC<{b: Beat; keyword: string}> = ({b, keyword}) => {
  const {t, pop} = useBeat(b);
  const accent = useAccent();
  const a = pop(b.start), m = pop(b.start + 0.35, 8), c = pop(b.start + 1.0);
  const wig = Math.sin((t - b.start) * 9) * 3 * Math.max(0, 1 - (t - b.start - 0.6) / 1.2);
  const kw = keyword.toUpperCase();
  return (
    <AbsoluteFill style={{alignItems: "center"}}>
      <div style={{position: "absolute", top: 380, ...BIG(130), opacity: a, transform: `translateY(${(1 - a) * 50}px)`}}>Comment</div>
      <div style={{position: "absolute", top: 560, padding: "10px 70px 22px", borderRadius: 48, background: accent.hex, color: accent.ink, fontFamily: INTER, fontWeight: 900, fontSize: kw.length > 5 ? 190 : 250,
        letterSpacing: "-0.05em", lineHeight: 1.05, boxShadow: `0 30px 90px ${rgba(accent.hex, 0.45)}`, opacity: Math.min(m * 1.5, 1), transform: `scale(${0.4 + 0.6 * m}) rotate(${wig}deg)`}}>{kw}</div>
      <div style={{position: "absolute", top: 930, fontFamily: INTER, fontWeight: 800, fontSize: 54, color: C.MUTED, opacity: c}}>💬 I'll DM you the link</div>
    </AbsoluteFill>
  );
};

export const Story: React.FC<StoryProps> = (props) => {
  // the first beat always owns frame 0 (Instagram counts skips from the very first frame)
  const p = {...props, beats: props.beats.map((b, i) => (i === 0 ? {...b, start: 0} : b))};
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const cur = p.beats.find((b) => t >= b.start && t < b.end) ?? p.beats[p.beats.length - 1];
  // impact shake for 0.3 s after a slam lands
  const slam = p.beats.find((b) => b.scene === "slam" && t >= b.start + 0.12 && t < b.start + 0.42);
  const sh = slam ? Math.max(0, 1 - (t - slam.start - 0.12) / 0.3) * 14 : 0;
  const shake = sh ? `translate(${Math.sin(t * 90) * sh}px, ${Math.cos(t * 77) * sh}px)` : undefined;
  const big = cur.scene === "character";
  const cues: [number, string][] = p.beats.flatMap((b): [number, string][] => [
    [b.start - 0.04, "whoosh"],
    ...(b.scene === "slam" ? [[b.start + 0.1, "thud"] as [number, string]] : []),
    ...(b.scene === "counter" ? [[b.start + 0.15 + Math.min(1.4, (b.end - b.start) * 0.7), "ding"] as [number, string]] : []),
    ...(b.scene === "versus" ? [[b.start + 0.3, "thud"] as [number, string]] : []),
    ...(b.scene === "character" ? [[b.start + 0.1, "pop"] as [number, string]] : []),
    ...(b.items || []).map((it): [number, string] => [it.at, "pop"]),
  ]);
  const moodAt = cur.start;
  return (
    <AccentCtx.Provider value={accentFor(p.accent)}>
      <AbsoluteFill style={{background: C.BG}}>
        <Background />
        <AbsoluteFill style={{transform: shake}}>
          {p.beats.map((b, i) => (
            <Sequence key={i} from={f(b.start)} durationInFrames={Math.max(1, f(b.end) - f(b.start))} name={`${i}-${b.scene}`}>
              <Whip b={b}>
                {b.scene === "slam" && <Slam b={b} />}
                {b.scene === "counter" && <Counter b={b} />}
                {b.scene === "app" && <App b={b} />}
                {b.scene === "versus" && <Versus b={b} dir={p.dir} icon={p.icon} />}
                {b.scene === "list" && <List b={b} />}
                {b.scene === "character" && <Bubble b={b} />}
                {b.scene === "cta" && <Cta b={b} keyword={p.keyword} />}
              </Whip>
            </Sequence>
          ))}
          {/* Kit: big and centred on character beats, otherwise reacting in the bottom-right corner */}
          {(() => {
            // spring between the corner and centre stage instead of teleporting
            const idx = p.beats.indexOf(cur);
            const prevBig = idx > 0 && p.beats[idx - 1].scene === "character";
            const sp = spring({frame: frame - cur.start * fps, fps, config: {damping: 13, stiffness: 160, mass: 0.8}});
            const k = big ? (prevBig ? 1 : sp) : prevBig ? 1 - sp : 0;
            const size = 290 + (500 - 290) * k;
            return (
              <div style={{position: "absolute", left: 770 + (290 - 770) * k, top: 1150 + (760 - 1150) * k}}>
                <Mascot words={p.words} mood={cur.mood ?? (big ? "excited" : "neutral")} moodAt={moodAt} size={size} />
              </div>
            );
          })()}
        </AbsoluteFill>
        <Captions words={p.words} hide={p.beats.filter((b) => b.scene === "cta").map((b) => [b.start + 0.3, b.end] as [number, number])} />
        <div style={{position: "absolute", top: SAFE.top + 22, right: SAFE.side, display: "flex", alignItems: "center", gap: 10, padding: "8px 18px 8px 10px", borderRadius: 999, background: "rgba(11,15,20,0.55)"}}>
          <GitMark size={44} accent={accentFor(p.accent).hex} />
          <span style={{fontFamily: INTER, fontWeight: 900, fontSize: 32, color: C.TEXT}}>@itsongit</span>
        </div>
        <Audio src={staticFile(`${p.dir}/vo.wav`)} />
        <Sfx cues={cues} />
      </AbsoluteFill>
    </AccentCtx.Provider>
  );
};
