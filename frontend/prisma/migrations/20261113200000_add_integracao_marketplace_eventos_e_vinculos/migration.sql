-- CreateTable
CREATE TABLE "IntegracaoMarketplace" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "aceiteAutomatico" BOOLEAN NOT NULL DEFAULT true,
    "modoSimulacao" BOOLEAN NOT NULL DEFAULT true,
    "idDaLoja" TEXT,
    "ultimoContatoEm" TIMESTAMP(3),
    "ultimaFalha" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegracaoMarketplace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoMarketplace" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "pedidoExternoId" TEXT,
    "tipo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEBIDO',
    "erro" TEXT,
    "pedidoId" TEXT,
    "confirmadoEm" TIMESTAMP(3),
    "confirmacaoErro" TEXT,
    "recebidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processadoEm" TIMESTAMP(3),

    CONSTRAINT "EventoMarketplace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VinculoItemMarketplace" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "codigoItemExterno" TEXT NOT NULL,
    "nomeExterno" TEXT,
    "produtoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VinculoItemMarketplace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegracaoMarketplace_empresaId_canal_key" ON "IntegracaoMarketplace"("empresaId", "canal");

-- CreateIndex
CREATE INDEX "EventoMarketplace_empresaId_status_idx" ON "EventoMarketplace"("empresaId", "status");

-- CreateIndex
CREATE INDEX "EventoMarketplace_empresaId_canal_pedidoExternoId_idx" ON "EventoMarketplace"("empresaId", "canal", "pedidoExternoId");

-- CreateIndex
CREATE UNIQUE INDEX "EventoMarketplace_empresaId_canal_eventoId_key" ON "EventoMarketplace"("empresaId", "canal", "eventoId");

-- CreateIndex
CREATE INDEX "VinculoItemMarketplace_empresaId_canal_idx" ON "VinculoItemMarketplace"("empresaId", "canal");

-- CreateIndex
CREATE UNIQUE INDEX "VinculoItemMarketplace_empresaId_canal_codigoItemExterno_key" ON "VinculoItemMarketplace"("empresaId", "canal", "codigoItemExterno");

-- AddForeignKey
ALTER TABLE "IntegracaoMarketplace" ADD CONSTRAINT "IntegracaoMarketplace_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoMarketplace" ADD CONSTRAINT "EventoMarketplace_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VinculoItemMarketplace" ADD CONSTRAINT "VinculoItemMarketplace_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VinculoItemMarketplace" ADD CONSTRAINT "VinculoItemMarketplace_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

