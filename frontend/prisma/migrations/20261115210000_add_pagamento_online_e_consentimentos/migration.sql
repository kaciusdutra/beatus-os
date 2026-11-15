-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "aceitaMarketing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aceitaMarketingEm" TIMESTAMP(3),
ADD COLUMN     "aceitouPoliticaEm" TIMESTAMP(3),
ADD COLUMN     "versaoDaPolitica" TEXT;

-- CreateTable
CREATE TABLE "PagamentoOnline" (
    "id" TEXT NOT NULL,
    "pagamentoId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "transacaoExterna" TEXT,
    "statusExterno" TEXT,
    "checkoutUrl" TEXT,
    "expiraEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PagamentoOnline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoPagamento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "transacaoExterna" TEXT,
    "tipo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEBIDO',
    "erro" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processadoEm" TIMESTAMP(3),

    CONSTRAINT "EventoPagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PagamentoOnline_pagamentoId_key" ON "PagamentoOnline"("pagamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "PagamentoOnline_gateway_transacaoExterna_key" ON "PagamentoOnline"("gateway", "transacaoExterna");

-- CreateIndex
CREATE INDEX "EventoPagamento_empresaId_status_idx" ON "EventoPagamento"("empresaId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventoPagamento_empresaId_gateway_eventoId_key" ON "EventoPagamento"("empresaId", "gateway", "eventoId");

-- AddForeignKey
ALTER TABLE "PagamentoOnline" ADD CONSTRAINT "PagamentoOnline_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "Pagamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoPagamento" ADD CONSTRAINT "EventoPagamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

