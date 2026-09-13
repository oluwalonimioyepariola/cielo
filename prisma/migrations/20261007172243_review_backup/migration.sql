-- CreateTable
CREATE TABLE "backed_up_review" (
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "card" JSONB NOT NULL,
    "due" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backed_up_review_pkey" PRIMARY KEY ("userId","text")
);

-- CreateTable
CREATE TABLE "backed_up_activity_day" (
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,

    CONSTRAINT "backed_up_activity_day_pkey" PRIMARY KEY ("userId","day")
);

-- AddForeignKey
ALTER TABLE "backed_up_review" ADD CONSTRAINT "backed_up_review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backed_up_activity_day" ADD CONSTRAINT "backed_up_activity_day_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
