import { GoogleGenAI } from '@google/genai';

const MODELOS_GEMINI = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash-lite',
];

function extrairItens(valor, itens = []) {
  if (typeof valor === 'string' && valor.trim()) {
    itens.push({ nome: valor.trim(), categoria: null });
    return itens;
  }
  if (Array.isArray(valor)) {
    valor.forEach((item) => extrairItens(item, itens));
    return itens;
  }
  if (!valor || typeof valor !== 'object') return itens;
  const nome = valor.nome ?? valor.name ?? valor.produto ?? valor.item ?? valor.descricao;
  const categoria = valor.categoria ?? valor.category ?? valor.tipo ?? null;
  if (typeof nome === 'string' && nome.trim()) {
    itens.push({ nome: nome.trim(), categoria: typeof categoria === 'string' ? categoria.trim() : null });
    return itens;
  }
  Object.values(valor).forEach((filho) => extrairItens(filho, itens));
  return itens;
}

async function obterItensCardapio(prisma, estabelecimentoId) {
  if (!prisma?.vendaConsumoApi || !Number.isInteger(estabelecimentoId)) return [];
  const vendas = await prisma.vendaConsumoApi.findMany({
    where: { estabelecimentoId }, select: { itens: true }, orderBy: { criadoEm: 'desc' }, take: 500,
  });
  const unicos = new Map();
  vendas.flatMap((venda) => extrairItens(venda.itens)).forEach((item) => {
    const chave = `${item.nome.toLocaleLowerCase()}|${item.categoria?.toLocaleLowerCase() ?? ''}`;
    if (!unicos.has(chave)) unicos.set(chave, item);
  });
  return [...unicos.values()];
}

export async function getSugestao(mensagem, contexto = {}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada.');
  const itens = await obterItensCardapio(contexto.prisma, contexto.estabelecimentoId);
  const cardapio = itens.length
    ? itens.map(({ nome, categoria }) => `- ${nome}${categoria ? ` (${categoria})` : ''}`).join('\n')
    : '(Nenhum item de cardápio foi registrado ainda.)';
  const systemPrompt = [
    'Você é o assistente de sugestões do bar Dona Bier.',
    'Sugira combinações e itens do cardápio de forma objetiva, simpática e em português brasileiro.',
    'Use exclusivamente os itens listados no cardápio abaixo. Nunca invente produtos, sabores ou categorias.',
    'Se o cardápio não tiver itens adequados ao pedido, diga isso claramente e peça outra preferência.',
    `Cardápio disponível:\n${cardapio}`,
  ].join('\n\n');
  const cliente = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: 30_000 },
  });
  let ultimoErro;
  let resposta;
  for (const modelo of MODELOS_GEMINI) {
    try {
      resposta = await cliente.models.generateContent({
        model: modelo,
        contents: mensagem,
        config: { systemInstruction: systemPrompt, temperature: 0.7 },
      });
      break;
    } catch (erro) {
      ultimoErro = erro;
    }
  }
  if (!resposta) {
    const detalhe = ultimoErro instanceof Error ? ultimoErro.message : String(ultimoErro);
    const erro = new Error(`Não foi possível consultar a API Gemini: ${detalhe}`);
    const codigo = ultimoErro?.status ?? ultimoErro?.code;
    if (Number.isInteger(codigo) && codigo >= 400 && codigo < 600) erro.status = codigo;
    throw erro;
  }
  const conteudo = resposta.text;
  if (typeof conteudo !== 'string' || !conteudo.trim()) throw new Error('A API Gemini não retornou uma sugestão.');
  return conteudo.trim();
}
