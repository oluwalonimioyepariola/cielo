import * as Speech from 'expo-speech';
import { AppState } from 'react-native';

import { getSession } from './session';

export type VoiceTier = 'premium' | 'enhanced' | 'standard';

export type SpanishVoice = {
  identifier: string;
  name: string;
  language: string;
  tier: VoiceTier;
};

// Cielo teaches casual Latin American Spanish, so its accents come first.
const ACCENT_RANK: Record<string, number> = { 'es-MX': 4, 'es-US': 3, 'es-419': 3, 'es-ES': 2 };
const TIER_RANK: Record<VoiceTier, number> = { premium: 3, enhanced: 2, standard: 1 };

/**
 * How natural a voice is. expo-speech reports iOS Premium voices as "Default", so the identifier is
 * the reliable signal on iPhone (Apple puts "premium", "enhanced" or "compact" in it).
 */
function tierOf(voice: Speech.Voice): VoiceTier {
  const id = voice.identifier.toLowerCase();
  if (id.includes('premium')) return 'premium';
  if (id.includes('enhanced') || voice.quality === Speech.VoiceQuality.Enhanced) return 'enhanced';
  return 'standard';
}

/** The most natural Spanish voice on this phone: best quality first, then accent. Offline voices only. */
export async function findBestSpanishVoice(): Promise<SpanishVoice | null> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const spanish = voices
      .filter((v) => v.language.toLowerCase().startsWith('es'))
      // Android's "network" voices need a connection; Cielo works offline.
      .filter((v) => !v.identifier.toLowerCase().includes('network'))
      .map((v) => ({ identifier: v.identifier, name: v.name, language: v.language.replace('_', '-'), tier: tierOf(v) }));
    spanish.sort(
      (a, b) =>
        TIER_RANK[b.tier] - TIER_RANK[a.tier] || (ACCENT_RANK[b.language] ?? 1) - (ACCENT_RANK[a.language] ?? 1),
    );
    return spanish[0] ?? null;
  } catch {
    return null;
  }
}

// The chosen voice, looked up once and again whenever the app comes back to the front (the learner
// may have just downloaded a better voice in Settings).
let voice: SpanishVoice | null = null;
export async function refreshVoice(): Promise<SpanishVoice | null> {
  voice = await findBestSpanishVoice();
  return voice;
}
refreshVoice();
AppState.addEventListener('change', (state) => {
  if (state === 'active') refreshVoice();
});

/** Reads Spanish aloud with the phone's own voice — free, offline, nothing leaves the device. */
export function speakSpanish(text: string) {
  Speech.stop();
  Speech.speak(text, { language: voice?.language ?? 'es-MX', voice: voice?.identifier, rate: 0.9 });
}

/**
 * Says the Spanish on its own, as the learner taps an answer, gets one right or meets a phrase,
 * unless they turned "Speak Spanish aloud" off. The speaker buttons use speakSpanish and always work.
 */
export function sayAloud(text: string) {
  if (getSession().speakAloud) speakSpanish(text);
}

export function stopSpeaking() {
  Speech.stop();
}
