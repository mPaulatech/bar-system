import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const diretorioRaiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const processos = new Set();
let encerrando = false;

const servicos = [
  {
    nome: 'API',
    diretorio: path.join(diretorioRaiz, 'backend'),
    argumentos: ['--watch', '--env-file=.env', 'src/servidor.js'],
  },
  {
    nome: 'Interface',
    diretorio: path.join(diretorioRaiz, 'frontend'),
    argumentos: ['node_modules/vite/bin/vite.js'],
  },
];

function encerrar(codigo) {
  if (encerrando) return;

  encerrando = true;
  process.exitCode = codigo;

  for (const processo of processos) {
    if (processo.exitCode === null && processo.signalCode === null) {
      processo.kill();
    }
  }
}

for (const servico of servicos) {
  const processo = spawn(process.execPath, servico.argumentos, {
    cwd: servico.diretorio,
    stdio: 'inherit',
  });

  processos.add(processo);

  processo.on('error', (erro) => {
    console.error(`Não foi possível iniciar ${servico.nome}: ${erro.message}`);
    encerrar(1);
  });

  processo.on('exit', (codigo, sinal) => {
    processos.delete(processo);

    if (encerrando) return;

    if (sinal) {
      console.error(`${servico.nome} foi encerrada pelo sinal ${sinal}.`);
    } else if (codigo !== 0) {
      console.error(`${servico.nome} foi encerrada com o código ${codigo}.`);
    }

    const codigoSaida = sinal === 'SIGINT' ? 130 : sinal === 'SIGTERM' ? 143 : codigo ?? 1;
    encerrar(codigoSaida);
  });
}

process.on('SIGINT', () => encerrar(130));
process.on('SIGTERM', () => encerrar(143));

console.log('API e interface iniciadas. Pressione Ctrl+C para encerrar as duas.');
