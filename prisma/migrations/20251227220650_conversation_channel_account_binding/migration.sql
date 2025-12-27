-- DropIndex
DROP INDEX "Conversation_businessId_clientId_channel_key";

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "channelAccountId" TEXT;

-- CreateIndex
CREATE INDEX "Conversation_businessId_clientId_channel_idx" ON "Conversation"("businessId", "clientId", "channel");

-- CreateIndex
CREATE INDEX "Conversation_channelAccountId_idx" ON "Conversation"("channelAccountId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_channelAccountId_fkey" FOREIGN KEY ("channelAccountId") REFERENCES "ChannelAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
