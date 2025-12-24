/*
  Warnings:

  - Added the required column `updatedAt` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN "updatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Message_conversationId_updatedAt_idx" ON "Message"("conversationId", "updatedAt");
