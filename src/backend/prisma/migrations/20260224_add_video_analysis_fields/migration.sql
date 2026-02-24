-- AlterTable
ALTER TABLE "CollectedVideo" ADD COLUMN "analysisStatus" TEXT NOT NULL DEFAULT 'UNANALYZED',
ADD COLUMN "analysisResult" JSONB,
ADD COLUMN "analysisError" TEXT;

-- AlterTable
ALTER TABLE "Template" ADD COLUMN "extractedFromVideoId" TEXT,
ADD COLUMN "extractionStatus" TEXT,
ADD COLUMN "extractionError" TEXT,
ADD COLUMN "extractionQuality" JSONB,
ADD COLUMN "rejectionReason" TEXT,
ADD COLUMN "publishedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "CollectedVideo_analysisStatus_idx" ON "CollectedVideo"("analysisStatus");
