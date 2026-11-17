import { erroHttp } from '../../utilitarios/erro-http.js';

const colunasCsvPermitidas = new Set([
  'idTransacaoExterna',
  'valorTotal',
  'dataHoraTransacao',
  'eventoId',
  'clienteId',
  'itens',
]);

function lerLinhasCsv(conteudo) {
  const linhas = [];
  let linha = [];
  let campo = '';
  let dentroDeAspas = false;
  let aposAspas = false;

  for (let indice = 0; indice < conteudo.length; indice += 1) {
    const caractere = conteudo[indice];

    if (dentroDeAspas) {
      if (caractere === '"' && conteudo[indice + 1] === '"') {
        campo += '"';
        indice += 1;
      } else if (caractere === '"') {
        dentroDeAspas = false;
        aposAspas = true;
      } else {
        campo += caractere;
      }
      continue;
    }

    if (aposAspas && caractere !== ',' && caractere !== '\r' && caractere !== '\n') {
      throw erroHttp(400, 'Arquivo CSV inválido: há conteúdo após o fechamento de aspas.');
    }

    if (caractere === '"') {
      if (campo.length > 0 || aposAspas) {
        throw erroHttp(400, 'Arquivo CSV inválido: aspas em posição inesperada.');
      }
      dentroDeAspas = true;
    } else if (caractere === ',') {
      linha.push(campo);
      campo = '';
      aposAspas = false;
    } else if (caractere === '\n' || caractere === '\r') {
      linha.push(campo);
      if (linha.some((valor) => valor.trim() !== '')) linhas.push(linha);
      linha = [];
      campo = '';
      aposAspas = false;
      if (caractere === '\r' && conteudo[indice + 1] === '\n') indice += 1;
    } else {
      campo += caractere;
      aposAspas = false;
    }
  }

  if (dentroDeAspas) {
    throw erroHttp(400, 'Arquivo CSV inválido: há um campo com aspas sem fechamento.');
  }
  linha.push(campo);
  if (linha.some((valor) => valor.trim() !== '')) linhas.push(linha);
  return linhas;
}

function converterCsvEmVendas(conteudo) {
  const linhas = lerLinhasCsv(conteudo.replace(/^\uFEFF/, ''));
  if (linhas.length < 2) {
    throw erroHttp(400, 'O arquivo CSV precisa ter cabeçalho e ao menos uma venda.');
  }

  const cabecalho = linhas[0].map((coluna) => coluna.trim());
  if (
    cabecalho.some((coluna) => !coluna || !colunasCsvPermitidas.has(coluna))
    || new Set(cabecalho).size !== cabecalho.length
  ) {
    throw erroHttp(400, 'O cabeçalho CSV contém colunas desconhecidas ou repetidas.');
  }

  for (const coluna of ['idTransacaoExterna', 'valorTotal', 'dataHoraTransacao']) {
    if (!cabecalho.includes(coluna)) {
      throw erroHttp(400, `A coluna ${coluna} é obrigatória no arquivo CSV.`);
    }
  }

  return linhas.slice(1).map((valores, indice) => {
    if (valores.length !== cabecalho.length) {
      throw erroHttp(400, `A linha ${indice + 2} tem quantidade incorreta de colunas.`);
    }
    const venda = Object.fromEntries(
      cabecalho.map((coluna, colunaIndice) => [coluna, valores[colunaIndice].trim()]),
    );

    if (venda.itens) {
      try {
        venda.itens = JSON.parse(venda.itens);
      } catch {
        throw erroHttp(400, `O campo itens da linha ${indice + 2} precisa conter JSON válido.`);
      }
    } else {
      delete venda.itens;
    }

    for (const campo of ['eventoId', 'clienteId']) {
      if (!venda[campo]) delete venda[campo];
    }
    return venda;
  });
}

/**
 * Converte o CSV enviado no corpo para o mesmo formato validado do JSON.
 * @param {import('express').Request} req Requisição da importação.
 * @param {import('express').Response} res Resposta atual.
 * @param {import('express').NextFunction} next Próximo middleware da rota.
 * @returns {void} Encaminha o corpo convertido ou um erro de formato.
 */
export function normalizarArquivoVendasConsumo(req, res, next) {
  if (req.is('text/csv')) {
    if (typeof req.body !== 'string') {
      return next(erroHttp(400, 'O arquivo CSV está vazio ou não pôde ser lido.'));
    }
    try {
      req.body = { vendas: converterCsvEmVendas(req.body) };
      return next();
    } catch (erro) {
      return next(erro);
    }
  }

  if (req.is('application/json')) return next();
  return next(erroHttp(415, 'Envie o arquivo como text/csv ou os dados como application/json.'));
}
