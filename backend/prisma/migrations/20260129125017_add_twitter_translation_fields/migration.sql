-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "originalContent" TEXT,
ADD COLUMN     "sourceType" TEXT,
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "translatedContent" TEXT;

-- CreateTable
CREATE TABLE "TranslationPurchase" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "documentId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranslationPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TranslationPurchase_userId_idx" ON "TranslationPurchase"("userId");

-- CreateIndex
CREATE INDEX "TranslationPurchase_documentId_idx" ON "TranslationPurchase"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "TranslationPurchase_userId_documentId_key" ON "TranslationPurchase"("userId", "documentId");

-- AddForeignKey
ALTER TABLE "TranslationPurchase" ADD CONSTRAINT "TranslationPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationPurchase" ADD CONSTRAINT "TranslationPurchase_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
