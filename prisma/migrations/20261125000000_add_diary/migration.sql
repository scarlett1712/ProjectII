-- CreateTable
CREATE TABLE IF NOT EXISTS "DiaryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mood" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiaryEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DiaryPhoto" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateKey" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "caption" TEXT,
    "mealId" TEXT,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiaryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiaryEntry_userId_dateKey_key" ON "DiaryEntry"("userId", "dateKey");
CREATE INDEX IF NOT EXISTS "DiaryEntry_userId_dateKey_idx" ON "DiaryEntry"("userId", "dateKey");
CREATE INDEX IF NOT EXISTS "DiaryPhoto_userId_dateKey_takenAt_idx" ON "DiaryPhoto"("userId", "dateKey", "takenAt");
CREATE INDEX IF NOT EXISTS "DiaryPhoto_mealId_idx" ON "DiaryPhoto"("mealId");
CREATE INDEX IF NOT EXISTS "DiaryPhoto_transactionId_idx" ON "DiaryPhoto"("transactionId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DiaryEntry_userId_fkey') THEN
    ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DiaryPhoto_userId_fkey') THEN
    ALTER TABLE "DiaryPhoto" ADD CONSTRAINT "DiaryPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DiaryPhoto_mealId_fkey') THEN
    ALTER TABLE "DiaryPhoto" ADD CONSTRAINT "DiaryPhoto_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "MealEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DiaryPhoto_transactionId_fkey') THEN
    ALTER TABLE "DiaryPhoto" ADD CONSTRAINT "DiaryPhoto_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "BudgetTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
