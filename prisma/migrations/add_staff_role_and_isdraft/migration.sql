-- AlterEnum
ALTER TYPE "MessageRole" ADD VALUE 'STAFF';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "isDraft" BOOLEAN NOT NULL DEFAULT false;
