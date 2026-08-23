/**
 * Grading for typed and built answers. Forgiving where a learner deserves it (missing accents,
 * a small typo, punctuation, ¿ ¡), but always says what the exact form is.
 */

export type Verdict = 'correct' | 'almost' | 'wrong';

export type Grade = {
  verdict: Verdict;
  /** The accepted answer closest to what was typed — shown back to the learner. */
  expected: string;
  hint?: string;
};

/** Lowercase, no punctuation, single spaces — accents kept. */
export function loose(text: string): string {
  return text
    .toLowerCase()
    .replace(/[¿?¡!.,;:"“”()…]/g, ' ')
    .replace(/[‘’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** `loose`, with accents removed too: "cómo" → "como", "mañana" → "manana". */
export function bare(text: string): string {
  return loose(text).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return prev[b.length];
}

/** How many typos to forgive: none in short words, one in medium, two in long answers. */
const allowedTypos = (length: number) => (length >= 12 ? 2 : length >= 5 ? 1 : 0);

export function gradeTyped(input: string, accepted: string[]): Grade {
  const typed = loose(input);
  const typedBare = bare(input);

  for (const answer of accepted) if (loose(answer) === typed) return { verdict: 'correct', expected: answer };
  for (const answer of accepted) {
    if (bare(answer) === typedBare) return { verdict: 'almost', expected: answer, hint: 'Mind the accents' };
  }

  let best: { answer: string; distance: number } | null = null;
  for (const answer of accepted) {
    const distance = editDistance(typedBare, bare(answer));
    if (!best || distance < best.distance) best = { answer, distance };
  }
  if (best && typedBare && best.distance <= allowedTypos(bare(best.answer).length)) {
    return { verdict: 'almost', expected: best.answer, hint: 'Small typo' };
  }
  return { verdict: 'wrong', expected: accepted[0] };
}

/** Spanish split into tiles for "build the sentence": words only, punctuation dropped. */
export function toTiles(spanish: string): string[] {
  return loose(spanish).split(' ').filter(Boolean);
}

export function gradeTiles(chosen: string[], accepted: string[]): Grade {
  const attempt = chosen.join(' ').toLowerCase();
  const match = accepted.find((a) => toTiles(a).join(' ') === attempt);
  return match ? { verdict: 'correct', expected: match } : { verdict: 'wrong', expected: accepted[0] };
}
