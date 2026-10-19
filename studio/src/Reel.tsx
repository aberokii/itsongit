import React from "react";
import {AbsoluteFill, Img, interpolate, Sequence, staticFile} from "remotion";
import {Audio, Video} from "@remotion/media";
import {
  AccentCtx, Background, C, Captions, Chip, f, INTER, MONO, Phone, phoneSize, rgba, SAFE, Sfx,
  useAccent, usePop, useScene, useT, type Word, type Zone,
} from "./kit";
import {accentFor} from "./brand";
import {GitMark} from "./Logo";

// Generic itsongit reel. Same scenes and layout as the approved 001 (V001.tsx), driven entirely by props that
// pipeline/make.py builds from videos/<slug>/video.json + the voiceover's word timings.
export type Img2 = {src: string; w: number; h: number};
export type Feature = {
  start: number; // scene start (s)
  cardsAt: number; // when the first card appears; > start means a centred-caption intro beat first
  end: number;
  cards: (Img2 & {at: number})[]; // 1–2 images; the second slides over the first at `at`
  chips: {label: string; at: number; tone?: "plain" | "accent" | "solid"}[]; // ≤ 4
};
export type ReelProps = {
  accent: number;
  dir: string; // public/<dir> holds hook.mp4, gh-phone.mp4, install-phone.mp4, vo.wav, avatar.png
  words: Word[];
  owner: string;
  name: string;
  stars: number; // e.g. 7.2 (thousands)
  about: {left: number; top: number; width: number; height: number}; // highlight box in phone-local px
  b: {ghStart: number; t100: number; tFree2: number; tOpen: number; tSo: number; tBlowing: number;
      t40: number; tThis: number; tFree1: number; promise: number; install: number; tOne: number;
      cta: number; tComment: number; tKey: number; end: number};
  features: Feature[];
  nolist: {text: string; at: number}[];
  install: {cmd: string; url: string};
  keyword: string;
};

const PHONE_TOP = 310;

const Seq: React.FC<{from: number; to: number; name: string; children: React.ReactNode}> = ({from, to, name, children}) => (
  <Sequence from={f(from)} durationInFrames={Math.max(1, f(to) - f(from))} name={name}>
    {children}
  </Sequence>
);

const Watermark: React.FC = () => {
  const accent = useAccent();
  return (
    <div style={{position: "absolute", top: SAFE.top + 22, right: SAFE.side, display: "flex", alignItems: "center", gap: 10, padding: "8px 18px 8px 10px", borderRadius: 999, background: "rgba(11,15,20,0.55)", opacity: 0.92}}>
      <GitMark size={44} accent={accent.hex} />
      <span style={{fontFamily: INTER, fontWeight: 900, fontSize: 32, letterSpacing: "-0.02em", color: C.TEXT}}>@itsongit</span>
    </div>
  );
};

const RepoPill: React.FC<{dur: number; dir: string; owner: string; name: string}> = ({dur, dir, owner, name}) => {
  const {opacity, inn} = useScene(dur);
  const long = owner.length + name.length > 24;
  return (
    <div style={{position: "absolute", top: SAFE.top + 18, left: SAFE.side, display: "flex", opacity, transform: `translateY(${(1 - inn) * -30}px)`}}>
      <div style={{display: "flex", alignItems: "center", gap: 16, padding: "10px 28px 10px 10px", borderRadius: 999, background: C.CARD, border: `3px solid ${C.LINE}`, maxWidth: 640}}>
        <Img src={staticFile(`${dir}/avatar.png`)} style={{width: 52, height: 52, borderRadius: 26}} />
        <span style={{fontFamily: INTER, fontWeight: 800, fontSize: long ? 28 : 36, color: C.MUTED, whiteSpace: "nowrap"}}>
          {owner} / <span style={{color: C.TEXT}}>{name}</span>
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
      <div style={{position: "absolute", top: PHONE_TOP, left: (1080 - w) / 2, opacity: 1 - out, transformOrigin: "50% 70%",
        transform: `translateY(${(1 - inn) * 900}px) rotate(${(1 - inn) * 8}deg) scale(${(1 - out * 0.1) * (1 + zoom)})`}}>
        <Phone src={src} url={url}>{overlay}</Phone>
      </div>
      <div style={{opacity: 1 - out}}>{children}</div>
    </AbsoluteFill>
  );
};

