-- AlterTable
ALTER TABLE "User" ADD COLUMN     "customVoiceCreatedAt" TIMESTAMP(3),
ADD COLUMN     "customVoiceId" TEXT,
ADD COLUMN     "customVoiceName" TEXT;
