import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Cielo: learn Spanish in your own words';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const PUFFS = [76, 104, 64, 92, 120, 70, 98, 84];

// Read at build time so the image is generated once, as a static file.
const nunito = await readFile(join(process.cwd(), 'src/assets/Nunito-Bold.ttf'));

export default async function Image() {
  const puffs: { size: number; left: number }[] = [];
  for (let x = -24, i = 0; x < size.width + 24; i++) {
    const s = PUFFS[i % PUFFS.length] * 1.2;
    puffs.push({ size: s, left: x });
    x += s * 0.62;
  }

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#4a45d1', fontFamily: 'Nunito' }}>
        {/* The sun in its halo, top right */}
        <div
          style={{
            position: 'absolute',
            right: -40,
            top: -60,
            width: 330,
            height: 330,
            borderRadius: 330,
            background: 'rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <div style={{ width: 220, height: 220, borderRadius: 220, background: '#ffce00' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '72px 80px', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 40 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#3b37a8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 22, height: 22, borderRadius: 22, background: '#ffce00' }} />
            </div>
            Cielo
          </div>
          <div style={{ marginTop: 64, fontSize: 92, lineHeight: 1.02, letterSpacing: -3, maxWidth: 820 }}>Learn Spanish in your own words.</div>
          <div style={{ marginTop: 28, fontSize: 32, color: '#dedcf8', display: 'flex' }}>did you eat? → ¿Ya comiste?</div>
        </div>
        {/* The cloud edge in cream along the bottom */}
        {puffs.map((p, i) => (
          <div key={i} style={{ position: 'absolute', left: p.left, top: size.height - 34 - p.size / 2, width: p.size, height: p.size, borderRadius: p.size, background: '#f9f4f2' }} />
        ))}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 34, background: '#f9f4f2' }} />
      </div>
    ),
    { ...size, fonts: [{ name: 'Nunito', data: nunito, weight: 700, style: 'normal' }] },
  );
}
