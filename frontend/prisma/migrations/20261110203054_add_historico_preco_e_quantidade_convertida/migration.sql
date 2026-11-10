-- AlterTable
ALTER TABLE "EntradaCompraItem" ADD COLUMN     "quantidadeConvertida" DECIMAL(14,4),
ADD COLUMN     "unidadeConvertida" TEXT;

-- CreateTable
CREATE TABLE "HistoricoPrecoInsumo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "entradaCompraItemId" TEXT NOT NULL,
    "dataCompra" TIMESTAMP(3) NOT NULL,
    "precoPorUnidade" DECIMAL(14,4) NOT NULL,
    "custoAnterior" DECIMAL(14,4) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoPrecoInsumo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HistoricoPrecoInsumo_entradaCompraItemId_key" ON "HistoricoPrecoInsumo"("entradaCompraItemId");

-- CreateIndex
CREATE INDEX "HistoricoPrecoInsumo_empresaId_idx" ON "HistoricoPrecoInsumo"("empresaId");

-- CreateIndex
CREATE INDEX "HistoricoPrecoInsumo_insumoId_dataCompra_idx" ON "HistoricoPrecoInsumo"("insumoId", "dataCompra");

-- AddForeignKey
ALTER TABLE "HistoricoPrecoInsumo" ADD CONSTRAINT "HistoricoPrecoInsumo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoPrecoInsumo" ADD CONSTRAINT "HistoricoPrecoInsumo_entradaCompraItemId_fkey" FOREIGN KEY ("entradaCompraItemId") REFERENCES "EntradaCompraItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
