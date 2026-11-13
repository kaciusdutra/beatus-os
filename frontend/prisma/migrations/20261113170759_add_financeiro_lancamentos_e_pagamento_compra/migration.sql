-- AlterTable
ALTER TABLE "EntradaCompra" ADD COLUMN     "formaPagamento" TEXT,
ADD COLUMN     "pagoEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LancamentoFinanceiro" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "forma" TEXT,
    "observacao" TEXT,
    "cancelado" BOOLEAN NOT NULL DEFAULT false,
    "motivoCancelamento" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LancamentoFinanceiro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_empresaId_data_idx" ON "LancamentoFinanceiro"("empresaId", "data");

-- AddForeignKey
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
