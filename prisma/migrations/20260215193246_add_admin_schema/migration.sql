-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "UserStats" (
    "userId" TEXT NOT NULL,
    "totalWorkouts" INTEGER NOT NULL DEFAULT 0,
    "totalWeightEntries" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "UserStats_totalWorkouts_idx" ON "UserStats"("totalWorkouts" DESC);

-- CreateIndex
CREATE INDEX "UserStats_currentStreak_idx" ON "UserStats"("currentStreak" DESC);

-- CreateIndex
CREATE INDEX "UserStats_lastActiveAt_idx" ON "UserStats"("lastActiveAt" DESC);

-- AddForeignKey
ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
