-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Business_deletedAt_idx" ON "Business"("deletedAt");

-- CreateIndex
CREATE INDEX "Business_status_deletedAt_idx" ON "Business"("status", "deletedAt");
