import { COLECOES } from './colecoes.js';

export function criarArmazemMemoria() {
  let tabelas = Object.fromEntries(COLECOES.map((c) => [c, new Map()]));
  const tabela = (c) => {
    if (!tabelas[c]) throw new Error(`Coleção desconhecida: ${c}`);
    return tabelas[c];
  };
  return {
    async listar(c) {
      return [...tabela(c).values()].map((r) => structuredClone(r));
    },
    async obter(c, id) {
      const r = tabela(c).get(id);
      return r ? structuredClone(r) : null;
    },
    async gravar(c, registro) {
      tabela(c).set(registro.id, structuredClone(registro));
    },
    async exportarTudo() {
      return Object.fromEntries(COLECOES.map((c) => [c, [...tabelas[c].values()].map((r) => structuredClone(r))]));
    },
    async substituirTudo(dados) {
      tabelas = Object.fromEntries(
        COLECOES.map((c) => [c, new Map((dados[c] ?? []).map((r) => [r.id, structuredClone(r)]))]),
      );
    },
  };
}
