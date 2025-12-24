/*
  Warnings:

  - You are about to drop the column `lastReadAt` on the `Conversation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "lastReadAt",
ADD COLUMN     "unreadCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "lastMessageAt" DROP NOT NULL,
ALTER COLUMN "lastMessageAt" DROP DEFAULT;
