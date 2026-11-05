import { z } from 'zod';

/**
 * Normaliza o CPF para o formato usado no banco.
 * @param {string} valor CPF com ou sem pontuação.
 * @returns {string} CPF com 11 dígitos.
 */
export function normalizarCpf(valor) {
  return valor.replace(/\D/g, '');
}

/**
 * Verifica os dígitos verificadores do CPF.
 * @param {string} valor CPF normalizado.
 * @returns {boolean} Se o CPF é matematicamente válido.
 */
export function cpfValido(valor) {
  if (!/^\d{11}$/.test(valor) || /^(\d)\1{10}$/.test(valor)) return false;

  let soma = 0;
  for (let indice = 0; indice < 9; indice += 1) soma += Number(valor[indice]) * (10 - indice);
  let digito = (soma * 10) % 11;
  if (digito === 10) digito = 0;
  if (digito !== Number(valor[9])) return false;

  soma = 0;
  for (let indice = 0; indice < 10; indice += 1) soma += Number(valor[indice]) * (11 - indice);
  digito = (soma * 10) % 11;
  if (digito === 10) digito = 0;
  return digito === Number(valor[10]);
}

export const esquemaCpf = z.string()
  .trim()
  .transform(normalizarCpf)
  .refine(cpfValido, 'CPF inválido.');

export const esquemaEmail = z.string()
  .trim()
  .toLowerCase()
  .email('E-mail inválido.');

export const esquemaNome = z.string()
  .trim()
  .min(1, 'Nome é obrigatório.');

const camposCliente = {
  nome: esquemaNome,
  cpf: esquemaCpf,
  email: esquemaEmail,
};

export const esquemaCriarCliente = z.object({
  corpo: z.object(camposCliente).strict(),
  parametros: z.object({}),
  consulta: z.object({}),
});

export const esquemaAtualizarCliente = z.object({
  corpo: z.object({
    nome: esquemaNome.optional(),
    email: esquemaEmail.optional(),
  }).strict().refine(
    (dados) => Object.keys(dados).length > 0,
    'Informe ao menos um campo para alterar.',
  ),
  parametros: z.object({ id: z.coerce.number().int().positive() }),
  consulta: z.object({}),
});

export const esquemaIdCliente = z.object({
  corpo: z.object({}),
  parametros: z.object({ id: z.coerce.number().int().positive() }),
  consulta: z.object({}),
});

export const esquemaCpfCliente = z.object({
  corpo: z.object({}),
  parametros: z.object({ cpf: esquemaCpf }),
  consulta: z.object({}),
});

export const esquemaListarClientes = z.object({
  corpo: z.object({}),
  parametros: z.object({}),
  consulta: z.object({
    nome: z.string().trim().min(1).optional(),
    cpf: esquemaCpf.optional(),
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().positive().max(100).default(20),
  }),
});
