import { z } from 'zod';

const cpf = z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido.');
const cnpj = z.string().regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, 'CNPJ inválido.');
const email = z.string().trim().email('E-mail inválido.').transform((valor) => valor.toLowerCase());
const senha = z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.');

export const esquemaRegistro = z.object({
  corpo: z.object({
    nomeFantasia: z.string().trim().min(2),
    razaoSocial: z.string().trim().min(2),
    cnpj,
    emailContato: email,
    nomeGestor: z.string().trim().min(2),
    cpfGestor: cpf.optional(),
    emailGestor: email,
    senhaGestor: senha,
  }).strict(),
  parametros: z.object({}),
  consulta: z.object({}),
});

export const esquemaLogin = z.object({
  corpo: z.object({
    email,
    senha: z.string().min(1),
  }).strict(),
  parametros: z.object({}),
  consulta: z.object({}),
});

export function somenteDigitos(valor) {
  return valor.replace(/\D/g, '');
}
