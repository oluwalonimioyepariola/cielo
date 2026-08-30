import type { ParsedChat } from '@/brain';

/**
 * A chat that has been picked and parsed but not yet analyzed — handed from the
 * import screen to "Which one is you?". Lives in memory only.
 */
export type PendingImport = {
  chat: ParsedChat;
  /** The export's raw text, kept on the phone once the import completes. Absent for the sample chat. */
  raw?: string;
};

let pending: PendingImport | null = null;

export function setPendingImport(value: PendingImport | null) {
  pending = value;
}

export function getPendingImport(): PendingImport | null {
  return pending;
}
