-- CreateTable
CREATE TABLE "HorarioDeFuncionamento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "diaDaSemana" INTEGER NOT NULL,
    "aberto" BOOLEAN NOT NULL DEFAULT true,
    "abertura" TEXT,
    "fechamento" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HorarioDeFuncionamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExcecaoDeHorario" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "inicio" DATE NOT NULL,
    "fim" DATE NOT NULL,
    "aberto" BOOLEAN NOT NULL,
    "abertura" TEXT,
    "fechamento" TEXT,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExcecaoDeHorario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HorarioDeFuncionamento_empresaId_diaDaSemana_key" ON "HorarioDeFuncionamento"("empresaId", "diaDaSemana");

-- CreateIndex
CREATE INDEX "ExcecaoDeHorario_empresaId_inicio_fim_idx" ON "ExcecaoDeHorario"("empresaId", "inicio", "fim");

-- AddForeignKey
ALTER TABLE "HorarioDeFuncionamento" ADD CONSTRAINT "HorarioDeFuncionamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExcecaoDeHorario" ADD CONSTRAINT "ExcecaoDeHorario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

