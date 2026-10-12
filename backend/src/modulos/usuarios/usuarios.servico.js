import bcrypt from 'bcryptjs';
import { erroHttp } from '../../utilitarios/erro-http.js';

const camposPublicos = {
  id: true,
  nome: true,
  cpf: true,
  email: true,
  perfil: true,
  ativo: true,
  criadoEm: true,
};

export async function criarFuncionario(prisma, estabelecimentoId, dados) {
  try {
    return await prisma.usuario.create({
      data: {
        estabelecimentoId,
        nome: dados.nome,
        cpf: dados.cpf?.replace(/\D/g, ''),
        email: dados.email,
        senhaHash: await bcrypt.hash(dados.senha, 12),
        perfil: 'FUNCIONARIO',
      },
      select: camposPublicos,
    });
  } catch (erro) {
    if (erro?.code === 'P2002') throw erroHttp(409, 'E-mail já cadastrado.');
    throw erro;
  }
}

export function listarFuncionarios(prisma, estabelecimentoId) {
  return prisma.usuario.findMany({
    where: { estabelecimentoId, perfil: 'FUNCIONARIO' },
    select: camposPublicos,
    orderBy: { nome: 'asc' },
  });
}

export async function alterarAtivo(prisma, estabelecimentoId, id, ativo) {
  const resultado = await prisma.usuario.updateMany({
    where: { id, estabelecimentoId, perfil: 'FUNCIONARIO' },
    data: { ativo },
  });
  if (resultado.count !== 1) throw erroHttp(404, 'Funcionário não encontrado.');
  return prisma.usuario.findFirst({ where: { id, estabelecimentoId }, select: camposPublicos });
}
