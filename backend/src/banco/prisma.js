import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Reutiliza a mesma instância durante o desenvolvimento com recarregamento do Node.
const armazenamentoGlobal = globalThis;
const adaptador = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = armazenamentoGlobal.prisma ?? new PrismaClient({ adapter: adaptador });

if (process.env.NODE_ENV !== 'production') {
  armazenamentoGlobal.prisma = prisma;
}

export default prisma;
