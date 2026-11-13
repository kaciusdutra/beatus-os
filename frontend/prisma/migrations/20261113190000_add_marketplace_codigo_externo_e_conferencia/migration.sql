-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "codigoExterno" TEXT,
ADD COLUMN     "comissaoEsperada" DECIMAL(12,2),
ADD COLUMN     "conferenciaStatus" TEXT,
ADD COLUMN     "conferidoEm" TIMESTAMP(3),
ADD COLUMN     "entregaPor" TEXT,
ADD COLUMN     "liquidoEsperado" DECIMAL(12,2),
ADD COLUMN     "nomeClienteExterno" TEXT,
ADD COLUMN     "observacaoConferencia" TEXT,
ADD COLUMN     "valorRecebido" DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "Pedido_empresaId_conferenciaStatus_idx" ON "Pedido"("empresaId", "conferenciaStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_empresaId_canal_codigoExterno_key" ON "Pedido"("empresaId", "canal", "codigoExterno");

