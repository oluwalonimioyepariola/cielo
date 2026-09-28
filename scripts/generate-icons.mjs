// Generates Cielo's app icon, Android adaptive icon layers, splash image and favicon from SVG.
// The artwork is code: edit the shapes below and run `npm run icons`.
//
// The mark is Cielo's mascot, the chat cloud (the sky, talking), with the sun peeking out
// from behind it, on Cielo Twilight.
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const TWILIGHT = '#4a45d1';
const SUN = '#ffce00';
const CLOUD = '#ffffff';
const SIZE = 1024;
const OUT = 'assets/images';

/**
 * The chat cloud plus sun, drawn in a 1024 box. `scale` shrinks it around the centre (Android
 * adaptive icons must keep artwork inside the middle ~66%). `dots` is the colour of the typing
 * dots; 'cut' punches them out instead, for the one-colour Android themed icon.
 */
function mark({ scale = 1, dots = TWILIGHT, sun = true, cloud = CLOUD } = {}) {
  // The cloud is laid out on a 600-wide grid, the same proportions as the in-app ChatCloud.
  const w = 600;
  const x = (SIZE - w) / 2;
  const y = 300;
  const puffs = `
    <circle cx="${x + 222}" cy="${y + 174}" r="138" />
    <circle cx="${x + 390}" cy="${y + 222}" r="114" />
    <rect x="${x}" y="${y + 192}" width="${w}" height="216" rx="108" />
    <rect x="${x + 96}" y="${y + 336}" width="108" height="108" rx="18" transform="rotate(45 ${x + 150} ${y + 390})" />`;
  const dotY = y + 288;
  const dotCircles = [-84, 0, 84].map((dx) => `<circle cx="${SIZE / 2 + dx}" cy="${dotY}" r="24" />`).join('');

  const cloudLayer =
    dots === 'cut'
      ? `<mask id="dots"><rect width="${SIZE}" height="${SIZE}" fill="#fff"/><g fill="#000">${dotCircles}</g></mask>
         <g fill="${cloud}" mask="url(#dots)">${puffs}</g>`
      : `<g fill="${cloud}">${puffs}</g><g fill="${dots}">${dotCircles}</g>`;

  const sunLayer = sun
    ? `<circle cx="700" cy="390" r="210" fill="#ffffff" fill-opacity="0.12" />
       <circle cx="700" cy="390" r="150" fill="${SUN}" />`
    : '';

  // The sun's halo pulls the eye right; nudge the whole mark left so cloud + sun sit optically centred.
  const nudge = sun ? -36 : 0;
  const offset = (SIZE * (1 - scale)) / 2;
  return `<g transform="translate(${offset + nudge * scale} ${offset}) scale(${scale})">${sunLayer}${cloudLayer}</g>`;
}

const svg = (body, background) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      ${background ? `<rect width="${SIZE}" height="${SIZE}" fill="${background}" />` : ''}
      ${body}
    </svg>`,
  );

const render = (name, body, background, size = SIZE) =>
  sharp(svg(body, background)).resize(size, size).png().toFile(`${OUT}/${name}`);

mkdirSync(OUT, { recursive: true });
await Promise.all([
  // iOS and the store listing: full-bleed square, the system rounds the corners.
  render('icon.png', mark(), TWILIGHT),
  // Android adaptive icon: the launcher composes these layers and masks them to any shape.
  render('android-icon-background.png', '', TWILIGHT),
  render('android-icon-foreground.png', mark({ scale: 0.7 })),
  // Android 13+ themed icon: one colour, tinted by the system; the dots are cut out.
  render('android-icon-monochrome.png', mark({ scale: 0.7, sun: false, dots: 'cut', cloud: '#000000' })),
  // Splash: the mark alone, on the splash background colour set in app.json.
  render('splash-icon.png', mark({ dots: TWILIGHT })),
  render('favicon.png', mark(), TWILIGHT, 48),
]);
console.log(`Icons written to ${OUT}/`);
