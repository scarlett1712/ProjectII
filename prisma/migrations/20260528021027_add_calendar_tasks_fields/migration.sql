-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "color" TEXT,
ADD COLUMN     "noteColor" TEXT,
ADD COLUMN     "notification" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurrence" TEXT,
ADD COLUMN     "recurrenceEnd" TIMESTAMP(3),
ADD COLUMN     "tagId" TEXT;

-- AlterTable
ALTER TABLE "TaskItem" ADD COLUMN     "color" TEXT,
ADD COLUMN     "noteColor" TEXT,
ADD COLUMN     "notification" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tagId" TEXT;

-- CreateTable
CREATE TABLE "CalendarTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarTag_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CalendarTag" ADD CONSTRAINT "CalendarTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
