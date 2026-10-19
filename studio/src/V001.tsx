import React from "react";
import {AbsoluteFill, Img, interpolate, Sequence, staticFile} from "remotion";
import {Audio, Video} from "@remotion/media";
import {
  AccentCtx, AppCard, Background, C, Captions, Chip, f, INTER, MONO, Phone, phoneSize, rgba, SAFE, Sfx,
  useAccent, usePop, useScene, useT, type Word, type Zone,
} from "./kit";
import {accentFor} from "./brand";
import {GitMark} from "./Logo";

// Handle watermark, top-right inside the safe zone, on every frame.
const Watermark: React.FC = () => {
  const accent = useAccent();
  return (
    <div style={{position: "absolute", top: SAFE.top + 22, right: SAFE.side, display: "flex", alignItems: "center", gap: 10, padding: "8px 18px 8px 10px", borderRadius: 999, background: "rgba(11,15,20,0.55)", opacity: 0.92}}>
      <GitMark size={44} accent={accent.hex} />
      <span style={{fontFamily: INTER, fontWeight: 900, fontSize: 32, letterSpacing: "-0.02em", color: C.TEXT}}>@itsongit</span>
    </div>
  );
};

// PureMac: free, open-source CleanMyMac alternative. Every beat is a word time from the voiceover
// (scripts/build_v001.py computes `b` from the transcript), so any voice re-times the whole edit.
export type V001Props = {
  accent: number; // daily post slot 0–4 → one of the five brand accents
  assets: string; // public/ folder holding this voice's hook.mp4, gh-phone.mp4, vo.wav
  words: Word[];
  b: Record<string, number>;
};

const SHARED = "v001";
const PHONE_TOP = 310; // repo pill sits above it; phone bottom stays above the low captions

const Seq: React.FC<{from: number; to: number; name: string; children: React.ReactNode}> = ({from, to, name, children}) => (
  <Sequence from={f(from)} durationInFrames={Math.max(1, f(to) - f(from))} name={name}>
    {children}
  </Sequence>
);

const RepoPill: React.FC<{dur: number}> = ({dur}) => {
  const {opacity, inn} = useScene(dur);
  return (
    <div style={{position: "absolute", top: SAFE.top + 18, left: SAFE.side, display: "flex", opacity, transform: `translateY(${(1 - inn) * -30}px)`}}>
      <div style={{display: "flex", alignItems: "center", gap: 16, padding: "10px 28px 10px 10px", borderRadius: 999, background: C.CARD, border: `3px solid ${C.LINE}`}}>
        <Img src={staticFile(`${SHARED}/avatar.png`)} style={{width: 52, height: 52, borderRadius: 26}} />
        <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 36, color: C.MUTED}}>
          momenbasel / <span style={{color: C.TEXT}}>PureMac</span>
        </span>
      </div>
    </div>
  );
};

const Hook: React.FC<{src: string; dur: number}> = ({src, dur}) => {
  const {out} = useScene(dur, 0.3);
  return (
    <AbsoluteFill style={{opacity: 1 - out, transform: `scale(${1 - out * 0.08})`}}>
      <Video src={staticFile(src)} muted />
    </AbsoluteFill>
  );
};

const PhoneScene: React.FC<{dur: number; src: string; url: string; zoom?: number; overlay?: React.ReactNode; children?: React.ReactNode}> = ({dur, src, url, zoom = 0, overlay, children}) => {
  const {inn, out} = useScene(dur);
  const {w} = phoneSize();
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: PHONE_TOP,
          left: (1080 - w) / 2,
          opacity: 1 - out,
          transformOrigin: "50% 70%",
          transform: `translateY(${(1 - inn) * 900}px) rotate(${(1 - inn) * 8}deg) scale(${(1 - out * 0.1) * (1 + zoom)})`,
        }}
      >
        <Phone src={src} url={url}>{overlay}</Phone>
      </div>
      <div style={{opacity: 1 - out}}>{children}</div>
    </AbsoluteFill>
  );
};

