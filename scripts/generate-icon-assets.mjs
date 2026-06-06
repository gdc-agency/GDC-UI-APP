/**
 * Generates in-app and launcher assets from app-icon-source.png.
 * White background, padded so the full circular logo stays visible on Android.
 *
 * Run: npm run generate:icons
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'assets/images');
const sourcePath = path.join(outDir, 'app-icon-source.png');

const CANVAS = 1024;
/**
 * Android adaptive safe zone ≈ 66/108 (61%). Keep the orange ring near ~44%
 * of the canvas so squircle / circle launchers never clip the emblem.
 */
const ADAPTIVE_LOGO_RATIO = 0.42;
const ADAPTIVE_LOGO_SIZE = Math.round(CANVAS * ADAPTIVE_LOGO_RATIO);
/** Store / legacy launcher tile — padded white square, still fully readable. */
const LAUNCHER_LOGO_RATIO = 0.56;
const LAUNCHER_LOGO_SIZE = Math.round(CANVAS * LAUNCHER_LOGO_RATIO);
const BRAND_LOGO_SIZE = 896;
const NAV_LOGO_SIZE = 128;
const SPLASH_LOGO_WIDTH = 220;

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

function isDarkPixel(r, g, b) {
  return r < 36 && g < 36 && b < 36;
}

/**
 * Turn outer black margins white; keep the emblem artwork unchanged.
 */
async function prepareSourceBuffer() {
  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Uint8ClampedArray.from(data);
  const visited = new Uint8Array(width * height);
  const queue = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];

  const idx = (x, y) => (y * width + x) * channels;
  const pixelAt = (x, y) => {
    const i = idx(x, y);
    return [out[i], out[i + 1], out[i + 2]];
  };

  while (queue.length) {
    const [x, y] = queue.pop();
    const p = y * width + x;
    if (x < 0 || y < 0 || x >= width || y >= height || visited[p]) continue;

    const [r, g, b] = pixelAt(x, y);
    visited[p] = 1;

    if (!isDarkPixel(r, g, b)) continue;

    out[idx(x, y)] = 255;
    out[idx(x, y) + 1] = 255;
    out[idx(x, y) + 2] = 255;
    out[idx(x, y) + 3] = 255;

    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return sharp(out, { raw: { width, height, channels } }).png().toBuffer();
}

/** Trim excess canvas, square it with equal padding, then resize. */
async function centerOnSquareCanvas(inputBuffer, size) {
  const trimmed = await sharp(inputBuffer)
    .trim({ threshold: 8, background: WHITE })
    .toBuffer();

  const { width = 0, height = 0 } = await sharp(trimmed).metadata();
  const side = Math.max(width, height, 1);

  const squared = await sharp({
    create: {
      width: side,
      height: side,
      channels: 4,
      background: WHITE,
    },
  })
    .composite([{ input: trimmed, gravity: 'centre' }])
    .png()
    .toBuffer();

  return sharp(squared)
    .resize(size, size, { fit: 'fill', background: WHITE })
    .flatten({ background: WHITE })
    .png()
    .toBuffer();
}

async function loadPreparedLogo(maxSize, preparedSource) {
  return centerOnSquareCanvas(preparedSource, maxSize);
}

/** Remove outer white padding only — keeps the emblem interior intact. */
async function outerWhiteToTransparent(inputBuffer) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Uint8ClampedArray.from(data);
  const visited = new Uint8Array(width * height);
  const queue = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];

  const idx = (x, y) => (y * width + x) * channels;
  const isOuterWhite = (x, y) => {
    const i = idx(x, y);
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const a = out[i + 3];
    return a > 0 && r > 242 && g > 242 && b > 242;
  };

  while (queue.length) {
    const [x, y] = queue.pop();
    const p = y * width + x;
    if (x < 0 || y < 0 || x >= width || y >= height || visited[p]) continue;
    visited[p] = 1;
    if (!isOuterWhite(x, y)) continue;

    const i = idx(x, y);
    out[i + 3] = 0;

    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return sharp(out, { raw: { width, height, channels } }).png().toBuffer();
}

/** Adaptive foreground must be transparent outside the artwork. */
async function whiteToTransparent(inputBuffer) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Uint8ClampedArray.from(data);

  for (let i = 0; i < out.length; i += channels) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    if (r > 242 && g > 242 && b > 242) {
      out[i + 3] = 0;
    }
  }

  return sharp(out, { raw: { width, height, channels } }).png().toBuffer();
}

async function writeOnCanvas(logoBuffer, canvasSize, outPath) {
  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: WHITE,
    },
  })
    .composite([{ input: logoBuffer, gravity: 'centre' }])
    .png()
    .toFile(outPath);
}

async function writeTransparentForeground(logoBuffer, canvasSize, outPath) {
  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite([{ input: logoBuffer, gravity: 'centre' }])
    .png()
    .toFile(outPath);
}

async function writeSolidBackground(outPath) {
  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: WHITE,
    },
  })
    .png()
    .toFile(outPath);
}

async function main() {
  const preparedSource = await prepareSourceBuffer();
  const brandLogo = await loadPreparedLogo(BRAND_LOGO_SIZE, preparedSource);
  const navLogoOpaque = await loadPreparedLogo(NAV_LOGO_SIZE, preparedSource);
  const navLogo = await outerWhiteToTransparent(navLogoOpaque);
  const adaptiveLogoOpaque = await loadPreparedLogo(ADAPTIVE_LOGO_SIZE, preparedSource);
  const adaptiveLogo = await whiteToTransparent(adaptiveLogoOpaque);
  const launcherLogo = await loadPreparedLogo(LAUNCHER_LOGO_SIZE, preparedSource);
  const splashLogo = await loadPreparedLogo(SPLASH_LOGO_WIDTH, preparedSource);
  const faviconLogo = await loadPreparedLogo(448, preparedSource);

  await sharp(brandLogo).toFile(path.join(outDir, 'brand-logo.png'));
  await sharp(navLogo).toFile(path.join(outDir, 'nav-logo.png'));
  await writeOnCanvas(launcherLogo, CANVAS, path.join(outDir, 'launcher-icon.png'));
  await writeOnCanvas(launcherLogo, CANVAS, path.join(outDir, 'icon.png'));
  await writeSolidBackground(path.join(outDir, 'android-icon-background.png'));
  await writeTransparentForeground(
    adaptiveLogo,
    CANVAS,
    path.join(outDir, 'android-icon-foreground.png'),
  );
  await sharp(splashLogo)
    .flatten({ background: WHITE })
    .toFile(path.join(outDir, 'splash-icon.png'));
  await writeOnCanvas(faviconLogo, 512, path.join(outDir, 'favicon.png'));

  console.log(
    `Generated launcher + adaptive assets (adaptive ${ADAPTIVE_LOGO_SIZE}px, launcher ${LAUNCHER_LOGO_SIZE}px on ${CANVAS}px canvas).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
