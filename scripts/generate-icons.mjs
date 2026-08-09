/* Generates YOMI's PWA icons + OG image from inline SVG.
   Run with: npm run icons
   Requires the dev dependency `sharp`. Outputs to /public. The PNGs are
   committed, so this only needs re-running when the brand mark changes. */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

const INDIGO = "#3B4CCA";
const INDIGO_DEEP = "#2E3BA6";
const KANA_FONT = "WenQuanYi Zen Hei";
const SANS = "DejaVu Sans";

// Square app icon. `pad` shrinks the glyph for maskable safe-area.
function iconSVG(size, { maskable = false } = {}) {
  const r = maskable ? 0 : Math.round(size * 0.22);
  const glyph = Math.round(size * (maskable ? 0.5 : 0.62));
  const cy = size * 0.5 + glyph * 0.34;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${INDIGO}"/>
      <stop offset="1" stop-color="${INDIGO_DEEP}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/>
  <rect width="${size}" height="${size}" rx="${r}" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="${Math.max(1, size * 0.01)}"/>
  <text x="50%" y="${cy}" text-anchor="middle" font-family="${KANA_FONT}" font-size="${glyph}" fill="#ffffff">よ</text>
</svg>`;
}

// 1200x630 Open Graph / Twitter share card.
function ogSVG() {
  const W = 1200;
  const H = 630;
  const tile = (x, ch, fill, ink) =>
    `<g>
      <rect x="${x}" y="392" width="96" height="96" rx="20" fill="${fill}" stroke="rgba(255,255,255,0.9)" stroke-width="2"/>
      <text x="${x + 48}" y="458" text-anchor="middle" font-family="${KANA_FONT}" font-size="52" fill="${ink}">${ch}</text>
    </g>`;
  const tilesStart = W / 2 - (4 * 96 + 3 * 12) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FDFDFE"/>
      <stop offset="0.5" stop-color="#F1F3F7"/>
      <stop offset="1" stop-color="#DFE3ED"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="0%" r="60%">
      <stop offset="0" stop-color="rgba(255,255,255,0.9)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <text x="50%" y="235" text-anchor="middle" font-family="${SANS}" font-weight="bold" font-size="132" letter-spacing="18" fill="#1A1C22">YOMI</text>
  <text x="50%" y="300" text-anchor="middle" font-family="${SANS}" font-size="34" letter-spacing="2" fill="#4C4F5A">one Japanese word a day</text>
  ${tile(tilesStart + 0 * 108, "よ", "#2F9E63", "#ffffff")}
  ${tile(tilesStart + 1 * 108, "み", "#C99A32", "#ffffff")}
  ${tile(tilesStart + 2 * 108, "こ", "#ffffff", "#1A1C22")}
  ${tile(tilesStart + 3 * 108, "と", "#A7ABB6", "#ffffff")}
  <text x="50%" y="560" text-anchor="middle" font-family="${SANS}" font-size="26" letter-spacing="1" fill="#7C808C">Spell it in hiragana · build your streak · share the grid</text>
</svg>`;
}

async function png(svg, size, out) {
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  writeFileSync(join(PUBLIC, out), buf);
  console.log("wrote", out);
}

async function pngWH(svg, w, h, out) {
  const buf = await sharp(Buffer.from(svg)).resize(w, h).png().toBuffer();
  writeFileSync(join(PUBLIC, out), buf);
  console.log("wrote", out);
}

async function main() {
  await png(iconSVG(192), 192, "icon-192.png");
  await png(iconSVG(512), 512, "icon-512.png");
  await png(iconSVG(180), 180, "apple-touch-icon.png");
  await png(iconSVG(192, { maskable: true }), 192, "icon-maskable-192.png");
  await png(iconSVG(512, { maskable: true }), 512, "icon-maskable-512.png");
  await png(iconSVG(512), 512, "icon.png");
  await pngWH(ogSVG(), 1200, 630, "og.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
