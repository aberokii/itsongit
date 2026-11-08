import {continueRender, delayRender, staticFile} from "remotion";
import list from "../public/fonts/fonts.json";

// Self-hosted copies of the Google Fonts we use (public/fonts, OFL; fetched by scripts/fetch-fonts.sh). Loading them
// from disk instead of fonts.gstatic.com makes renders deterministic and lets them run offline or behind a proxy.
type F = {family: string; style: string; weight: string; file: string};
const loaded: Record<string, boolean> = {};

export const localFont = (family: string): string => {
  if (typeof document !== "undefined" && !loaded[family]) {
    loaded[family] = true;
    const faces = (list as F[]).filter((f) => f.family === family);
    if (!faces.length) throw new Error(`font ${family} is not in public/fonts/fonts.json`);
    const h = delayRender(`font ${family}`);
    Promise.all(faces.map((f) => {
      const ff = new FontFace(family, `url(${staticFile(`fonts/${f.file}`)}) format("woff2")`, {style: f.style, weight: f.weight});
      return ff.load().then((x) => document.fonts.add(x));
    })).then(() => continueRender(h)).catch((e) => { console.error(e); continueRender(h); });
  }
  return `"${family}"`;
};
