import type { VocabItem } from '@/brain/types';

import type { Translation } from './phrase-bank';
import { STARTER_PHRASES, STARTER_PREFIX, starterLessons } from './starter';

/**
 * Turns the user's ranked words and phrases into their learning map:
 * "Days" (units) of a few small lessons, each lesson one topic of their chat ("Food talk",
 * "Saying goodnight"), ending in a checkpoint that reviews the whole day.
 *
 * Pure and deterministic: the same word list always produces the same path, so lesson ids
 * stay stable between launches.
 */

export type Topic = {
  id: string;
  /** English name, shown while the lesson is still to learn. */
  title: string;
  /** Spanish name, shown once the lesson is learned. */
  es: string;
};

/** A phrase a lesson teaches. `translation` overrides the phrase bank (e.g. "Me llamo Sam"). */
export type LessonItem = VocabItem & { translation?: Translation };

export type Lesson = {
  id: string;
  kind: 'lesson' | 'checkpoint';
  /** What the lesson is about. Checkpoints review the whole day and have no topic. */
  topic?: Topic;
  /** The items this lesson teaches (or, for a checkpoint, reviews). */
  items: LessonItem[];
};

export type Unit = {
  /** Position on the path. */
  index: number;
  /** "Primeros pasos" for Day 0, then "Day 1", "Day 2"… */
  label: string;
  lessons: Lesson[];
  items: LessonItem[];
};

/**
 * Lesson topics, checked in order — the first whose keywords appear in a phrase wins, so the
 * more specific topics come first ("good night" is goodnight, not a greeting).
 */
const TOPICS: (Topic & { keywords: string[] })[] = [
  { id: 'food', title: 'Food talk', es: 'La comida', keywords: ['eat', 'ate', 'eating', 'eaten', 'food', 'lunch', 'dinner', 'breakfast', 'hungry', 'cook', 'cooking', 'thirsty', 'full', 'coffee', 'rice'] },
  { id: 'goodnight', title: 'Saying goodnight', es: 'Buenas noches', keywords: ['night', 'dreams', 'sleep', 'bed', 'sleepy'] },
  { id: 'mornings', title: 'Good mornings', es: 'Buenos días', keywords: ['morning', 'wake', 'woke', 'slept', 'awake'] },
  { id: 'missing', title: 'Missing each other', es: 'Te extraño', keywords: ['miss', 'wait', 'thinking', 'need you', 'want to see'] },
  { id: 'love', title: 'Love words', es: 'Palabras de amor', keywords: ['love', 'babe', 'baby', 'honey', 'darling', 'beautiful', 'cute', 'kiss', 'kisses', 'hug', 'hugs', 'heart'] },
  { id: 'checking-in', title: 'Checking in', es: '¿Qué tal?', keywords: ['how', "what's up", 'doing', 'are you there', 'are you okay', 'up to'] },
  { id: 'hellos', title: 'Hi and bye', es: 'Hola y chao', keywords: ['hi', 'hello', 'hey', 'bye', 'goodbye', 'see you'] },
  { id: 'on-my-way', title: 'On my way', es: 'En camino', keywords: ['way', 'home', 'coming', 'come', 'here', 'outside', 'almost', 'late', 'leaving', 'where'] },
  { id: 'calls', title: 'Calls and texts', es: 'Llamadas y mensajes', keywords: ['call', 'text', 'phone', 'message', 'talk', 'send'] },
  { id: 'plans', title: 'Making plans', es: 'Planes', keywords: ['tomorrow', 'tonight', 'weekend', 'today', 'later', 'free', 'work', 'meet', "let's", 'go', 'going', 'ready'] },
  { id: 'feelings', title: 'How you feel', es: 'Cómo te sientes', keywords: ['tired', 'happy', 'sad', 'sick', 'sorry', 'feel', 'feeling', 'fine', 'good', 'bad', 'bored', 'stressed', 'excited', 'cold', 'hot', 'worry', 'okay'] },
  { id: 'replies', title: 'Quick replies', es: 'Respuestas rápidas', keywords: ['know', 'think', 'really', 'sure', 'course', 'thanks', 'thank', 'please', 'kidding', 'mind', 'idea', 'problem', 'welcome'] },
];
const EVERYDAY_TOPIC: Topic = { id: 'everyday', title: 'Everyday words', es: 'Palabras de cada día' };

