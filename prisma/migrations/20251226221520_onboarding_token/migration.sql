-- CreateTable
CREATE TABLE "OnboardingToken" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingToken_token_key" ON "OnboardingToken"("token");

-- CreateIndex
CREATE INDEX "OnboardingToken_businessId_idx" ON "OnboardingToken"("businessId");

-- AddForeignKey
ALTER TABLE "OnboardingToken" ADD CONSTRAINT "OnboardingToken_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
