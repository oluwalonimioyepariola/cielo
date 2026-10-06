// Minimal TrueType reader: turns glyphs into SVG paths (simple glyphs, cmap format 4).
import { readFileSync } from 'node:fs';
export function loadFont(file) {
  const b = readFileSync(file),
    u16 = (o) => b.readUInt16BE(o),
    i16 = (o) => b.readInt16BE(o),
    u32 = (o) => b.readUInt32BE(o);
  const tables = {};
  const n = u16(4);
  for (let i = 0; i < n; i++) {
    const o = 12 + i * 16;
    tables[b.toString('latin1', o, o + 4)] = u32(o + 8);
  }
  const upm = u16(tables.head + 18),
    locFmt = i16(tables.head + 50),
    nHM = u16(tables.hhea + 34);
  const cmap = tables.cmap;
  let sub = -1;
  for (let i = 0; i < u16(cmap + 2); i++) {
    const o = cmap + 4 + i * 8;
    if (u16(o) === 3 && u16(o + 2) === 1) sub = cmap + u32(o + 4);
  }
  const glyphId = (code) => {
    const segX2 = u16(sub + 6),
      ends = sub + 14,
      starts = ends + segX2 + 2,
      deltas = starts + segX2,
      ranges = deltas + segX2;
    for (let s = 0; s < segX2 / 2; s++) {
      if (code > u16(ends + s * 2) || code < u16(starts + s * 2)) continue;
      const ro = u16(ranges + s * 2);
      if (!ro) return (code + i16(deltas + s * 2)) & 0xffff;
      const g = u16(ranges + s * 2 + ro + (code - u16(starts + s * 2)) * 2);
      return g ? (g + i16(deltas + s * 2)) & 0xffff : 0;
    }
    return 0;
  };
  const loca = (g) => (locFmt ? u32(tables.loca + g * 4) : u16(tables.loca + g * 2) * 2);
  const advance = (g) => u16(tables.hmtx + Math.min(g, nHM - 1) * 4);
  function outline(g) {
    const o = tables.glyf + loca(g);
    if (loca(g) === loca(g + 1)) return [];
    const nc = i16(o);
    if (nc < 0) throw new Error('composite glyph ' + g);
    const endPts = Array.from({ length: nc }, (_, i) => u16(o + 10 + i * 2)),
      np = endPts[nc - 1] + 1;
    let p = o + 10 + nc * 2;
    p += 2 + u16(p);
    const flags = [];
    while (flags.length < np) {
      const f = b[p++];
      flags.push(f);
      if (f & 8) {
        let r = b[p++];
        while (r--) flags.push(f);
      }
    }
    const read = (short, same) => {
      let v = 0;
      return flags.map((f) => {
        if (f & short) {
          const d = b[p++];
          v += f & same ? d : -d;
        } else if (!(f & same)) {
          v += i16(p);
          p += 2;
        }
        return v;
      });
    };
    const xs = read(2, 16),
      ys = read(4, 32);
    const contours = [];
    let s = 0;
    for (const e of endPts) {
      contours.push(xs.slice(s, e + 1).map((x, k) => ({ x, y: ys[s + k], on: !!(flags[s + k] & 1) })));
      s = e + 1;
    }
    return contours;
  }
  function pathFor(g, dx, scale, baseline) {
    const P = (pt) => `${(dx + pt.x * scale).toFixed(1)} ${(baseline - pt.y * scale).toFixed(1)}`;
    return outline(g)
      .map((pts) => {
        const n = pts.length;
        let start = pts.findIndex((q) => q.on);
        if (start < 0) {
          pts = [{ x: (pts[0].x + pts[n - 1].x) / 2, y: (pts[0].y + pts[n - 1].y) / 2, on: true }, ...pts];
          start = 0;
        }
        const seq = [...pts.slice(start), ...pts.slice(0, start)];
        let d = `M ${P(seq[0])}`;
        for (let i = 1; i <= seq.length; i++) {
          const cur = seq[i % seq.length];
          if (cur.on) {
            d += ` L ${P(cur)}`;
            continue;
          }
          const nx = seq[(i + 1) % seq.length];
          const end = nx.on ? nx : { x: (cur.x + nx.x) / 2, y: (cur.y + nx.y) / 2 };
          d += ` Q ${P(cur)} ${P(end)}`;
          if (nx.on) i++;
        }
        return d + ' Z';
      })
      .join(' ');
  }
  function bbox(g) {
    const pts = outline(g).flat();
    return {
      xMin: Math.min(...pts.map((q) => q.x)),
      xMax: Math.max(...pts.map((q) => q.x)),
      yMax: Math.max(...pts.map((q) => q.y)),
      yMin: Math.min(...pts.map((q) => q.y)),
    };
  }
  /** Lays out text: returns an SVG path, its width, and each glyph's box in output units. */
  function layout(text, size, tracking = 0) {
    const scale = size / upm;
    let x = 0;
    const glyphs = [];
    for (const ch of text) {
      const g = glyphId(ch.codePointAt(0));
      glyphs.push({ g, x, box: bbox(g) });
      x += advance(g) + tracking * upm;
    }
    const first = glyphs[0],
      last = glyphs[glyphs.length - 1];
    const left = first.box.xMin,
      right = last.x + last.box.xMax,
      width = (right - left) * scale;
    return {
      width,
      scale,
      upm,
      path: (originX, baseline) =>
        glyphs.map(({ g, x }) => pathFor(g, originX + (x - left) * scale, scale, baseline)).join(' '),
      boxes: (originX, baseline) =>
        glyphs.map(({ x, box }) => ({
          x0: originX + (x - left + box.xMin) * scale,
          x1: originX + (x - left + box.xMax) * scale,
          top: baseline - box.yMax * scale,
          bottom: baseline - box.yMin * scale,
        })),
    };
  }
  return { layout };
}
