-- AlterTable
ALTER TABLE "EntradaCompra" ADD COLUMN     "aPrazo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ContaPagar" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "entradaCompraId" TEXT,
    "fornecedorId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "numeroDocumento" TEXT,
    "parcela" INTEGER NOT NULL DEFAULT 1,
    "totalParcelas" INTEGER NOT NULL DEFAULT 1,
    "valor" DECIMAL(12,2) NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "pagoEm" TIMESTAMP(3),
    "valorPago" DECIMAL(12,2),
    "formaPagamento" TEXT,
    "observacao" TEXT,
    "motivoCancelamento" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContaPagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracaoFinanceira" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "saldoInicial" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldoInicialEm" TIMESTAMP(3),
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoFinanceira_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContaPagar_empresaId_status_vencimento_idx" ON "ContaPagar"("empresaId", "status", "vencimento");

-- CreateIndex
CREATE INDEX "ContaPagar_entradaCompraId_idx" ON "ContaPagar"("entradaCompraId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracaoFinanceira_empresaId_key" ON "ConfiguracaoFinanceira"("empresaId");

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_entradaCompraId_fkey" FOREIGN KEY ("entradaCompraId") REFERENCES "EntradaCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracaoFinanceira" ADD CONSTRAINT "ConfiguracaoFinanceira_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
