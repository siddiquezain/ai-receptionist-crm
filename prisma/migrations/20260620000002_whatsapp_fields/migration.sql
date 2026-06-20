-- Add WhatsApp configuration fields to Tenant
ALTER TABLE "Tenant" ADD COLUMN "whatsappPhoneNumberId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "whatsappAccessToken" TEXT;
CREATE UNIQUE INDEX "Tenant_whatsappPhoneNumberId_key" ON "Tenant"("whatsappPhoneNumberId");
