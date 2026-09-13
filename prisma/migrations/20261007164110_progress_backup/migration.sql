-- CreateTable
CREATE TABLE "backed_up_phrase" (
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "words" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "selfCount" INTEGER NOT NULL,
    "partnerCount" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backed_up_phrase_pkey" PRIMARY KEY ("userId","text")
);

-- CreateTable
CREATE TABLE "backed_up_lesson" (
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backed_up_lesson_pkey" PRIMARY KEY ("userId","lessonId")
);

-- CreateTable
CREATE TABLE "learner_profile" (
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "includePartner" BOOLEAN NOT NULL DEFAULT false,
    "importedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learner_profile_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "backed_up_phrase" ADD CONSTRAINT "backed_up_phrase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backed_up_lesson" ADD CONSTRAINT "backed_up_lesson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_profile" ADD CONSTRAINT "learner_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
