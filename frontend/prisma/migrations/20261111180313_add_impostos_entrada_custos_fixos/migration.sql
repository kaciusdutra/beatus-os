-- AlterTable
ALTER TABLE "EntradaCompra" ADD COLUMN     "valorIcmsSt" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "valorIpi" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "valorOutrasDespesas" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "valorSeguro" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CustoFixo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valorMensal" DECIMAL(12,2) NOT NULL,
    "inicioVigencia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fimVigencia" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustoFixo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracaoPrecificacao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "pedidosMensaisEstimados" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoPrecificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustoFixo_empresaId_idx" ON "CustoFixo"("empresaId");

-- CreateIndex
CREATE INDEX "CustoFixo_empresaId_ativo_idx" ON "CustoFixo"("empresaId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracaoPrecificacao_empresaId_key" ON "ConfiguracaoPrecificacao"("empresaId");

-- AddForeignKey
ALTER TABLE "CustoFixo" ADD CONSTRAINT "CustoFixo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracaoPrecificacao" ADD CONSTRAINT "ConfiguracaoPrecificacao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
