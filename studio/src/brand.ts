import brand from "../../brand.json";

// Locked house style for every itsongit reel. Only the accent changes: one of five, by daily post slot.
export const BRAND = brand;
export const SAFE = brand.safe; // keep all content between safe.top and safe.bottom (Instagram UI + notches)

export const C = {
  BG: brand.base.bg,
  CARD: brand.base.card,
  LINE: brand.base.line,
  TEXT: brand.base.text,
  MUTED: brand.base.muted,
  NEG: brand.base.negative,
} as const;

export type Accent = {name: string; hex: string; ink: string};
export const accentFor = (slot: number): Accent => brand.accents[((slot % 5) + 5) % 5];

export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
