-- Rename Meta Cloud API fields to Evolution API terminology
ALTER TABLE "Tenant" RENAME COLUMN "whatsappPhoneNumberId" TO "evolutionInstanceName";
ALTER TABLE "Tenant" RENAME COLUMN "whatsappAccessToken" TO "evolutionApiKey";
DROP INDEX IF EXISTS "Tenant_whatsappPhoneNumberId_key";
CREATE UNIQUE INDEX "Tenant_evolutionInstanceName_key" ON "Tenant"("evolutionInstanceName");
ALTER TABLE "Tenant" ADD COLUMN "evolutionApiUrl" TEXT;
