/*
 * The app's sky, drawn the same way (src/components/sky-hero.tsx): soft clouds made of a rounded
 * base and two puffs, the sun in a white halo, and a scalloped cloud edge in the page colour.
 */

/** A small soft cloud. Height is about 0.72 × width. */
export function Cloud({ width, className = '', style }: { width: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span aria-hidden className={`absolute block ${className}`} style={{ width, height: width * 0.72, ...style }}>
      <span className="absolute rounded-full bg-on-sky" style={{ width: width * 0.46, height: width * 0.46, left: width * 0.14, top: width * 0.06 }} />
      <span className="absolute rounded-full bg-on-sky" style={{ width: width * 0.38, height: width * 0.38, left: width * 0.46, top: width * 0.18 }} />
      <span className="absolute rounded-full bg-on-sky" style={{ width, height: width * 0.36, top: width * 0.32 }} />
    </span>
  );
}

/** The sun in its halo. The halo is the sky lit up (white at 12%), never a yellow wash. */
export function Sun({ size, className = '' }: { size: number; className?: string }) {
  return (
    <span aria-hidden className={`absolute grid place-items-center ${className}`} style={{ width: size * 1.5, height: size * 1.5 }}>
      <span className="absolute inset-0 rounded-full bg-white/12" />
      <span className="rounded-full bg-sun" style={{ width: size, height: size }} />
    </span>
  );
}

// Puff sizes, repeated across the width; varied so the edge reads as cloud, not lace.
const PUFFS = [76, 104, 64, 92, 120, 70, 98, 84];
// The edge layer: puff centres sit on the top line of a solid strip, as in the app.
const EDGE_HEIGHT = 96;
const FILL = 30;

/** A scalloped row of overlapping puffs in the page colour along the bottom of a sky field. */
export function CloudEdge({ width = 1600 }: { width?: number }) {
  const puffs: { size: number; left: number }[] = [];
  for (let x = -24, i = 0; x < width + 24; i++) {
    const size = PUFFS[i % PUFFS.length];
    puffs.push({ size, left: x });
    x += size * 0.62;
  }
  return (
    <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 block overflow-hidden" style={{ height: EDGE_HEIGHT }}>
      {puffs.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-canvas"
          style={{ width: p.size, height: p.size, left: p.left, top: EDGE_HEIGHT - FILL - p.size / 2 }}
        />
      ))}
      <span className="absolute inset-x-0 bottom-0 block bg-canvas" style={{ height: FILL }} />
    </span>
  );
}
