-- AlterTable
ALTER TABLE "ConfiguracaoPrecificacao" ADD COLUMN     "embalagemPedido" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN     "impostoPercentual" DECIMAL(8,4) NOT NULL DEFAULT 0,
ADD COLUMN     "itensPorPedidoEstimados" DECIMAL(8,2) NOT NULL DEFAULT 1,
ADD COLUMN     "margemMinimaPercentual" DECIMAL(8,4) NOT NULL DEFAULT 20,
ADD COLUMN     "margensCenario" TEXT NOT NULL DEFAULT '20,25,30,35',
ADD COLUMN     "taxaPagamentoPercentual" DECIMAL(8,4) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CanalPrecificacao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "comissaoPercentual" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "taxaMensal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pedidosMensaisEstimados" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanalPrecificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrecoProduto" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "preco" DECIMAL(12,2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrecoProduto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CanalPrecificacao_empresaId_idx" ON "CanalPrecificacao"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "CanalPrecificacao_empresaId_canal_key" ON "CanalPrecificacao"("empresaId", "canal");

-- CreateIndex
CREATE INDEX "PrecoProduto_empresaId_idx" ON "PrecoProduto"("empresaId");

-- CreateIndex
CREATE INDEX "PrecoProduto_produtoId_idx" ON "PrecoProduto"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "PrecoProduto_empresaId_produtoId_canal_key" ON "PrecoProduto"("empresaId", "produtoId", "canal");

-- AddForeignKey
ALTER TABLE "CanalPrecificacao" ADD CONSTRAINT "CanalPrecificacao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecoProduto" ADD CONSTRAINT "PrecoProduto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecoProduto" ADD CONSTRAINT "PrecoProduto_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
