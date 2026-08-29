import { Storage } from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

/**
 * App-level state that decides which part of the app the user sees.
 * Persisted on the device with expo-sqlite's key-value store.
 *
 * `signedIn` is a placeholder until real Apple/Google sign-in lands.
 */
export type Session = {
  signedIn: boolean;
  /** The brain has produced a word list. The chat file itself may since have been removed. */
  imported: boolean;
  backupProgress: boolean;
};

const KEY = 'cielo.session';
const DEFAULTS: Session = { signedIn: false, imported: false, backupProgress: true };

const listeners = new Set<() => void>();
let current = read();

function read(): Session {
  try {
    const raw = Storage.getItemSync(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function updateSession(patch: Partial<Session>) {
  current = { ...current, ...patch };
  Storage.setItemSync(KEY, JSON.stringify(current));
  listeners.forEach((listener) => listener());
}

/** The current session, for code outside React (e.g. background backups). */
export function getSession(): Session {
  return current;
}

export function resetSession() {
  updateSession(DEFAULTS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSession(): Session {
  return useSyncExternalStore(subscribe, () => current);
}
