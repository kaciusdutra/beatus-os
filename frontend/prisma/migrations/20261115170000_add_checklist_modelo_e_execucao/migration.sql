-- CreateTable
CREATE TABLE "ChecklistItemModelo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "verificacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItemModelo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistExecucao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "tipo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" TIMESTAMP(3),
    "concluidoPor" TEXT,

    CONSTRAINT "ChecklistExecucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistExecucaoItem" (
    "id" TEXT NOT NULL,
    "execucaoId" TEXT NOT NULL,
    "modeloItemId" TEXT,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT,
    "obrigatorio" BOOLEAN NOT NULL,
    "ordem" INTEGER NOT NULL,
    "verificacao" TEXT,
    "feito" BOOLEAN NOT NULL DEFAULT false,
    "feitoPor" TEXT,
    "feitoEm" TIMESTAMP(3),
    "observacao" TEXT,

    CONSTRAINT "ChecklistExecucaoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistItemModelo_empresaId_tipo_ordem_idx" ON "ChecklistItemModelo"("empresaId", "tipo", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistExecucao_empresaId_data_tipo_key" ON "ChecklistExecucao"("empresaId", "data", "tipo");

-- CreateIndex
CREATE INDEX "ChecklistExecucaoItem_execucaoId_idx" ON "ChecklistExecucaoItem"("execucaoId");

-- AddForeignKey
ALTER TABLE "ChecklistItemModelo" ADD CONSTRAINT "ChecklistItemModelo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistExecucao" ADD CONSTRAINT "ChecklistExecucao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistExecucaoItem" ADD CONSTRAINT "ChecklistExecucaoItem_execucaoId_fkey" FOREIGN KEY ("execucaoId") REFERENCES "ChecklistExecucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

