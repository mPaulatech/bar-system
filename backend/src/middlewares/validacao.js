import { erroHttp } from '../utilitarios/erro-http.js';

export function validar(esquema) {
  return (req, res, next) => {
    const resultado = esquema.safeParse({
      corpo: req.body ?? {},
      parametros: req.params,
      consulta: req.query,
    });

    if (!resultado.success) {
      return next(erroHttp(400, 'Dados inválidos.', resultado.error.flatten()));
    }

    req.body = resultado.data.corpo;
    req.params = resultado.data.parametros;
    req.validado = resultado.data;
    return next();
  };
}