// GitHub on the phone: zoom into "Free, open-source…" with a highlight box, then the code, then the stars.
const GitHub: React.FC<{b: V001Props["b"]; src: string}> = ({b, src}) => {
  const o = b.ghStart;
  const t = useT(o);
  const accent = useAccent();
  const zin = usePop(b.tFree2 - 0.15, o, 18);
  const zout = usePop(b.tSo - 0.1, o, 18);
  const zoom = 0.12 * zin * (1 - zout);
  const box = usePop(b.tFree2, o, 16);
  const stars = interpolate(t, [b.tBlowing, b.tBlowing + 0.7], [0, 7.2], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const highlight = (
    <div
      style={{
        position: "absolute", left: 30, top: 16 + 64 + 448, width: 520 * box, height: 180, borderRadius: 16,
        border: `5px solid ${accent.hex}`, background: rgba(accent.hex, 0.12), opacity: (t < b.tSo + 0.3 ? 1 : 0) * Math.min(box * 2, 1),
        boxShadow: `0 0 40px ${rgba(accent.hex, 0.5)}`,
      }}
    />
  );
  return (
    <PhoneScene dur={b.junkIntro - o} src={src} url="github.com" zoom={zoom} overlay={highlight}>
      <Chip at={b.t100} offset={o} tone="solid" size={64} style={{position: "absolute", top: 360, right: 46, rotate: "5deg"}}>
        100% FREE
      </Chip>
      <Chip at={b.tOpen} offset={o} tone="accent" size={56} style={{position: "absolute", top: 1150, left: 46, rotate: "-4deg"}}>
        {"</>"} OPEN SOURCE
      </Chip>
      <Chip at={b.tBlowing} offset={o} size={60} style={{position: "absolute", top: 760, right: 46, rotate: "4deg"}}>
        <span style={{color: "#e3b341"}}>★</span> {stars.toFixed(1)}k stars
      </Chip>
    </PhoneScene>
  );
};

// One app screenshot with a slow push-in; slides in from the right, out to the left.
const Card: React.FC<{dur: number; src: string; top?: number; children?: React.ReactNode}> = ({dur, src, top = 360, children}) => {
  const t = useT();
  const {inn, out} = useScene(dur);
  const push = interpolate(t, [0, dur], [1, 1.07]);
  return (
    <AbsoluteFill>
      <div style={{position: "absolute", top, left: 60, opacity: Math.min(inn * 1.4, 1) * (1 - out), transform: `translateX(${(1 - inn) * 500 - out * 500}px) scale(${push})`}}>
        <AppCard src={src} />
      </div>
      <div style={{opacity: 1 - out}}>{children}</div>
    </AbsoluteFill>
  );
};

const Junk: React.FC<{b: V001Props["b"]}> = ({b}) => {
  const o = b.junk;
  const t = useT(o);
  const swap = usePop(b.tXcode, o);
  const row: React.CSSProperties = {position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "center", gap: 22};
  return (
    <Card dur={b.uninstall - o} src={`${SHARED}/system-junk.png`}>
      <div style={{position: "absolute", top: 360, left: 60, opacity: t > b.tXcode ? swap : 0, transform: `scale(1.07) translateY(${(1 - swap) * 60}px)`}}>
        <AppCard src={`${SHARED}/xcode-junk.png`} />
      </div>
      <div style={{...row, top: 1110}}>
        <Chip at={b.tSystem} offset={o}>🗂 System caches</Chip>
        <Chip at={b.tOld} offset={o}>📜 Old logs</Chip>
      </div>
      <div style={{...row, top: 1240}}>
        <Chip at={b.tXcode} offset={o} tone="accent">Xcode</Chip>
        <Chip at={b.tDocker} offset={o} tone="accent">Docker</Chip>
      </div>
    </Card>
  );
};

const Uninstall: React.FC<{b: V001Props["b"]}> = ({b}) => (
  <Card dur={b.dupes - b.uninstall} src={`${SHARED}/app-uninstaller.png`}>
    <div style={{position: "absolute", top: 1130, left: 0, right: 0, display: "flex", justifyContent: "center"}}>
      <Chip at={b.tEvery} offset={b.uninstall} tone="accent" size={56}>✓ every leftover file</Chip>
    </div>
  </Card>
);

const Dupes: React.FC<{b: V001Props["b"]}> = ({b}) => {
  const p = usePop(b.tSimilar, b.dupes);
  return (
    <Card dur={b.promise - b.dupes} src={`${SHARED}/duplicate-finder.png`} top={300}>
      <div style={{position: "absolute", top: 580, left: 60, opacity: Math.min(p * 1.4, 1), transform: `translateY(${(1 - p) * 300}px) rotate(${-3 * p}deg) scale(0.92)`}}>
        <AppCard src={`${SHARED}/similar-photos.png`} />
      </div>
    </Card>
  );
};

const PromiseRow: React.FC<{at: number; o: number; text: string}> = ({at, o, text}) => {
  const p = usePop(at, o, 13);
  return (
    <div style={{display: "flex", alignItems: "center", gap: 34, opacity: Math.min(p * 1.5, 1), transform: `translateX(${(1 - p) * -160}px)`}}>
      <div style={{width: 110, height: 110, borderRadius: 55, background: rgba(C.NEG, 0.14), border: `4px solid ${C.NEG}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.NEG, fontFamily: INTER, fontWeight: 900, fontSize: 64, transform: `scale(${0.5 + 0.5 * p}) rotate(${(1 - p) * -90}deg)`}}>
        ✕
      </div>
      <span style={{fontFamily: INTER, fontWeight: 900, fontSize: 92, letterSpacing: "-0.04em", color: C.TEXT}}>{text}</span>
    </div>
  );
};

const PromiseScene: React.FC<{b: V001Props["b"]}> = ({b}) => {
  const o = b.promise;
  const {out} = useScene(b.install - o);
  return (
    <AbsoluteFill style={{opacity: 1 - out, transform: `scale(${1 - out * 0.08})`}}>
      <div style={{position: "absolute", top: 520, left: 110, display: "flex", flexDirection: "column", gap: 70}}>
        <PromiseRow at={b.no1} o={o} text="Subscription" />
        <PromiseRow at={b.no2} o={o} text="Tracking" />
        <PromiseRow at={b.no3} o={o} text="Fake pop-ups" />
      </div>
    </AbsoluteFill>
  );
};

const Terminal: React.FC<{at: number; o: number; cmd: string}> = ({at, o, cmd}) => {
  const t = useT(o);
  const p = usePop(at, o);
  const accent = useAccent();
  const n = Math.max(0, Math.min(cmd.length, Math.floor((t - at - 0.15) * 34)));
  return (
    <div style={{position: "absolute", top: 1250, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: Math.min(p * 1.5, 1), transform: `translateY(${(1 - p) * 60}px)`}}>
      <div style={{padding: "26px 36px", borderRadius: 22, background: "#010409", border: `3px solid ${accent.hex}`, boxShadow: "0 30px 80px rgba(0,0,0,0.7)", fontFamily: MONO, fontWeight: 700, fontSize: 40, color: C.TEXT, minWidth: 820}}>
        <span style={{color: accent.hex}}>$ </span>
        {cmd.slice(0, n)}
        <span style={{opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: accent.hex}}>▍</span>
      </div>
    </div>
  );
};

const Cta: React.FC<{b: V001Props["b"]}> = ({b}) => {
  const o = b.cta;
  const t = useT(o);
  const accent = useAccent();
  const a = usePop(b.tComment, o);
  const m = usePop(b.tMac, o, 9);
  const c = usePop(b.tMac + 0.9, o);
  const f2 = usePop(b.tMac + 1.4, o);
  const wiggle = t > b.tMac + 0.5 ? Math.sin((t - b.tMac - 0.5) * 9) * 3 * Math.max(0, 1 - (t - b.tMac - 0.5) / 1.2) : 0;
  return (
    <AbsoluteFill style={{alignItems: "center"}}>
      <div style={{position: "absolute", top: 540, fontFamily: INTER, fontWeight: 900, fontSize: 130, letterSpacing: "-0.04em", color: C.TEXT, opacity: a, transform: `translateY(${(1 - a) * 50}px)`}}>
        Comment
      </div>
      <div style={{position: "absolute", top: 720, padding: "10px 70px 22px", borderRadius: 48, background: accent.hex, color: accent.ink, fontFamily: INTER, fontWeight: 900, fontSize: 250, letterSpacing: "-0.05em", lineHeight: 1.05, boxShadow: `0 30px 90px ${rgba(accent.hex, 0.45)}`, opacity: Math.min(m * 1.5, 1), transform: `scale(${0.4 + 0.6 * m}) rotate(${wiggle}deg)`}}>
        MAC
      </div>
      <div style={{position: "absolute", top: 1100, display: "flex", alignItems: "center", gap: 20, fontFamily: INTER, fontWeight: 800, fontSize: 56, color: C.MUTED, opacity: c, transform: `translateY(${(1 - c) * 40}px)`}}>
        <span style={{fontSize: 60}}>💬</span> link goes straight to your DMs
      </div>
      <div style={{position: "absolute", top: 1240, display: "flex", alignItems: "center", gap: 18, padding: "16px 34px 16px 22px", borderRadius: 999, background: C.CARD, border: `3px solid ${accent.hex}`, fontFamily: INTER, fontWeight: 900, fontSize: 56, color: C.TEXT, opacity: f2, transform: `translateY(${(1 - f2) * 40}px) scale(${0.9 + 0.1 * f2})`}}>
        <GitMark size={64} accent={accent.hex} />
        <span style={{color: accent.hex}}>@itsongit</span>
      </div>
    </AbsoluteFill>
  );
};

export const V001: React.FC<V001Props> = ({accent, assets, words, b}) => {
  const center: Zone[] = [[b.junkIntro, b.junk]];
  const hide: Zone[] = [[b.tComment, b.end]];
  return (
    <AccentCtx.Provider value={accentFor(accent)}>
      <AbsoluteFill style={{background: C.BG}}>
        <Background />
        <Seq from={0} to={b.ghStart} name="hook"><Hook src={`${assets}/hook.mp4`} dur={b.ghStart} /></Seq>
        <Seq from={b.ghStart} to={b.junkIntro} name="repo-pill"><RepoPill dur={b.junkIntro - b.ghStart} /></Seq>
        <Seq from={b.junk} to={b.cta} name="repo-pill-2"><RepoPill dur={b.cta - b.junk} /></Seq>
        <Seq from={b.ghStart} to={b.junkIntro} name="github"><GitHub b={b} src={`${assets}/gh-phone.mp4`} /></Seq>
        <Seq from={b.junk} to={b.uninstall} name="junk"><Junk b={b} /></Seq>
        <Seq from={b.uninstall} to={b.dupes} name="uninstall"><Uninstall b={b} /></Seq>
        <Seq from={b.dupes} to={b.promise} name="dupes"><Dupes b={b} /></Seq>
        <Seq from={b.promise} to={b.install} name="promise"><PromiseScene b={b} /></Seq>
        <Seq from={b.install} to={b.cta} name="install">
          <PhoneScene dur={b.cta - b.install} src={`${SHARED}/site-phone.mp4`} url="moamenbasel.com/PureMac">
            <Terminal at={b.tOne} o={b.install} cmd="brew install --cask puremac" />
          </PhoneScene>
        </Seq>
        <Seq from={b.cta} to={b.end} name="cta"><Cta b={b} /></Seq>
        <Captions words={words} center={center} hide={hide} />
        <Watermark />
        <Audio src={staticFile(`${assets}/vo.wav`)} />
        <Sfx
          cues={[
            [b.t40 - 0.02, "pop"], [b.tThis - 0.07, "swish"], [b.tFree1 - 0.06, "thud"],
            [b.ghStart - 0.05, "whoosh"], [b.t100, "pop"], [b.tOpen, "pop"], [b.tBlowing, "ding"],
            [b.junkIntro - 0.05, "swish"], [b.junk - 0.05, "whoosh"], [b.tSystem, "pop"], [b.tOld, "pop"], [b.tXcode, "pop"], [b.tDocker, "pop"],
            [b.uninstall - 0.05, "whoosh"], [b.tEvery, "pop"], [b.dupes - 0.05, "whoosh"], [b.tSimilar, "swish"],
            [b.no1 - 0.02, "click"], [b.no2 - 0.02, "click"], [b.no3 - 0.02, "click"],
            [b.install - 0.05, "whoosh"], [b.tOne + 0.1, "type"], [b.cta - 0.05, "whoosh"], [b.tMac, "ding"],
          ]}
        />
      </AbsoluteFill>
    </AccentCtx.Provider>
  );
};
