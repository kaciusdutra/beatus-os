/*
  Warnings:

  - Made the column `caminhoArquivo` on table `EntradaCompraDocumento` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "EntradaCompraDocumento" ALTER COLUMN "caminhoArquivo" SET NOT NULL;
