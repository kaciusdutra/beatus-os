-- AlterTable
ALTER TABLE "Insumo" ADD COLUMN     "categoriaId" TEXT,
ADD COLUMN     "unidadeCompraId" TEXT;

-- CreateTable
CREATE TABLE "CategoriaInsumo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaInsumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadeMedida" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "abreviacao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadeMedida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoriaInsumo_empresaId_idx" ON "CategoriaInsumo"("empresaId");

-- CreateIndex
CREATE INDEX "CategoriaInsumo_empresaId_ativo_idx" ON "CategoriaInsumo"("empresaId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaInsumo_empresaId_nome_key" ON "CategoriaInsumo"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "UnidadeMedida_empresaId_idx" ON "UnidadeMedida"("empresaId");

-- CreateIndex
CREATE INDEX "UnidadeMedida_empresaId_ativo_idx" ON "UnidadeMedida"("empresaId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadeMedida_empresaId_abreviacao_key" ON "UnidadeMedida"("empresaId", "abreviacao");

-- AddForeignKey
ALTER TABLE "Insumo" ADD CONSTRAINT "Insumo_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaInsumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insumo" ADD CONSTRAINT "Insumo_unidadeCompraId_fkey" FOREIGN KEY ("unidadeCompraId") REFERENCES "UnidadeMedida"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriaInsumo" ADD CONSTRAINT "CategoriaInsumo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadeMedida" ADD CONSTRAINT "UnidadeMedida_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
