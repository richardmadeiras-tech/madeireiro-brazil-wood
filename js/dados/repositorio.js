function gerarId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const parte = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${parte()}-${parte()}`;
}

export function criarRepositorio(
  armazem,
  colecao,
  { agora = () => new Date().toISOString(), novoId = gerarId } = {},
) {
  const repo = {
    async criar(dados) {
      const t = agora();
      const registro = { ...dados, id: novoId(), criadoEm: t, alteradoEm: t, excluidoEm: null };
      await armazem.gravar(colecao, registro);
      return registro;
    },
    obter(id) {
      return armazem.obter(colecao, id);
    },
    async listar({ incluirExcluidos = false } = {}) {
      const todos = await armazem.listar(colecao);
      return incluirExcluidos ? todos : todos.filter((r) => !r.excluidoEm);
    },
    async atualizar(id, mudancas) {
      const atual = await armazem.obter(colecao, id);
      if (!atual) throw new Error('Registro não encontrado.');
      const registro = { ...atual, ...mudancas, id: atual.id, criadoEm: atual.criadoEm, alteradoEm: agora() };
      await armazem.gravar(colecao, registro);
      return registro;
    },
    excluir(id) {
      return repo.atualizar(id, { excluidoEm: agora() });
    },
    restaurar(id) {
      return repo.atualizar(id, { excluidoEm: null });
    },
  };
  return repo;
}
