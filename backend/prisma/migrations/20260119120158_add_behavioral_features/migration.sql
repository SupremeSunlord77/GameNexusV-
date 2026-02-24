-- AlterTable
ALTER TABLE "LFGSession" ADD COLUMN     "minCompatibility" DOUBLE PRECISION DEFAULT 0.4,
ADD COLUMN     "minEigenTrust" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "behavioralVectors" JSONB,
ADD COLUMN     "eigenTrustScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "endorsements" JSONB,
ADD COLUMN     "gamerDNA" JSONB;

-- CreateTable
CREATE TABLE "TrustEdge" (
    "id" TEXT NOT NULL,
    "sourceUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "source" TEXT NOT NULL DEFAULT 'ENDORSEMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrustEdge_sourceUserId_idx" ON "TrustEdge"("sourceUserId");

-- CreateIndex
CREATE INDEX "TrustEdge_targetUserId_idx" ON "TrustEdge"("targetUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TrustEdge_sourceUserId_targetUserId_key" ON "TrustEdge"("sourceUserId", "targetUserId");

-- AddForeignKey
ALTER TABLE "TrustEdge" ADD CONSTRAINT "TrustEdge_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustEdge" ADD CONSTRAINT "TrustEdge_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
