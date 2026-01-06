-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('OPEN', 'FULL', 'CLOSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PlayStyle" AS ENUM ('CASUAL', 'COMPETITIVE', 'HARDCORE');

-- CreateEnum
CREATE TYPE "CommType" AS ENUM ('VOICE', 'TEXT', 'PING_ONLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

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
