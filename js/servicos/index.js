import { criarServicoCadastros } from './cadastros.js';
import { criarServicoPacotes } from './pacotes.js';
import { criarServicoEstufa } from './estufa.js';
import { criarServicoRomaneios } from './romaneios.js';

const MUTANTES = new Set([
  'criar', 'atualizar', 'excluir', 'adicionarItem', 'removerItem', 'finalizar', 'reabrir', 'entrar', 'sair',
]);

export function criarServicos(dados) {
  // Uma única fila para todas as gravações: cada uma só começa depois que a anterior terminou.
  // Sem isso, dois toques seguidos passam na conferência antes de qualquer um gravar.
  // Atenção: um método da fila não pode chamar outro método da fila (travaria para sempre).
  let fila = Promise.resolve();
  const travar = (obj) => {
    for (const [nome, fn] of Object.entries(obj)) {
      if (typeof fn === 'function' && MUTANTES.has(nome)) {
        obj[nome] = (...args) => {
          const resultado = fila.then(() => fn(...args));
          fila = resultado.catch(() => {});
          return resultado;
        };
      }
    }
    return obj;
  };
  const cadastros = criarServicoCadastros(dados);
  for (const sub of Object.values(cadastros)) travar(sub);
  return {
    cadastros,
    pacotes: travar(criarServicoPacotes(dados)),
    estufa: travar(criarServicoEstufa(dados)),
    romaneios: travar(criarServicoRomaneios(dados)),
  };
}
