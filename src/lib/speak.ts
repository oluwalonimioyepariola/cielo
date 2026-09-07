import * as Speech from 'expo-speech';

/** Reads Spanish aloud with the phone's own voice — free, offline, nothing leaves the device. */
export function speakSpanish(text: string) {
  Speech.stop();
  Speech.speak(text, { language: 'es-MX', rate: 0.9 });
}
