import { firstName } from '@/learning/starter';
import { buildSnapshot, parseSnapshot, type ProgressSnapshot } from '@/sync/snapshot';

import { apiBaseUrl, authClient } from './auth-client';
import { getActivityDays, getImportSummary, getLessonProgress, getStoredReviews, getVocab, restoreSnapshot } from './db';
import { getSession } from './session';

/**
 * Progress backup to the user's account. Quiet by design: it runs in the background after
 * importing and after lessons, only when signed in and only while "Back up my progress" is on.
 * A failure just waits for the next one; nothing here ever blocks learning.
 */

async function request(method: 'GET' | 'PUT' | 'DELETE', body?: ProgressSnapshot): Promise<Response | null> {
  try {
    const cookie = await authClient.getCookie();
    if (!cookie) return null; // not signed in with a real account (e.g. the development skip)
    return await fetch(`${apiBaseUrl()}/api/progress`, {
      method,
      headers: { Cookie: cookie, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      // The session travels in the Cookie header above, not in the platform's cookie jar.
      credentials: 'omit',
    });
  } catch {
    return null;
  }
}

function currentSnapshot(): ProgressSnapshot {
  const summary = getImportSummary();
  const profile = summary
    ? { firstName: firstName(summary.self), includePartner: summary.includePartner, importedAt: summary.importedAt }
    : null;
  return buildSnapshot(getVocab(), getLessonProgress(), profile, getStoredReviews(), [...getActivityDays()]);
}

let inFlight: Promise<void> | null = null;
let again = false;

/** Backs up now, in the background. Calls during an upload are folded into one more upload after it. */
export function backUpProgress(): void {
  if (!getSession().backupProgress) return;
  if (inFlight) {
    again = true;
    return;
  }
  inFlight = (async () => {
    await request('PUT', currentSnapshot());
  })().finally(() => {
    inFlight = null;
    if (again) {
      again = false;
      backUpProgress();
    }
  });
}

/**
 * After signing in on a phone with nothing on it yet: brings the backup back. Returns true when
 * there was progress to restore, so onboarding can skip straight to the learning map.
 */
export async function restoreProgress(): Promise<boolean> {
  if (getVocab().length > 0) return false; // this phone already has its own words
  const response = await request('GET');
  if (!response?.ok) return false;
  const snapshot = parseSnapshot(await response.json().catch(() => null));
  if (!snapshot || snapshot.phrases.length === 0) return false;
  restoreSnapshot(snapshot);
  return true;
}

/** Deletes the backup from the server (when the user switches backups off and asks for it). */
export async function deleteBackup(): Promise<boolean> {
  const response = await request('DELETE');
  return Boolean(response?.ok);
}
