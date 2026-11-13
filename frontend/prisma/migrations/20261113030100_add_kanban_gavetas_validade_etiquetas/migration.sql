-- AlterTable
ALTER TABLE "MovimentoEstoque" ADD COLUMN     "descongeladoEm" TIMESTAMP(3),
ADD COLUMN     "gavetaId" TEXT,
ADD COLUMN     "local" TEXT,
ADD COLUMN     "validadeAte" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GavetaEstoque" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "fichaTecnicaId" TEXT,
    "capacidade" DECIMAL(14,4),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GavetaEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegraValidade" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "conservacao" TEXT NOT NULL,
    "temperatura" TEXT NOT NULL,
    "dias" INTEGER NOT NULL,
    "fonte" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegraValidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracaoEstoque" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "temperaturaFreezerC" DECIMAL(6,2),
    "temperaturaGeladeiraC" DECIMAL(6,2),
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GavetaEstoque_empresaId_idx" ON "GavetaEstoque"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "GavetaEstoque_empresaId_nome_key" ON "GavetaEstoque"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "RegraValidade_empresaId_idx" ON "RegraValidade"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "RegraValidade_empresaId_categoria_key" ON "RegraValidade"("empresaId", "categoria");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracaoEstoque_empresaId_key" ON "ConfiguracaoEstoque"("empresaId");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_empresaId_local_idx" ON "MovimentoEstoque"("empresaId", "local");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_gavetaId_idx" ON "MovimentoEstoque"("gavetaId");

-- AddForeignKey
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_gavetaId_fkey" FOREIGN KEY ("gavetaId") REFERENCES "GavetaEstoque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GavetaEstoque" ADD CONSTRAINT "GavetaEstoque_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GavetaEstoque" ADD CONSTRAINT "GavetaEstoque_fichaTecnicaId_fkey" FOREIGN KEY ("fichaTecnicaId") REFERENCES "FichaTecnica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraValidade" ADD CONSTRAINT "RegraValidade_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracaoEstoque" ADD CONSTRAINT "ConfiguracaoEstoque_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
