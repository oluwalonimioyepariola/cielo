// Generates Cielo's app icon, Android adaptive icon layers, splash image and favicon from SVG.
// The artwork is code: edit the shapes below and run `npm run icons`.
//
// The logo is the word "cielo" in Nunito Black, with a beaming sun as the dot of the i, on the
// Cielo Twilight sky. The app icon is that sun on its own: the wordmark (splash, welcome, README)
// teaches people that the sun means Cielo, and a single bold shape still reads at home-screen size.
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

import { loadFont } from './lib/ttf.mjs';

const SUN = '#ffce00';
const WHITE = '#ffffff';
const SIZE = 1024;
const OUT = 'assets/images';
const font = loadFont('node_modules/@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf');

const SKY = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5c56ec" /><stop offset="1" stop-color="#3b36bd" />
  </linearGradient>`;

let glows = 0;

/**
 * The beaming sun: a disc with a halo 1.75x its size. The halo warms from yellow at the disc to sunset
 * peach at its edge; a flat see-through yellow mixes with the purple into a muddy grey instead.
 * `mono` is for the Android themed icon, where only opacity counts.
 */
function sun(cx, cy, r, { mono = false } = {}) {
  const halo = r * 1.75;
  if (mono) {
    return `<circle cx="${cx}" cy="${cy}" r="${halo}" fill="${WHITE}" fill-opacity="0.45" />
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${WHITE}" />`;
  }
  const id = `glow${glows++}`;
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${halo}" gradientUnits="userSpaceOnUse">
      <stop offset="${r / halo}" stop-color="#ffe066" stop-opacity="0.85" />
      <stop offset="0.8" stop-color="#ffb347" stop-opacity="0.45" />
      <stop offset="1" stop-color="#ff9a5a" stop-opacity="0.36" />
    </radialGradient>
    <circle cx="${cx}" cy="${cy}" r="${halo}" fill="url(#${id})" />
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${SUN}" />`;
}

/** The sun on its own, centred: the app icon. `scale` shrinks it (Android keeps artwork inside the middle ~66%). */
const mark = ({ scale = 1, mono } = {}) => sun(SIZE / 2, SIZE / 2, 190 * scale, { mono });

/** The wordmark, centred and `width` wide, with the sun sitting on a dotless ı. */
function wordmark(width, ink = WHITE) {
  const text = 'cıelo';
  const tracking = -0.02;
  const size = (100 * width) / font.layout(text, 100, tracking).width;
  const word = font.layout(text, size, tracking);

  // Measure at baseline 0, then centre the word plus its sun vertically.
  const stem = word.boxes(0, 0)[1];
  const stemWidth = stem.x1 - stem.x0;
  const r = stemWidth * 0.66;
  const gap = stemWidth * 0.36;
  const top = stem.top - gap - 2 * r - r * 0.75;
  const bottom = Math.max(...word.boxes(0, 0).map((b) => b.bottom));
  const baseline = SIZE / 2 - (top + bottom) / 2;
  const left = (SIZE - width) / 2;

  const i = word.boxes(left, baseline)[1];
  // The sun goes first so its halo sits behind the letters instead of tinting the top of the i.
  return `${sun((i.x0 + i.x1) / 2, i.top - gap - r, r)}<path d="${word.path(left, baseline)}" fill="${ink}" />`;
}

const svg = (body, background) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <defs>${SKY}</defs>
      ${background ? `<rect width="${SIZE}" height="${SIZE}" fill="${background}" />` : ''}
      ${body}
    </svg>`,
  );

const render = (name, body, background, size = SIZE) =>
  sharp(svg(body, background)).resize(size, size).png().toFile(`${OUT}/${name}`);

mkdirSync(OUT, { recursive: true });
await Promise.all([
  // iOS and the store listing: full-bleed square, the system rounds the corners.
  render('icon.png', mark(), 'url(#sky)'),
  // Android adaptive icon: the launcher composes these layers and masks them to any shape.
  render('android-icon-background.png', '', 'url(#sky)'),
  render('android-icon-foreground.png', mark({ scale: 0.72 })),
  // Android 13+ themed icon: one colour, tinted by the system.
  render('android-icon-monochrome.png', mark({ scale: 0.72, mono: true })),
  // Splash: the wordmark, on the splash background colour set in app.json.
  render('splash-icon.png', wordmark(900)),
  render('favicon.png', mark(), 'url(#sky)', 48),
]);
console.log(`Icons written to ${OUT}/`);