/** Where a topic too small for its own lesson goes before falling back to "Everyday words". */
const FAMILIES: (Topic & { members: string[] })[] = [
  { id: 'greetings', title: 'Hellos and goodnights', es: 'Saludos', members: ['mornings', 'goodnight', 'hellos'] },
  { id: 'heart', title: 'Love and missing you', es: 'Cariño', members: ['love', 'missing'] },
  { id: 'talk', title: 'Checking in', es: '¿Qué tal?', members: ['checking-in', 'feelings', 'replies'] },
  { id: 'plans-calls', title: 'Plans and calls', es: 'Planes', members: ['on-my-way', 'calls', 'plans'] },
];

function topicOf(item: VocabItem): Topic {
  const padded = ` ${item.text} `;
  return TOPICS.find((t) => t.keywords.some((k) => padded.includes(` ${k} `))) ?? EVERYDAY_TOPIC;
}

const LESSONS_PER_DAY = 3;
const LESSON_SIZE = 4; // new phrases per lesson — small on purpose, so learning stays slow
const MAX_LESSON_SIZE = 6; // a bigger topic is split into parts

/** Splits n items into chunks of about LESSON_SIZE. */
function splitEvenly(items: VocabItem[]): VocabItem[][] {
  const count = Math.max(1, Math.round(items.length / LESSON_SIZE));
  const chunks: VocabItem[][] = [];
  for (let i = 0; i < count; i++) {
    chunks.push(items.slice(Math.floor((i * items.length) / count), Math.floor(((i + 1) * items.length) / count)));
  }
  return chunks.filter((c) => c.length);
}

type Group = { topic: Topic; items: VocabItem[] };

/** Groups items by key, keeping each group in score order. */
function groupBy(items: VocabItem[], topicFor: (item: VocabItem) => Topic): Group[] {
  const groups = new Map<string, Group>();
  for (const item of items) {
    const topic = topicFor(item);
    const group = groups.get(topic.id) ?? { topic, items: [] };
    group.items.push(item);
    groups.set(topic.id, group);
  }
  return [...groups.values()];
}

/**
 * One lesson per topic. A topic with a single phrase joins its family ("good morning" and
 * "good night" become "Hellos and goodnights"); a family still too small joins "Everyday words".
 * Big groups are split into parts.
 */
function topicLessons(items: VocabItem[]): Group[] {
  const ready: Group[] = [];
  const small: VocabItem[] = [];
  for (const group of groupBy(items, topicOf)) {
    if (group.topic.id !== 'everyday' && group.items.length >= 2) ready.push(group);
    else small.push(...group.items);
  }

  const familyOf = (item: VocabItem) =>
    FAMILIES.find((f) => f.members.includes(topicOf(item).id)) ?? EVERYDAY_TOPIC;

  // First choice for a lone phrase: an existing lesson from its family, which then takes the
  // family's name ("good morning" joins "Saying goodnight" → "Hellos and goodnights").
  const unplaced: VocabItem[] = [];
  for (const item of small) {
    const family = FAMILIES.find((f) => f.members.includes(topicOf(item).id));
    const home = family && ready.find((g) => (g.topic.id === family.id || family.members.includes(g.topic.id)) && g.items.length < MAX_LESSON_SIZE);
    if (!home || !family) {
      unplaced.push(item);
      continue;
    }
    home.items.push(item);
    home.topic = { id: family.id, title: family.title, es: family.es };
  }

  const leftovers: VocabItem[] = [];
  for (const group of groupBy(unplaced, familyOf)) {
    if (group.topic.id !== 'everyday' && group.items.length >= 2) ready.push(group);
    else leftovers.push(...group.items);
  }
  if (leftovers.length) ready.push({ topic: EVERYDAY_TOPIC, items: leftovers });

  const lessons: Group[] = [];
  for (const group of ready) {
    const sorted = [...group.items].sort((a, b) => b.score - a.score);
    if (sorted.length <= MAX_LESSON_SIZE) {
      lessons.push({ topic: group.topic, items: sorted });
      continue;
    }
    splitEvenly(sorted).forEach((part, i) =>
      lessons.push({
        topic: i === 0 ? group.topic : { ...group.topic, title: `More ${group.topic.title.toLowerCase()}`, es: `${group.topic.es} · ${i + 1}` },
        items: part,
      }),
    );
  }

  // A lone leftover phrase joins the smallest lesson rather than standing alone.
  const lonely = lessons.findIndex((l) => l.items.length === 1);
  if (lonely !== -1 && lessons.length > 1) {
    const [{ items: [item] }] = lessons.splice(lonely, 1);
    lessons.reduce((min, l) => (l.items.length < min.items.length ? l : min)).items.push(item);
  }

  const best = (l: Group) => Math.max(...l.items.map((i) => i.score));
  return lessons.sort((a, b) => best(b) - best(a));
}

