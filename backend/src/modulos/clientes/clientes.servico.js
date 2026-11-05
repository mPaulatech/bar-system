import { erroHttp } from '../../utilitarios/erro-http.js';

const selecaoCliente = {
  id: true,
  estabelecimentoId: true,
  nome: true,
  cpf: true,
  email: true,
  dataNascimento: true,
  telefone: true,
  criadoEm: true,
  atualizadoEm: true,
};

const selecaoClienteParaVenda = {
  id: true,
  nome: true,
  cpf: true,
  email: true,
};

/**
 * Cria um cliente no estabelecimento autenticado.
 * @param {object} prisma Cliente Prisma.
 * @param {number} estabelecimentoId Estabelecimento do token.
 * @param {object} dados Nome, CPF e e-mail normalizados.
 * @returns {Promise<object>} Cliente criado.
 */
export async function criarCliente(prisma, estabelecimentoId, dados) {
  try {
    return await prisma.cliente.create({
      data: { ...dados, estabelecimentoId },
      select: selecaoCliente,
    });
  } catch (erro) {
    if (erro?.code === 'P2002') {
      throw erroHttp(409, 'Já existe um cliente com este CPF.');
    }
    throw erro;
  }
}

/**
 * Busca um cliente pelo CPF dentro do estabelecimento.
 * @param {object} prisma Cliente Prisma.
 * @param {number} estabelecimentoId Estabelecimento do token.
 * @param {string} cpf CPF normalizado.
 * @returns {Promise<object>} Cliente encontrado.
 */
export async function obterClientePorCpf(prisma, estabelecimentoId, cpf) {
  const cliente = await prisma.cliente.findFirst({
    where: { estabelecimentoId, cpf },
    select: selecaoCliente,
  });
  if (!cliente) throw erroHttp(404, 'Cliente não encontrado.');
  return cliente;
}

/**
 * Busca somente os dados necessários para preencher uma venda.
 * @param {object} prisma Cliente Prisma.
 * @param {number} estabelecimentoId Estabelecimento do token.
 * @param {string} cpf CPF normalizado.
 * @returns {Promise<object>} Dados mínimos do cliente encontrado.
 */
export async function obterClienteParaVenda(prisma, estabelecimentoId, cpf) {
  const cliente = await prisma.cliente.findFirst({
    where: { estabelecimentoId, cpf },
    select: selecaoClienteParaVenda,
  });
  if (!cliente) throw erroHttp(404, 'Cliente não encontrado.');
  return cliente;
}

/**
 * Busca um cliente pelo ID dentro do estabelecimento.
 * @param {object} prisma Cliente Prisma.
 * @param {number} estabelecimentoId Estabelecimento do token.
 * @param {number} id ID do cliente.
 * @returns {Promise<object>} Cliente encontrado.
 */
export async function obterClientePorId(prisma, estabelecimentoId, id) {
  const cliente = await prisma.cliente.findFirst({
    where: { id, estabelecimentoId },
    select: selecaoCliente,
  });
  if (!cliente) throw erroHttp(404, 'Cliente não encontrado.');
  return cliente;
}

/**
 * Lista clientes do estabelecimento com filtros e paginação.
 * @param {object} prisma Cliente Prisma.
 * @param {number} estabelecimentoId Estabelecimento do token.
 * @param {object} filtros Filtros validados.
 * @returns {Promise<object>} Dados paginados.
 */
export async function listarClientes(prisma, estabelecimentoId, filtros) {
  const where = {
    estabelecimentoId,
    ...(filtros.nome ? { nome: { contains: filtros.nome, mode: 'insensitive' } } : {}),
    ...(filtros.cpf ? { cpf: filtros.cpf } : {}),
  };
  const [total, dados] = await Promise.all([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      select: selecaoCliente,
      orderBy: { nome: 'asc' },
      skip: (filtros.pagina - 1) * filtros.limite,
      take: filtros.limite,
    }),
  ]);
  return {
    dados,
    pagina: filtros.pagina,
    limite: filtros.limite,
    total,
    totalPaginas: Math.ceil(total / filtros.limite),
  };
}

/**
 * Atualiza os dados cadastrais permitidos de um cliente isolado.
 * @param {object} prisma Cliente Prisma.
 * @param {number} estabelecimentoId Estabelecimento do token.
 * @param {number} id ID do cliente.
 * @param {object} dados Nome ou e-mail.
 * @returns {Promise<object>} Cliente atualizado.
 */
export async function atualizarCliente(prisma, estabelecimentoId, id, dados) {
  await obterClientePorId(prisma, estabelecimentoId, id);
  try {
    return await prisma.cliente.update({
      where: { id },
      data: dados,
      select: selecaoCliente,
    });
  } catch (erro) {
    if (erro?.code === 'P2002') {
      throw erroHttp(409, 'Já existe um cliente com este CPF.');
    }
    throw erro;
  }
}
