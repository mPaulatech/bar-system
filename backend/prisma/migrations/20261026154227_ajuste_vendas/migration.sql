-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO');

-- AlterTable
ALTER TABLE "vendas_ingressos" ADD COLUMN     "forma_pagamento" "FormaPagamento" NOT NULL DEFAULT 'DINHEIRO';
