-- DropForeignKey
ALTER TABLE "FichaTecnicaItem" DROP CONSTRAINT "FichaTecnicaItem_insumoId_fkey";

-- AlterTable
ALTER TABLE "FichaTecnica" ADD COLUMN     "estoqueMinimo" DECIMAL(14,4);

-- AlterTable
ALTER TABLE "Insumo" ADD COLUMN     "estoqueMinimo" DECIMAL(14,4);

-- CreateTable
CREATE TABLE "MovimentoEstoque" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "itemTipo" TEXT NOT NULL,
    "insumoId" TEXT,
    "fichaTecnicaId" TEXT,
    "tipo" TEXT NOT NULL,
    "quantidade" DECIMAL(14,4) NOT NULL,
    "unidade" TEXT NOT NULL,
    "custoUnitario" DECIMAL(14,4),
    "motivo" TEXT,
    "entradaCompraItemId" TEXT,
    "pedidoId" TEXT,
    "producaoLoteId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProducaoLote" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "fichaTecnicaId" TEXT NOT NULL,
    "quantidadePlanejada" DECIMAL(14,4) NOT NULL,
    "quantidadeProduzida" DECIMAL(14,4) NOT NULL,
    "unidade" TEXT NOT NULL,
    "custoUnitario" DECIMAL(14,4),
    "validade" TIMESTAMP(3),
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProducaoLote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAtividade" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "resumo" TEXT NOT NULL,
    "referenciaId" TEXT,
    "referenciaNumero" TEXT,
    "operador" TEXT,
    "detalhes" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAtividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilaImpressao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "impressoEm" TIMESTAMP(3),

    CONSTRAINT "FilaImpressao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovimentoEstoque_empresaId_insumoId_idx" ON "MovimentoEstoque"("empresaId", "insumoId");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_empresaId_fichaTecnicaId_idx" ON "MovimentoEstoque"("empresaId", "fichaTecnicaId");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_pedidoId_idx" ON "MovimentoEstoque"("pedidoId");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_producaoLoteId_idx" ON "MovimentoEstoque"("producaoLoteId");

-- CreateIndex
CREATE UNIQUE INDEX "MovimentoEstoque_entradaCompraItemId_tipo_key" ON "MovimentoEstoque"("entradaCompraItemId", "tipo");

-- CreateIndex
CREATE INDEX "ProducaoLote_empresaId_fichaTecnicaId_idx" ON "ProducaoLote"("empresaId", "fichaTecnicaId");

-- CreateIndex
CREATE INDEX "ProducaoLote_empresaId_criadoEm_idx" ON "ProducaoLote"("empresaId", "criadoEm");

-- CreateIndex
CREATE INDEX "RegistroAtividade_empresaId_criadoEm_idx" ON "RegistroAtividade"("empresaId", "criadoEm");

-- CreateIndex
CREATE INDEX "RegistroAtividade_empresaId_entidade_referenciaId_idx" ON "RegistroAtividade"("empresaId", "entidade", "referenciaId");

-- CreateIndex
CREATE INDEX "FilaImpressao_empresaId_status_idx" ON "FilaImpressao"("empresaId", "status");

-- CreateIndex
CREATE INDEX "FilaImpressao_pedidoId_idx" ON "FilaImpressao"("pedidoId");

-- AddForeignKey
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_fichaTecnicaId_fkey" FOREIGN KEY ("fichaTecnicaId") REFERENCES "FichaTecnica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_producaoLoteId_fkey" FOREIGN KEY ("producaoLoteId") REFERENCES "ProducaoLote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProducaoLote" ADD CONSTRAINT "ProducaoLote_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProducaoLote" ADD CONSTRAINT "ProducaoLote_fichaTecnicaId_fkey" FOREIGN KEY ("fichaTecnicaId") REFERENCES "FichaTecnica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAtividade" ADD CONSTRAINT "RegistroAtividade_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilaImpressao" ADD CONSTRAINT "FilaImpressao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilaImpressao" ADD CONSTRAINT "FilaImpressao_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FichaTecnicaItem" ADD CONSTRAINT "FichaTecnicaItem_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
