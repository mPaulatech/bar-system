import { PrismaClient } from '@prisma/client';

// Reutiliza a mesma instância durante o desenvolvimento com recarregamento do Node.
const armazenamentoGlobal = globalThis;

export const prisma = armazenamentoGlobal.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  armazenamentoGlobal.prisma = prisma;
}

export default prisma;
