import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { erroHttp } from '../../utilitarios/erro-http.js';
import { somenteDigitos } from './autenticacao.esquemas.js';

function validarDigitos(documento, tamanho) {
  return somenteDigitos(documento).length === tamanho;
}

function dadosPublicosEstabelecimento(estabelecimento) {
  return { id: estabelecimento.id, nomeFantasia: estabelecimento.nomeFantasia };
}

export async function registrarEstabelecimento(prisma, dados) {
  if (!validarDigitos(dados.cnpj, 14) || (dados.cpfGestor && !validarDigitos(dados.cpfGestor, 11))) {
    throw erroHttp(400, 'CNPJ ou CPF inválido.');
  }

  const cnpjNormalizado = somenteDigitos(dados.cnpj);
  const cpfNormalizado = dados.cpfGestor ? somenteDigitos(dados.cpfGestor) : undefined;
  const senhaHash = await bcrypt.hash(dados.senhaGestor, 12);

  try {
    return await prisma.$transaction(async (transacao) => {
      const estabelecimento = await transacao.estabelecimento.create({
        data: {
          nomeFantasia: dados.nomeFantasia,
          razaoSocial: dados.razaoSocial,
          cnpj: cnpjNormalizado,
          emailContato: dados.emailContato,
        },
      });
      const gestor = await transacao.usuario.create({
        data: {
          estabelecimentoId: estabelecimento.id,
          nome: dados.nomeGestor,
          cpf: cpfNormalizado,
          email: dados.emailGestor,
          senhaHash,
          perfil: 'GESTOR',
        },
      });
      return {
        estabelecimento: dadosPublicosEstabelecimento(estabelecimento),
        gestor: { id: gestor.id, email: gestor.email },
      };
    });
  } catch (erro) {
    if (erro?.code === 'P2002') {
      throw erroHttp(409, 'CNPJ ou e-mail já cadastrado.');
    }
    throw erro;
  }
}

export async function autenticarUsuario(prisma, dados, configuracao) {
  const usuario = await prisma.usuario.findUnique({ where: { email: dados.email } });
  const senhaValida = usuario ? await bcrypt.compare(dados.senha, usuario.senhaHash) : false;

  if (!usuario || !usuario.ativo || !senhaValida) {
    throw erroHttp(401, 'E-mail ou senha inválidos.');
  }

  const token = jwt.sign(
    {
      usuarioId: usuario.id,
      estabelecimentoId: usuario.estabelecimentoId,
      perfil: usuario.perfil,
    },
    configuracao.jwtSecret,
    { expiresIn: configuracao.jwtExpiraEm },
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      perfil: usuario.perfil,
      estabelecimentoId: usuario.estabelecimentoId,
    },
  };
}
