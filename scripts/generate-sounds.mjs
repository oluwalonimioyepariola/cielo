// Generates Cielo's lesson sounds as small WAV files. The sounds are code: edit the notes below and
// run `npm run sounds`.
//
// Each note is a soft bell: a sine with a little of its octave and fifth above, a quick attack and
// an exponential fade. Gentle on purpose: a sound you hear dozens of times a lesson must not grate.
import { mkdirSync, writeFileSync } from 'node:fs';

const RATE = 44100;
const OUT = 'assets/sounds';

const NOTE = { C4: 261.63, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5 };

/** One bell-like note starting at `at` seconds, `length` seconds long. */
function bell(samples, { freq, at, length, gain = 0.5, decay = 6 }) {
  const start = Math.round(at * RATE);
  const count = Math.round(length * RATE);
  for (let i = 0; i < count && start + i < samples.length; i++) {
    const t = i / RATE;
    const attack = Math.min(1, t / 0.006);
    const envelope = attack * Math.exp(-decay * t);
    const tone =
      Math.sin(2 * Math.PI * freq * t) +
      0.28 * Math.sin(2 * Math.PI * freq * 2 * t) +
      0.08 * Math.sin(2 * Math.PI * freq * 3 * t);
    samples[start + i] += gain * envelope * tone;
  }
}

function render(seconds, notes) {
  const samples = new Float32Array(Math.round(seconds * RATE));
  notes.forEach((note) => bell(samples, note));
  // Normalise to a comfortable peak, then fade the last 20 ms so nothing clicks.
  const peak = samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0) || 1;
  const fade = Math.round(0.02 * RATE);
  return samples.map((s, i) => (s / peak) * 0.7 * Math.min(1, (samples.length - i) / fade));
}

/** 16-bit mono PCM WAV. */
function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const SOUNDS = {
  // Right: a quick rising fourth, bright and short.
  right: render(0.55, [
    { freq: NOTE.G5, at: 0, length: 0.25, gain: 0.45, decay: 14 },
    { freq: NOTE.C6, at: 0.09, length: 0.46, gain: 0.55, decay: 8 },
  ]),
  // Wrong: two low notes stepping down, soft rather than a buzzer.
  wrong: render(0.6, [
    { freq: NOTE.E4, at: 0, length: 0.3, gain: 0.5, decay: 10 },
    { freq: NOTE.C4, at: 0.14, length: 0.46, gain: 0.5, decay: 8 },
  ]),
  // Lesson finished: a C major arpeggio that settles into a chord.
  finish: render(1.6, [
    { freq: NOTE.C5, at: 0, length: 1.6, gain: 0.4, decay: 3 },
    { freq: NOTE.E5, at: 0.12, length: 1.48, gain: 0.4, decay: 3 },
    { freq: NOTE.G5, at: 0.24, length: 1.36, gain: 0.4, decay: 3 },
    { freq: NOTE.C6, at: 0.36, length: 1.24, gain: 0.45, decay: 2.6 },
  ]),
};

mkdirSync(OUT, { recursive: true });
for (const [name, samples] of Object.entries(SOUNDS)) writeFileSync(`${OUT}/${name}.wav`, wav(samples));
console.log(`Sounds written to ${OUT}/`);
