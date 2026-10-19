// Writes brand.css (CSS variables) for a HyperFrames composition from brand.json.
// usage: node scripts/brand-css.mjs <accentIndex 0-4> <outDir>
import fs from 'node:fs';
import path from 'node:path';
const brand = JSON.parse(fs.readFileSync(new URL('../brand.json', import.meta.url)));
const [idx = '0', out = 'hyperframes'] = process.argv.slice(2);
const a = brand.accents[Number(idx) % brand.accents.length];
const b = brand.base;
const css = `:root {
  --bg: ${b.bg}; --card: ${b.card}; --line: ${b.line}; --text: ${b.text}; --muted: ${b.muted}; --negative: ${b.negative};
  --accent: ${a.hex}; --accent-ink: ${a.ink};
  --font: "${brand.fonts.display}", sans-serif; --mono: "${brand.fonts.mono}", monospace;
  --safe-top: ${brand.safe.top}px; --safe-bottom: ${brand.safe.bottom}px;
}
`;
fs.writeFileSync(path.join(out, 'brand.css'), css);
console.log(`brand.css → ${out} (accent ${a.name})`);
