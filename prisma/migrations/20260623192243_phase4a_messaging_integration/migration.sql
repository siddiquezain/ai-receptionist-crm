-- CreateEnum
CREATE TYPE "MessagingProvider" AS ENUM ('EVOLUTION_API');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "messagingIntegrationId" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "externalId" TEXT;

-- CreateTable
CREATE TABLE "MessagingIntegration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "MessagingProvider" NOT NULL,
    "instanceName" TEXT NOT NULL,
    "displayName" TEXT,
    "phoneNumber" TEXT,
    "apiEndpoint" TEXT,
    "apiKey" TEXT NOT NULL,
    "webhookSecret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastConnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MessagingIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessagingIntegration_tenantId_isActive_idx" ON "MessagingIntegration"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MessagingIntegration_provider_instanceName_key" ON "MessagingIntegration"("provider", "instanceName");

-- CreateIndex
CREATE UNIQUE INDEX "Message_externalId_key" ON "Message"("externalId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_messagingIntegrationId_fkey" FOREIGN KEY ("messagingIntegrationId") REFERENCES "MessagingIntegration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessagingIntegration" ADD CONSTRAINT "MessagingIntegration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
