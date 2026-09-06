/**
 * The lesson the user just finished, so the path can play its "delivered" moment once.
 * Memory only: a finish celebrated after an app restart would feel random.
 */
let justCompleted: string | null = null;

export function setJustCompleted(lessonId: string) {
  justCompleted = lessonId;
}

/** Returns the lesson to celebrate and forgets it, so the moment never replays. */
export function takeJustCompleted(): string | null {
  const id = justCompleted;
  justCompleted = null;
  return id;
}
