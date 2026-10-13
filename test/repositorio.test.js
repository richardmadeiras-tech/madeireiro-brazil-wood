import test from 'node:test';
import assert from 'node:assert/strict';
import { criarArmazemMemoria } from '../js/dados/memoria.js';
import { criarDados } from '../js/dados/index.js';
import { COLECOES } from '../js/dados/colecoes.js';
import { criarDadosDeTeste } from './auxiliar.js';

test('criar grava com id e carimbos', async () => {
  const dados = criarDadosDeTeste();
  const e = await dados.especies.criar({ nome: 'Ipê' });
  assert.equal(e.id, 'id-1');
  assert.equal(e.criadoEm, '2026-10-13T12:00:00.000Z');
  assert.equal(e.alteradoEm, '2026-10-13T12:00:00.000Z');
  assert.equal(e.excluidoEm, null);
  assert.deepEqual(await dados.especies.obter(e.id), e);
});

test('ids padrão são textos únicos mesmo sem crypto.randomUUID (página aberta por http no celular)', async () => {
  const dados = criarDados(criarArmazemMemoria());
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
  try {
    const a = await dados.especies.criar({ nome: 'A' });
    const b = await dados.especies.criar({ nome: 'B' });
    assert.equal(typeof a.id, 'string');
    assert.ok(a.id.length >= 10);
    assert.notEqual(a.id, b.id);
  } finally {
    Object.defineProperty(globalThis, 'crypto', original);
  }
  const c = await dados.especies.criar({ nome: 'C' });
  assert.match(c.id, /^[0-9a-f-]{36}$/);
});

test('obter devolve null quando não existe', async () => {
  assert.equal(await criarDadosDeTeste().especies.obter('nada'), null);
});

test('o que se devolve é cópia: alterar o resultado não altera o armazém', async () => {
  const dados = criarDadosDeTeste();
  const e = await dados.especies.criar({ nome: 'Ipê' });
  e.nome = 'Outro';
  assert.equal((await dados.especies.obter(e.id)).nome, 'Ipê');
});

test('atualizar mantém id e criadoEm e muda alteradoEm', async () => {
  let t = 0;
  const dados = criarDados(criarArmazemMemoria(), { agora: () => `t${++t}`, novoId: () => 'x' });
  const e = await dados.especies.criar({ nome: 'Ipê' });
  const novo = await dados.especies.atualizar(e.id, { nome: 'Ipê amarelo', id: 'outro', criadoEm: 'falso' });
  assert.equal(novo.id, 'x');
  assert.equal(novo.criadoEm, 't1');
  assert.equal(novo.alteradoEm, 't2');
  assert.equal(novo.nome, 'Ipê amarelo');
});

test('atualizar registro inexistente dá erro', async () => {
  await assert.rejects(() => criarDadosDeTeste().especies.atualizar('nada', {}), /não encontrado/);
});

test('excluir é lógico: some da lista, continua com incluirExcluidos e pode voltar', async () => {
  const dados = criarDadosDeTeste();
  const e = await dados.especies.criar({ nome: 'Ipê' });
  await dados.especies.excluir(e.id);
  assert.equal((await dados.especies.listar()).length, 0);
  assert.equal((await dados.especies.listar({ incluirExcluidos: true })).length, 1);
  await dados.especies.restaurar(e.id);
  assert.equal((await dados.especies.listar()).length, 1);
});

test('FOCO: falha ao gravar avisa o erro e não deixa nada gravado', async () => {
  const armazem = criarArmazemMemoria();
  armazem.gravar = async () => { throw new Error('disco cheio'); };
  const dados = criarDados(armazem);
  await assert.rejects(() => dados.especies.criar({ nome: 'Ipê' }), /disco cheio/);
  assert.equal((await dados.especies.listar()).length, 0);
});

test('substituirTudo troca todo o conteúdo e exportarTudo lista todas as coleções', async () => {
  const dados = criarDadosDeTeste();
  await dados.especies.criar({ nome: 'Ipê' });
  await dados.armazem.substituirTudo({ bitolas: [{ id: 'b', espessura: 1, largura: 2 }] });
  const tudo = await dados.armazem.exportarTudo();
  assert.deepEqual(Object.keys(tudo).sort(), [...COLECOES].sort());
  assert.equal(tudo.especies.length, 0);
  assert.equal(tudo.bitolas.length, 1);
});

test('coleção desconhecida dá erro', async () => {
  await assert.rejects(() => criarArmazemMemoria().listar('coisas'), /Coleção desconhecida/);
});