const fmtStars = (k: number) => (k >= 100 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`);

const GitHub: React.FC<{p: ReelProps; end: number}> = ({p, end}) => {
  const {b} = p;
  const o = b.ghStart;
  const t = useT(o);
  const accent = useAccent();
  const zin = usePop(b.tFree2 - 0.15, o, 18);
  const zout = usePop(b.tSo - 0.1, o, 18);
  const box = usePop(b.tFree2, o, 16);
  const stars = interpolate(t, [b.tBlowing, b.tBlowing + 0.7], [0, p.stars], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const highlight = (
    <div style={{position: "absolute", left: p.about.left, top: p.about.top, width: p.about.width * box, height: p.about.height, borderRadius: 16,
      border: `5px solid ${accent.hex}`, background: rgba(accent.hex, 0.12), opacity: (t < b.tSo + 0.3 ? 1 : 0) * Math.min(box * 2, 1),
      boxShadow: `0 0 40px ${rgba(accent.hex, 0.5)}`}} />
  );
  return (
    <PhoneScene dur={end - o} src={`${p.dir}/gh-phone.mp4`} url="github.com" zoom={0.12 * zin * (1 - zout)} overlay={highlight}>
      <Chip at={b.t100} offset={o} tone="solid" size={64} style={{position: "absolute", top: 360, right: 46, rotate: "5deg"}}>100% FREE</Chip>
      <Chip at={b.tOpen} offset={o} tone="accent" size={56} style={{position: "absolute", top: 1150, left: 46, rotate: "-4deg"}}>{"</>"} OPEN SOURCE</Chip>
      <Chip at={b.tBlowing} offset={o} size={60} style={{position: "absolute", top: 760, right: 46, rotate: "4deg"}}>
        <span style={{color: "#e3b341"}}>★</span> {t < b.tBlowing + 0.7 ? `${stars.toFixed(1)}k` : fmtStars(p.stars)} stars
      </Chip>
    </PhoneScene>
  );
};

// Fit an image into the card area: landscape → 960 wide; portrait → 740 tall.
const fit = (im: Img2) => {
  const r = im.h / im.w;
  return r > 0.95 ? {w: Math.round(Math.min(960, 740 / r)), h: Math.round(Math.min(960, 740 / r) * r)} : {w: 960, h: Math.round(960 * r)};
};

const CardImg: React.FC<{im: Img2}> = ({im}) => {
  const {w, h} = fit(im);
  return (
    <div style={{width: w, height: h, borderRadius: 26, overflow: "hidden", border: `3px solid ${C.LINE}`, boxShadow: "0 40px 100px rgba(0,0,0,0.6)", background: C.CARD}}>
      <Img src={staticFile(im.src)} style={{width: "100%", height: "100%", objectFit: "cover", display: "block"}} />
    </div>
  );
};

const FeatureScene: React.FC<{fe: Feature}> = ({fe}) => {
  const o = fe.start;
  const t = useT(o);
  const dur = fe.end - o;
  const out = interpolate(t, [fe.end - 0.22, fe.end], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const inn = usePop(fe.cardsAt, o);
  const push = interpolate(t, [fe.cardsAt, fe.end], [1, 1.06], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const top = 340;
  const first = fe.cards[0];
  const fh = first ? fit(first).h : 0;
  const chipTop = Math.min(top + fh * 1.06 + 70, 1160);
  const rows = [fe.chips.slice(0, 2), fe.chips.slice(2, 4)];
  return (
    <AbsoluteFill style={{opacity: 1 - out}}>
      {fe.cards.map((im, i) => {
        const p = i === 0 ? inn : usePop(im.at, o); // eslint-disable-line react-hooks/rules-of-hooks
        const {w} = fit(im);
        return (
          <div key={i} style={{position: "absolute", top: top + i * 60, left: (1080 - w) / 2, opacity: Math.min(p * 1.4, 1),
            transform: i === 0 ? `translateX(${(1 - p) * 500 - out * 500}px) scale(${push})` : `translateY(${(1 - p) * 300}px) rotate(${-3 * p}deg) scale(0.94)`}}>
            <CardImg im={im} />
          </div>
        );
      })}
      {rows.map((row, r) => (
        <div key={r} style={{position: "absolute", top: chipTop + r * 130, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 22}}>
          {row.map((c, i) => <Chip key={i} at={c.at} offset={o} tone={c.tone ?? (r === 1 ? "accent" : "plain")} size={row.length === 1 ? 56 : 46}>{c.label}</Chip>)}
        </div>
      ))}
      {dur < 0 ? null : null}
    </AbsoluteFill>
  );
};

const PromiseRow: React.FC<{at: number; o: number; text: string}> = ({at, o, text}) => {
  const p = usePop(at, o, 13);
  return (
    <div style={{display: "flex", alignItems: "center", gap: 34, opacity: Math.min(p * 1.5, 1), transform: `translateX(${(1 - p) * -160}px)`}}>
      <div style={{width: 110, height: 110, flexShrink: 0, borderRadius: 55, background: rgba(C.NEG, 0.14), border: `4px solid ${C.NEG}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.NEG, fontFamily: INTER, fontWeight: 900, fontSize: 64, transform: `scale(${0.5 + 0.5 * p}) rotate(${(1 - p) * -90}deg)`}}>✕</div>
      <span style={{fontFamily: INTER, fontWeight: 900, fontSize: text.length > 14 ? 76 : 92, letterSpacing: "-0.04em", color: C.TEXT}}>{text}</span>
    </div>
  );
};

