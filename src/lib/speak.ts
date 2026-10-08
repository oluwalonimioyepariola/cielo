import * as Speech from 'expo-speech';

import { getSession } from './session';

/** Reads Spanish aloud with the phone's own voice — free, offline, nothing leaves the device. */
export function speakSpanish(text: string) {
  Speech.stop();
  Speech.speak(text, { language: 'es-MX', rate: 0.9 });
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
