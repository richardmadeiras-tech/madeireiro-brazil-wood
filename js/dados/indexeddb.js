import { COLECOES } from './colecoes.js';

function pedido(req) {
  return new Promise((ok, erro) => {
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
}

function transacao(db, nomes, modo, fn) {
  return new Promise((ok, erro) => {
    let tx;
    try {
      tx = db.transaction(nomes, modo, { durability: 'strict' });
    } catch (e) {
      erro(e);
      return;
    }
    let resultado;
    tx.oncomplete = () => ok(resultado);
    tx.onerror = () => erro(tx.error);
    tx.onabort = () => erro(tx.error || new Error('A gravação foi cancelada pelo navegador.'));
    Promise.resolve()
      .then(() => fn(tx))
      .then((r) => { resultado = r; }, (e) => { erro(e); try { tx.abort(); } catch { /* já encerrada */ } });
  });
}

function montar(db) {
  return {
    listar: (c) => transacao(db, [c], 'readonly', (tx) => pedido(tx.objectStore(c).getAll())),
    obter: async (c, id) => (await transacao(db, [c], 'readonly', (tx) => pedido(tx.objectStore(c).get(id)))) ?? null,
    gravar: (c, registro) => transacao(db, [c], 'readwrite', (tx) => { tx.objectStore(c).put(registro); }),
    exportarTudo: async () => {
      const saida = {};
      await transacao(db, COLECOES, 'readonly', async (tx) => {
        for (const c of COLECOES) saida[c] = await pedido(tx.objectStore(c).getAll());
      });
      return saida;
    },
    substituirTudo: (dados) => transacao(db, COLECOES, 'readwrite', (tx) => {
      for (const c of COLECOES) {
        const loja = tx.objectStore(c);
        loja.clear();
        for (const registro of dados[c] ?? []) loja.put(registro);
      }
    }),
  };
}

export function abrirArmazemIndexedDB(nome = 'madeireiro-brazil-wood') {
  return new Promise((ok, erro) => {
    if (typeof indexedDB === 'undefined') {
      erro(new Error('Este navegador não oferece armazenamento local.'));
      return;
    }
    const abrir = indexedDB.open(nome, 1);
    abrir.onupgradeneeded = () => {
      for (const c of COLECOES) abrir.result.createObjectStore(c, { keyPath: 'id' });
    };
    abrir.onerror = () => erro(abrir.error || new Error('O navegador não deixou abrir o armazenamento local.'));
    abrir.onblocked = () => erro(new Error('O armazenamento local está bloqueado por outra aba do app. Feche as outras abas.'));
    abrir.onsuccess = () => ok(montar(abrir.result));
  });
}