const Terminal: React.FC<{at: number; o: number; cmd: string}> = ({at, o, cmd}) => {
  const t = useT(o);
  const p = usePop(at, o);
  const accent = useAccent();
  // long one-liners type faster and set smaller so they finish early and fit the 980px box
  const n = Math.max(0, Math.min(cmd.length, Math.floor((t - at - 0.15) * Math.max(34, cmd.length * 1.4))));
  const size = cmd.length > 42 ? 28 : cmd.length > 34 ? 32 : 40;
  return (
    <div style={{position: "absolute", top: 1250, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: Math.min(p * 1.5, 1), transform: `translateY(${(1 - p) * 60}px)`}}>
      <div style={{padding: "26px 36px", borderRadius: 22, background: "#010409", border: `3px solid ${accent.hex}`, boxShadow: "0 30px 80px rgba(0,0,0,0.7)", fontFamily: MONO, fontWeight: 700, fontSize: size, color: C.TEXT, minWidth: 820, maxWidth: 980, whiteSpace: "nowrap"}}>
        {/* no one-liner ("Download from GitHub Releases") → a download label, not a fake shell prompt */}
        <span style={{color: accent.hex}}>{/^download/i.test(cmd) ? "⬇ " : "$ "}</span>{cmd.slice(0, n)}<span style={{opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: accent.hex}}>▍</span>
      </div>
    </div>
  );
};

const Cta: React.FC<{p: ReelProps}> = ({p}) => {
  const {b} = p;
  const o = b.cta;
  const t = useT(o);
  const accent = useAccent();
  const a = usePop(b.tComment, o);
  const m = usePop(b.tKey, o, 9);
  const c = usePop(b.tKey + 0.9, o);
  const f2 = usePop(b.tKey + 1.4, o);
  const wiggle = t > b.tKey + 0.5 ? Math.sin((t - b.tKey - 0.5) * 9) * 3 * Math.max(0, 1 - (t - b.tKey - 0.5) / 1.2) : 0;
  const kw = p.keyword.toUpperCase();
  return (
    <AbsoluteFill style={{alignItems: "center"}}>
      <div style={{position: "absolute", top: 540, fontFamily: INTER, fontWeight: 900, fontSize: 130, letterSpacing: "-0.04em", color: C.TEXT, opacity: a, transform: `translateY(${(1 - a) * 50}px)`}}>Comment</div>
      <div style={{position: "absolute", top: 720, padding: "10px 70px 22px", borderRadius: 48, background: accent.hex, color: accent.ink, fontFamily: INTER, fontWeight: 900, fontSize: kw.length > 5 ? 190 : 250, letterSpacing: "-0.05em", lineHeight: 1.05, boxShadow: `0 30px 90px ${rgba(accent.hex, 0.45)}`, opacity: Math.min(m * 1.5, 1), transform: `scale(${0.4 + 0.6 * m}) rotate(${wiggle}deg)`}}>{kw}</div>
      <div style={{position: "absolute", top: 1100, display: "flex", alignItems: "center", gap: 20, fontFamily: INTER, fontWeight: 800, fontSize: 56, color: C.MUTED, opacity: c, transform: `translateY(${(1 - c) * 40}px)`}}>
        <span style={{fontSize: 60}}>💬</span> link goes straight to your DMs
      </div>
      <div style={{position: "absolute", top: 1240, display: "flex", alignItems: "center", gap: 18, padding: "16px 34px 16px 22px", borderRadius: 999, background: C.CARD, border: `3px solid ${accent.hex}`, fontFamily: INTER, fontWeight: 900, fontSize: 56, opacity: f2, transform: `translateY(${(1 - f2) * 40}px) scale(${0.9 + 0.1 * f2})`}}>
        <GitMark size={64} accent={accent.hex} />
        <span style={{color: accent.hex}}>@itsongit</span>
      </div>
    </AbsoluteFill>
  );
};

