/*
  Warnings:

  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `schoolId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `tutorId` on the `User` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ClassTutorAssignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Grade` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `School` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SchoolSubject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Section` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SectionSubject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tutor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TutorSubjectAssignment` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('OPEN', 'FULL', 'CLOSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PlayStyle" AS ENUM ('CASUAL', 'COMPETITIVE', 'HARDCORE');

-- CreateEnum
CREATE TYPE "CommType" AS ENUM ('VOICE', 'TEXT', 'PING_ONLY');

-- DropForeignKey
ALTER TABLE "ClassTutorAssignment" DROP CONSTRAINT "ClassTutorAssignment_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "ClassTutorAssignment" DROP CONSTRAINT "ClassTutorAssignment_tutorId_fkey";

-- DropForeignKey
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "SchoolSubject" DROP CONSTRAINT "SchoolSubject_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Section" DROP CONSTRAINT "Section_gradeId_fkey";

-- DropForeignKey
ALTER TABLE "SectionSubject" DROP CONSTRAINT "SectionSubject_schoolSubjectId_fkey";

-- DropForeignKey
ALTER TABLE "SectionSubject" DROP CONSTRAINT "SectionSubject_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "Tutor" DROP CONSTRAINT "Tutor_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "TutorSubjectAssignment" DROP CONSTRAINT "TutorSubjectAssignment_sectionSubjectId_fkey";

-- DropForeignKey
ALTER TABLE "TutorSubjectAssignment" DROP CONSTRAINT "TutorSubjectAssignment_tutorId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_tutorId_fkey";

-- DropIndex
DROP INDEX "User_tutorId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
DROP COLUMN "password",
DROP COLUMN "phone",
DROP COLUMN "schoolId",
DROP COLUMN "tutorId",
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "ClassTutorAssignment";

-- DropTable
DROP TABLE "Grade";

-- DropTable
DROP TABLE "School";

-- DropTable
DROP TABLE "SchoolSubject";

-- DropTable
DROP TABLE "Section";

-- DropTable
DROP TABLE "SectionSubject";

-- DropTable
DROP TABLE "Tutor";

-- DropTable
DROP TABLE "TutorSubjectAssignment";

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "bio" TEXT,
    "region" TEXT NOT NULL,
    "primaryLanguage" TEXT NOT NULL DEFAULT 'English',
    "playStyle" "PlayStyle" NOT NULL DEFAULT 'CASUAL',
    "communicationPref" "CommType" NOT NULL DEFAULT 'VOICE',
    "avatarUrl" TEXT,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReputationScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "positivityScore" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "reliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "communicationScore" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "totalFeedbacks" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReputationScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "positivity" INTEGER NOT NULL,
    "reliability" INTEGER NOT NULL,
    "communication" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genre" TEXT,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LFGSession" (
    "id" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "region" TEXT NOT NULL,
    "micRequired" BOOLEAN NOT NULL DEFAULT false,
    "maxPlayers" INTEGER NOT NULL,
    "currentPlayers" INTEGER NOT NULL DEFAULT 1,
    "status" "SessionStatus" NOT NULL DEFAULT 'OPEN',
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LFGSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LFGParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LFGParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReputationScore_userId_key" ON "ReputationScore"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_fromUserId_toUserId_sessionId_key" ON "Feedback"("fromUserId", "toUserId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_name_key" ON "Game"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LFGParticipant_sessionId_userId_key" ON "LFGParticipant"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationScore" ADD CONSTRAINT "ReputationScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LFGSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LFGSession" ADD CONSTRAINT "LFGSession_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LFGSession" ADD CONSTRAINT "LFGSession_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LFGParticipant" ADD CONSTRAINT "LFGParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LFGSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LFGParticipant" ADD CONSTRAINT "LFGParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LFGSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
