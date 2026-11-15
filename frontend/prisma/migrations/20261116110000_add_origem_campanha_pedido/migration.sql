-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN "utmSource" TEXT,
ADD COLUMN "utmMedium" TEXT,
ADD COLUMN "utmCampaign" TEXT,
ADD COLUMN "utmContent" TEXT;

-- CreateIndex
CREATE INDEX "Pedido_empresaId_utmCampaign_idx" ON "Pedido"("empresaId", "utmCampaign");