export const Reel: React.FC<ReelProps> = (p) => {
  const {b, features} = p;
  const firstFeature = features[0]?.start ?? b.promise;
  const center: Zone[] = features.filter((fe) => fe.cardsAt > fe.start + 0.3).map((fe) => [fe.start, fe.cardsAt]);
  const hide: Zone[] = [[b.tComment, b.end]];
  const cues: [number, string][] = [
    [b.t40 - 0.02, "pop"], [b.tThis - 0.07, "swish"], [b.tFree1 - 0.06, "thud"],
    [b.ghStart - 0.05, "whoosh"], [b.t100, "pop"], [b.tOpen, "pop"], [b.tBlowing, "ding"],
    ...features.flatMap((fe): [number, string][] => [[fe.start - 0.05, fe.cardsAt > fe.start + 0.3 ? "swish" : "whoosh"],
      ...(fe.cardsAt > fe.start + 0.3 ? [[fe.cardsAt - 0.05, "whoosh"] as [number, string]] : []),
      ...fe.chips.map((c): [number, string] => [c.at, "pop"]), ...fe.cards.slice(1).map((c): [number, string] => [c.at, "swish"])]),
    ...p.nolist.map((n): [number, string] => [n.at - 0.02, "click"]),
    [b.install - 0.05, "whoosh"], [b.tOne + 0.1, "type"], [b.cta - 0.05, "whoosh"], [b.tKey, "ding"],
  ];
  return (
    <AccentCtx.Provider value={accentFor(p.accent)}>
      <AbsoluteFill style={{background: C.BG}}>
        <Background />
        <Seq from={0} to={b.ghStart} name="hook"><Hook src={`${p.dir}/hook.mp4`} dur={b.ghStart} /></Seq>
        <Seq from={b.ghStart} to={firstFeature} name="repo-pill"><RepoPill dur={firstFeature - b.ghStart} dir={p.dir} owner={p.owner} name={p.name} /></Seq>
        {features.map((fe, i) => (
          <Seq key={`pill${i}`} from={fe.cardsAt} to={fe.end} name={`pill-${i}`}><RepoPill dur={fe.end - fe.cardsAt} dir={p.dir} owner={p.owner} name={p.name} /></Seq>
        ))}
        <Seq from={b.promise} to={b.cta} name="pill-end"><RepoPill dur={b.cta - b.promise} dir={p.dir} owner={p.owner} name={p.name} /></Seq>
        <Seq from={b.ghStart} to={firstFeature} name="github"><GitHub p={p} end={firstFeature} /></Seq>
        {features.map((fe, i) => (
          <Seq key={i} from={fe.start} to={fe.end} name={`feature-${i}`}><FeatureScene fe={{...fe, cardsAt: fe.cardsAt, end: fe.end}} /></Seq>
        ))}
        <Seq from={b.promise} to={b.install} name="promise">
          <PromiseBlock p={p} />
        </Seq>
        <Seq from={b.install} to={b.cta} name="install">
          <PhoneScene dur={b.cta - b.install} src={`${p.dir}/install-phone.mp4`} url={p.install.url}>
            <Terminal at={b.tOne} o={b.install} cmd={p.install.cmd} />
          </PhoneScene>
        </Seq>
        <Seq from={b.cta} to={b.end} name="cta"><Cta p={p} /></Seq>
        <Captions words={p.words} center={center} hide={hide} />
        <Watermark />
        <Audio src={staticFile(`${p.dir}/vo.wav`)} />
        <Sfx cues={cues} />
      </AbsoluteFill>
    </AccentCtx.Provider>
  );
};

const PromiseBlock: React.FC<{p: ReelProps}> = ({p}) => {
  const o = p.b.promise;
  const {out} = useScene(p.b.install - o);
  return (
    <AbsoluteFill style={{opacity: 1 - out, transform: `scale(${1 - out * 0.08})`}}>
      <div style={{position: "absolute", top: 520, left: 110, right: 60, display: "flex", flexDirection: "column", gap: 70}}>
        {p.nolist.map((n, i) => <PromiseRow key={i} at={n.at} o={o} text={n.text} />)}
      </div>
    </AbsoluteFill>
  );
};
