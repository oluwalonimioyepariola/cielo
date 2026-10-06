// Generates Cielo's app icon, Android adaptive icon layers, splash image and favicon from SVG.
// The artwork is code: edit the shapes below and run `npm run icons`.
//
// The logo is the sun exactly as it rises in the app's sky (src/components/sky-hero.tsx): a yellow
// disc in a soft white halo, on Cielo Twilight.
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SUN = '#ffce00';
const WHITE = '#ffffff';
const SIZE = 1024;
const OUT = 'assets/images';

const SKY = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5c56ec" /><stop offset="1" stop-color="#3b36bd" />
  </linearGradient>`;

/**
 * The sun, centred, with a halo 1.5x the disc as in the app. `scale` shrinks it (Android adaptive
 * icons keep artwork inside the middle ~66%). `mono` is for the Android themed icon, where only
 * opacity counts.
 */
function mark({ scale = 1, mono = false } = {}) {
  const r = 190 * scale;
  return `<circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${r * 1.5}" fill="${WHITE}" fill-opacity="${mono ? 0.45 : 0.12}" />
    <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${r}" fill="${mono ? WHITE : SUN}" />`;
}

/** The iOS icon shape: a superellipse ("squircle"), whose corners curve more smoothly than a rounded rect. */
function squircle(n = 5) {
  const half = SIZE / 2;
  const points = Array.from({ length: 360 }, (_, i) => {
    const t = (i / 360) * 2 * Math.PI;
    const x = Math.sign(Math.cos(t)) * Math.abs(Math.cos(t)) ** (2 / n);
    const y = Math.sign(Math.sin(t)) * Math.abs(Math.sin(t)) ** (2 / n);
    return `${(half + half * x).toFixed(1)} ${(half + half * y).toFixed(1)}`;
  });
  return `M ${points.join(' L ')} Z`;
}

/** `shaped` cuts the background to the iOS icon shape, for places that show the icon without a system mask. */
const svg = (body, background, shaped = false) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <defs>${SKY}</defs>
      ${background && shaped ? `<path d="${squircle()}" fill="${background}" />` : ''}
      ${background && !shaped ? `<rect width="${SIZE}" height="${SIZE}" fill="${background}" />` : ''}
      ${body}
    </svg>`,
  );

const render = (path, body, background, size = SIZE, shaped = false) =>
  sharp(svg(body, background, shaped))
    .resize(size, size)
    .png()
    .toFile(path.includes('/') ? path : `${OUT}/${path}`);

mkdirSync(OUT, { recursive: true });
await Promise.all([
  // iOS and the store listing: full-bleed square, the system rounds the corners.
  render('icon.png', mark(), 'url(#sky)'),
  // Android adaptive icon: the launcher composes these layers and masks them to any shape.
  render('android-icon-background.png', '', 'url(#sky)'),
  render('android-icon-foreground.png', mark({ scale: 0.72 })),
  // Android 13+ themed icon: one colour, tinted by the system.
  render('android-icon-monochrome.png', mark({ scale: 0.72, mono: true })),
  // Splash: the sun alone, on the splash background colour set in app.json.
  render('splash-icon.png', mark()),
  render('favicon.png', mark(), 'url(#sky)', 48),
  // README heading: GitHub strips styles, so the icon shape is baked into the image.
  render('docs/media/logo.png', mark(), 'url(#sky)', 160, true),
  // Website (Next.js picks these up by file name): the browser tab icon and the iOS home-screen icon.
  render('website/src/app/icon.png', mark(), 'url(#sky)', 512, true),
  render('website/src/app/apple-icon.png', mark(), 'url(#sky)', 180),
]);
console.log(`Icons written to ${OUT}/`);
