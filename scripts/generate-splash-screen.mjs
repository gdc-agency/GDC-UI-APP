/**
 * Full-screen native splash (1080×2400) — waves + GDC branding.
 * Run: node scripts/generate-splash-screen.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outPath = path.join(root, 'assets/images/splash-screen.png');
const logoPath = path.join(root, 'assets/images/brand-logo.png');

const W = 1080;
const H = 2400;
const NAVY = '#1E3A5F';
const ORANGE = '#F97316';
const BLUE_WAVE = '#93C5FD';
const ORANGE_WAVE = '#FDBA74';
const TAGLINE = '#64748B';

function splashSvg() {
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>

  <!-- top-left waves -->
  <path d="M-40,80 C120,320 280,120 420,40" stroke="${BLUE_WAVE}" stroke-width="5" fill="none" opacity="0.55"/>
  <path d="M-20,180 C140,380 300,200 460,100" stroke="${ORANGE_WAVE}" stroke-width="4" fill="none" opacity="0.45"/>
  <circle cx="90" cy="110" r="7" fill="${BLUE_WAVE}" opacity="0.65"/>
  <circle cx="160" cy="175" r="5" fill="${ORANGE_WAVE}" opacity="0.6"/>

  <!-- bottom-right waves -->
  <path d="M660,2280 C840,2100 960,2260 1120,2140" stroke="${BLUE_WAVE}" stroke-width="5" fill="none" opacity="0.5"/>
  <path d="M700,2340 C860,2180 980,2320 1140,2220" stroke="${ORANGE_WAVE}" stroke-width="4" fill="none" opacity="0.4"/>
  <circle cx="900" cy="2250" r="7" fill="${BLUE_WAVE}" opacity="0.6"/>
  <circle cx="980" cy="2310" r="5" fill="${ORANGE_WAVE}" opacity="0.55"/>

  <!-- GDC acronym lines -->
  <line x1="300" y1="1288" x2="430" y2="1288" stroke="#CBD5E1" stroke-width="3"/>
  <line x1="650" y1="1288" x2="780" y2="1288" stroke="#CBD5E1" stroke-width="3"/>
  <text x="540" y="1305" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="800">
    <tspan fill="${NAVY}">GD</tspan><tspan fill="${ORANGE}">C</tspan>
  </text>

  <!-- Global Digital Care -->
  <text x="540" y="1388" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800">
    <tspan fill="${NAVY}">Global </tspan><tspan fill="${ORANGE}">Digital </tspan><tspan fill="${NAVY}">Care</tspan>
  </text>

  <!-- Tagline -->
  <text x="540" y="1458" text-anchor="middle" fill="${TAGLINE}" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="600">
    Turning Clicks into Clients
  </text>
</svg>`;
}

async function main() {
  const logoSize = 220;
  const logoY = Math.round(H * 0.42 - logoSize / 2);

  const base = await sharp(Buffer.from(splashSvg())).png().toBuffer();
  const logo = await sharp(logoPath).resize(logoSize, logoSize, { fit: 'contain' }).png().toBuffer();

  await sharp(base)
    .composite([{ input: logo, top: logoY, left: Math.round((W - logoSize) / 2) }])
    .png()
    .toFile(outPath);

  const meta = await sharp(outPath).metadata();
  console.log(`Wrote ${outPath} (${meta.width}x${meta.height})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
