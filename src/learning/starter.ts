import type { VocabItem } from '@/brain/types';

import type { LessonItem, Topic } from './curriculum';

/**
 * Day 0, "Primeros pasos": the basics a complete beginner can't do without, before the path turns
 * to the user's own chat. Short on purpose — six small lessons — then straight to their words.
 *
 * Every phrase here has a phrase-bank translation, except "my name is …", which is built from the
 * user's own name.
 */
const LESSONS: { topic: Topic; phrases: string[] }[] = [
  { topic: { id: 'starter-hello', title: 'Hello', es: 'Hola' }, phrases: ['hello', 'good morning', 'good afternoon', 'good night', 'bye'] },
  { topic: { id: 'starter-polite', title: 'Polite words', es: 'Por favor' }, phrases: ['please', 'thank you', "you're welcome", 'sorry', 'yes', 'no'] },
  { topic: { id: 'starter-how', title: 'How are you', es: '¿Cómo estás?' }, phrases: ['how are you', "i'm good", "i'm not well", 'and you'] },
  { topic: { id: 'starter-who', title: 'Who you are', es: '¿Quién eres?' }, phrases: ["what's your name", 'my name is', 'nice to meet you'] },
  {
    topic: { id: 'starter-stuck', title: "When you're stuck", es: 'No entiendo' },
    phrases: ["i don't understand", 'can you repeat', 'more slowly please', 'how do you say', 'what does that mean'],
  },
  {
    topic: { id: 'starter-patterns', title: 'Magic patterns', es: 'Quiero, tengo…' },
    phrases: ['i want water', 'i need help', 'i have a question', 'i like music', "i'm hungry", "i'm tired"],
  },
];

export const STARTER_PREFIX = 'u0-';

/** Every phrase Day 0 teaches, so the user's own path doesn't teach them a second time. */
export const STARTER_PHRASES = new Set(LESSONS.flatMap((l) => l.phrases));

/**
 * A usable first name for "Me llamo …", or null. WhatsApp shows unsaved contacts as phone numbers,
 * and some names are emoji only, so anything that isn't letters is skipped.
 */
export function firstName(displayName: string | null | undefined): string | null {
  const first = displayName?.trim().split(/\s+/)[0] ?? '';
  return /^\p{L}[\p{L}'’-]{0,23}$/u.test(first) ? first.charAt(0).toUpperCase() + first.slice(1) : null;
}

const asItem = (text: string, fromChat?: VocabItem): LessonItem =>
  fromChat ?? { text, kind: text.includes(' ') ? 'phrase' : 'word', words: text.split(' ').length, count: 0, selfCount: 0, partnerCount: 0, score: 0, examples: [] };

/**
 * Day 0's lessons. A basic the user also says in their chat keeps their own counts and messages,
 * so the lesson can show "you wrote this".
 */
export function starterLessons(vocab: VocabItem[], name: string | null): { topic: Topic; items: LessonItem[] }[] {
  const fromChat = new Map(vocab.map((v) => [v.text, v]));
  return LESSONS.map(({ topic, phrases }) => ({
    topic,
    items: phrases.flatMap((text): LessonItem[] => {
      if (text !== 'my name is') return [asItem(text, fromChat.get(text))];
      if (!name) return [];
      return [{ ...asItem(`my name is ${name}`), translation: { es: `Me llamo ${name}`, alts: [], note: 'Literally "I call myself". Cielo used your name from your chat.' } }];
    }),
  }));
}
