-- AlterTable
ALTER TABLE "SentimentScore" ADD COLUMN     "explanation" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "summary" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "supportingFactors" TEXT[];
