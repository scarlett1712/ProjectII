-- Bring the migration history up to date with schema.prisma.
-- These tables and columns already exist in the schema. Some databases may already contain them after prisma db push,
-- but no earlier migration created them. The IF [NOT] EXISTS guards allow this migration to run on
-- both new databases and databases that already contain these objects.
-- Add ReminderNotificationLog to deduplicate reminders, matching main. Drop the unique constraint on VerificationToken.token
-- because two email addresses can receive the same six-digit OTP. The (identifier, token) pair remains unique.

-- DropIndex
DROP INDEX IF EXISTS "VerificationToken_token_key";

-- AlterTable
ALTER TABLE "BudgetAccount" ADD COLUMN IF NOT EXISTS "color" TEXT NOT NULL DEFAULT '#A172FD';
ALTER TABLE "BudgetCategory" ADD COLUMN IF NOT EXISTS "color" TEXT NOT NULL DEFAULT '#A172FD';
ALTER TABLE "TaskItem" ADD COLUMN IF NOT EXISTS "recurrence" TEXT;
ALTER TABLE "TaskItem" ADD COLUMN IF NOT EXISTS "recurrenceEnd" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "VerificationToken" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "BudgetGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetGoal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReminderNotificationLog" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderNotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BudgetGoal_userId_categoryId_year_month_key" ON "BudgetGoal"("userId", "categoryId", "year", "month");
CREATE UNIQUE INDEX IF NOT EXISTS "ReminderNotificationLog_key_key" ON "ReminderNotificationLog"("key");
CREATE INDEX IF NOT EXISTS "ReminderNotificationLog_key_createdAt_idx" ON "ReminderNotificationLog"("key", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE INDEX IF NOT EXISTS "BudgetAccount_userId_idx" ON "BudgetAccount"("userId");
CREATE INDEX IF NOT EXISTS "BudgetCategory_userId_idx" ON "BudgetCategory"("userId");
CREATE INDEX IF NOT EXISTS "BudgetTransaction_categoryId_idx" ON "BudgetTransaction"("categoryId");
CREATE INDEX IF NOT EXISTS "BudgetTransaction_fromAccountId_idx" ON "BudgetTransaction"("fromAccountId");
CREATE INDEX IF NOT EXISTS "BudgetTransaction_toAccountId_idx" ON "BudgetTransaction"("toAccountId");
CREATE INDEX IF NOT EXISTS "CalendarTag_userId_idx" ON "CalendarTag"("userId");

-- Add foreign keys after checking pg_constraint because PostgreSQL lacks ADD CONSTRAINT IF NOT EXISTS.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BudgetGoal_categoryId_fkey') THEN
    ALTER TABLE "BudgetGoal" ADD CONSTRAINT "BudgetGoal_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BudgetCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BudgetGoal_userId_fkey') THEN
    ALTER TABLE "BudgetGoal" ADD CONSTRAINT "BudgetGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PushSubscription_userId_fkey') THEN
    ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