/**
 * Topics first, then days: the whole chat is grouped into topic lessons (most-used topic first),
 * and every few lessons make a "Day" that ends in a recap.
 */
export type CurriculumOptions = {
  /** Start with Day 0, "Primeros pasos": the basics every beginner needs. */
  starter?: boolean;
  /** The user's first name, for "Me llamo …" in Day 0. */
  name?: string | null;
};

function toUnit(prefix: string, label: string, groups: { topic: Topic; items: LessonItem[] }[]): Omit<Unit, 'index'> {
  const items = groups.flatMap((g) => g.items);
  const lessons: Lesson[] = groups.map(({ topic, items: lessonItems }, i) => ({
    id: `${prefix}l${i + 1}`,
    kind: 'lesson',
    topic,
    items: lessonItems,
  }));
  lessons.push({ id: `${prefix}check`, kind: 'checkpoint', items });
  return { label, lessons, items };
}

export function buildCurriculum(vocab: VocabItem[], options: CurriculumOptions = {}): Unit[] {
  // Basics that Day 0 teaches aren't taught a second time from the chat.
  const personal = options.starter ? vocab.filter((v) => !STARTER_PHRASES.has(v.text)) : vocab;
  const lessons = topicLessons(personal);
  const days: Group[][] = [];
  for (let i = 0; i < lessons.length; i += LESSONS_PER_DAY) days.push(lessons.slice(i, i + LESSONS_PER_DAY));
  // A last day with a single lesson joins the one before it.
  if (days.length > 1 && days[days.length - 1].length === 1) days[days.length - 2].push(...days.pop()!);

  const units = days.map((dayLessons, i) => toUnit(`u${i + 1}-`, `Day ${i + 1}`, dayLessons));
  if (options.starter) units.unshift(toUnit(STARTER_PREFIX, 'Primeros pasos', starterLessons(vocab, options.name ?? null)));
  return units.map((unit, index) => ({ ...unit, index }));
}

export type LessonState = 'done' | 'current' | 'locked';

/**
 * In order: the first unfinished lesson is current and everything after it is locked. A lesson
 * already finished always shows as learned, even if something before it was added later (Day 0).
 */
export function lessonStates(units: Unit[], completed: Set<string>): Map<string, LessonState> {
  const states = new Map<string, LessonState>();
  let foundCurrent = false;
  for (const unit of units) {
    for (const lesson of unit.lessons) {
      if (completed.has(lesson.id)) states.set(lesson.id, 'done');
      else if (!foundCurrent) {
        states.set(lesson.id, 'current');
        foundCurrent = true;
      } else states.set(lesson.id, 'locked');
    }
  }
  return states;
}

export function findLesson(units: Unit[], id: string): { unit: Unit; lesson: Lesson } | null {
  for (const unit of units) {
    const lesson = unit.lessons.find((l) => l.id === id);
    if (lesson) return { unit, lesson };
  }
  return null;
}
