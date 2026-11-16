-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "etiquetas" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "ContatoDaBeatriz" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "etiquetas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContatoDaBeatriz_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContatoDaBeatriz_expiraEm_idx" ON "ContatoDaBeatriz"("expiraEm");

-- CreateIndex
CREATE UNIQUE INDEX "ContatoDaBeatriz_empresaId_telefone_key" ON "ContatoDaBeatriz"("empresaId", "telefone");

-- AddForeignKey
ALTER TABLE "ContatoDaBeatriz" ADD CONSTRAINT "ContatoDaBeatriz_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
