import { auth } from '@/server/auth';
import { prisma } from '@/server/db';
import type { StoredCard } from '@/learning/review';
import { parseSnapshot, type ProgressSnapshot } from '@/sync/snapshot';

// Progress backup for the signed-in user: their phrases, finished lessons, profile, memory cards and streak days.
// Never the chat. Every query is scoped to the session's own user id.

const MAX_BODY_BYTES = 1_000_000;

async function currentUserId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

const signInFirst = () => Response.json({ error: 'Sign in first.' }, { status: 401 });

/** The user's backup, in the same shape the phone sends. */
export async function GET(request: Request) {
  const userId = await currentUserId(request);
  if (!userId) return signInFirst();

  const [phrases, lessons, learner, reviews, days] = await Promise.all([
    prisma.backedUpPhrase.findMany({ where: { userId } }),
    prisma.backedUpLesson.findMany({ where: { userId } }),
    prisma.learnerProfile.findUnique({ where: { userId } }),
    prisma.backedUpReview.findMany({ where: { userId } }),
    prisma.backedUpActivityDay.findMany({ where: { userId } }),
  ]);

  const snapshot: ProgressSnapshot = {
    phrases: phrases.map(({ text, kind, words, count, selfCount, partnerCount, score }) => ({
      text,
      kind: kind === 'word' ? 'word' : 'phrase',
      words,
      count,
      selfCount,
      partnerCount,
      score,
    })),
    lessons: lessons.map((l) => ({ lessonId: l.lessonId, completedAt: l.completedAt.toISOString() })),
    profile: learner
      ? { firstName: learner.firstName, includePartner: learner.includePartner, importedAt: learner.importedAt.toISOString() }
      : null,
    reviews: reviews.map((r) => ({ text: r.text, card: r.card as StoredCard })),
    activityDays: days.map((d) => d.day),
  };
  return Response.json(snapshot);
}

/** Saves the phone's latest snapshot. The phone is the source of truth, so it replaces the old backup. */
export async function PUT(request: Request) {
  const userId = await currentUserId(request);
  if (!userId) return signInFirst();

  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return Response.json({ error: 'Backup too large.' }, { status: 413 });
  }
  let snapshot: ProgressSnapshot | null = null;
  try {
    snapshot = parseSnapshot(await request.json());
  } catch {
    snapshot = null;
  }
  if (!snapshot) return Response.json({ error: 'That backup is not valid.' }, { status: 400 });

  const { phrases, lessons, profile, reviews, activityDays } = snapshot;
  await prisma.$transaction([
    prisma.backedUpReview.deleteMany({ where: { userId } }),
    prisma.backedUpReview.createMany({
      data: reviews.map((r) => ({ userId, text: r.text, card: r.card, due: new Date(r.card.due) })),
    }),
    prisma.backedUpActivityDay.deleteMany({ where: { userId } }),
    prisma.backedUpActivityDay.createMany({ data: activityDays.map((day) => ({ userId, day })) }),
    prisma.backedUpPhrase.deleteMany({ where: { userId } }),
    prisma.backedUpPhrase.createMany({ data: phrases.map((p) => ({ ...p, userId })) }),
    prisma.backedUpLesson.deleteMany({ where: { userId } }),
    prisma.backedUpLesson.createMany({
      data: lessons.map((l) => ({ userId, lessonId: l.lessonId, completedAt: new Date(l.completedAt) })),
    }),
    profile
      ? prisma.learnerProfile.upsert({
          where: { userId },
          create: { userId, firstName: profile.firstName, includePartner: profile.includePartner, importedAt: new Date(profile.importedAt) },
          update: { firstName: profile.firstName, includePartner: profile.includePartner, importedAt: new Date(profile.importedAt) },
        })
      : prisma.learnerProfile.deleteMany({ where: { userId } }),
  ]);

  return Response.json({
    ok: true,
    phrases: phrases.length,
    lessons: lessons.length,
    reviews: reviews.length,
    activityDays: activityDays.length,
  });
}

/** Deletes the user's backup (when they switch "Back up my progress" off). Their account stays. */
export async function DELETE(request: Request) {
  const userId = await currentUserId(request);
  if (!userId) return signInFirst();

  await prisma.$transaction([
    prisma.backedUpPhrase.deleteMany({ where: { userId } }),
    prisma.backedUpLesson.deleteMany({ where: { userId } }),
    prisma.learnerProfile.deleteMany({ where: { userId } }),
    prisma.backedUpReview.deleteMany({ where: { userId } }),
    prisma.backedUpActivityDay.deleteMany({ where: { userId } }),
  ]);
  return Response.json({ ok: true });
}
