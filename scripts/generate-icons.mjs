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

// Square app icon: a "Y" wordmark rendered as a Liquid Glass tile — indigo
// base, a refractive prism rim, a top specular sheen, a lower caustic pool,
// and a glassy Y with real thickness. The Y is drawn as a path (round joins)
// so it needs no font. `maskable` makes it full-bleed for the Android safe area.
function iconSVG(size, { maskable = false } = {}) {
  const S = size;
  const r = maskable ? 0 : Math.round(S * 0.225);
  const inset = maskable ? 0 : S * 0.03; // pull the rim stroke inside the edge
  const rimW = Math.max(1, S * 0.02);

  // Y geometry (fractions of S) — sits within the maskable safe area.
  const lx = 0.335 * S, rx = 0.665 * S, cx = 0.5 * S;
  const ty = 0.305 * S, my = 0.515 * S, by = 0.715 * S;
  const yPath = `M ${lx} ${ty} L ${cx} ${my} L ${rx} ${ty} M ${cx} ${my} L ${cx} ${by}`;
  const yW = S * 0.12;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="0.15" y2="1">
      <stop offset="0" stop-color="#4E5EDC"/>
      <stop offset="0.55" stop-color="${INDIGO}"/>
      <stop offset="1" stop-color="${INDIGO_DEEP}"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="rgba(255,255,255,0.95)"/>
      <stop offset="0.24" stop-color="rgba(255,255,255,0.28)"/>
      <stop offset="0.46" stop-color="rgba(150,175,255,0.75)"/>
      <stop offset="0.6" stop-color="rgba(255,255,255,0.3)"/>
      <stop offset="0.8" stop-color="rgba(255,170,210,0.7)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0.95)"/>
    </linearGradient>
    <radialGradient id="sheen" cx="0.3" cy="-0.1" r="0.9">
      <stop offset="0" stop-color="rgba(255,255,255,0.92)"/>
      <stop offset="0.42" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    <radialGradient id="caustic" cx="0.72" cy="1.12" r="0.7">
      <stop offset="0" stop-color="rgba(160,190,255,0.55)"/>
      <stop offset="0.5" stop-color="rgba(160,190,255,0)"/>
    </radialGradient>
    <linearGradient id="yface" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(255,255,255,1)"/>
      <stop offset="1" stop-color="rgba(226,232,255,0.9)"/>
    </linearGradient>
    <clipPath id="clip"><rect width="${S}" height="${S}" rx="${r}"/></clipPath>
  </defs>

  <rect width="${S}" height="${S}" rx="${r}" fill="url(#base)"/>
  <g clip-path="url(#clip)">
    <rect width="${S}" height="${S}" fill="url(#sheen)"/>
    <rect width="${S}" height="${S}" fill="url(#caustic)"/>
    <!-- soft specular streak near the top edge -->
    <ellipse cx="${S * 0.5}" cy="${S * 0.06}" rx="${S * 0.62}" ry="${S * 0.16}" fill="rgba(255,255,255,0.35)"/>
    <!-- Y drop-shadow for thickness -->
    <path d="${yPath}" fill="none" stroke="rgba(20,26,64,0.32)" stroke-width="${yW}"
      stroke-linecap="round" stroke-linejoin="round" transform="translate(0 ${S * 0.014})"/>
    <!-- Y glass face -->
    <path d="${yPath}" fill="none" stroke="url(#yface)" stroke-width="${yW}"
      stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Y top highlight -->
    <path d="${yPath}" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="${yW * 0.26}"
      stroke-linecap="round" stroke-linejoin="round" transform="translate(0 ${-S * 0.006})"/>
  </g>
  <!-- inner top hairline + refractive rim -->
  <rect x="${inset}" y="${inset}" width="${S - inset * 2}" height="${S - inset * 2}"
    rx="${Math.max(0, r - inset)}" fill="none" stroke="url(#rim)" stroke-width="${rimW}"/>
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
