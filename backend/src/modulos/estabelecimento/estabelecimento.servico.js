import { createHash, randomBytes } from 'node:crypto';
import { erroHttp } from '../../utilitarios/erro-http.js';

const camposPublicos = {
  id: true,
  nomeFantasia: true,
  razaoSocial: true,
  cnpj: true,
  emailContato: true,
  apiKeyPrefixo: true,
  criadoEm: true,
  atualizadoEm: true,
};

export async function obterEstabelecimento(prisma, id) {
  const estabelecimento = await prisma.estabelecimento.findUnique({
    where: { id },
    select: camposPublicos,
  });
  if (!estabelecimento) throw erroHttp(404, 'Estabelecimento não encontrado.');
  return estabelecimento;
}

export async function atualizarEstabelecimento(prisma, id, dados) {
  await obterEstabelecimento(prisma, id);
  return prisma.estabelecimento.update({
    where: { id },
    data: dados,
    select: camposPublicos,
  });
}

export async function gerarApiKey(prisma, id) {
  const chave = `dbk_${randomBytes(32).toString('hex')}`;
  const apiKeyHash = createHash('sha256').update(chave).digest('hex');
  const apiKeyPrefixo = chave.slice(0, 12);
  await obterEstabelecimento(prisma, id);
  await prisma.estabelecimento.update({
    where: { id },
    data: { apiKeyHash, apiKeyPrefixo },
  });
  return { apiKey: chave, apiKeyPrefixo };
}
