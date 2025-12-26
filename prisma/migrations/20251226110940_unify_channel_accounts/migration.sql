/*
  Warnings:

  - You are about to drop the `WhatsAppAccount` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[channel,providerAccountId]` on the table `ChannelAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "WhatsAppAccount" DROP CONSTRAINT "WhatsAppAccount_businessId_fkey";

-- DropIndex
DROP INDEX "ChannelAccount_businessId_channel_providerAccountId_key";

-- AlterTable
ALTER TABLE "ChannelAccount" ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "displayNumber" TEXT;

-- DropTable
DROP TABLE "WhatsAppAccount";

-- CreateIndex
CREATE UNIQUE INDEX "ChannelAccount_channel_providerAccountId_key" ON "ChannelAccount"("channel", "providerAccountId");
