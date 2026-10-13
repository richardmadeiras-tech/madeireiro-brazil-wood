import test from 'node:test';
import assert from 'node:assert/strict';
import { criarServicos } from '../js/servicos/index.js';
import { criarDadosDeTeste, prepararCenario } from './auxiliar.js';

async function montar() {
  const dados = criarDadosDeTeste();
  const cen = await prepararCenario(dados);
  return { dados, cen, servicos: criarServicos(dados) };
}

const novoRomaneio = (cen) => ({ data: '2026-10-13', clienteId: cen.cliente.id, placa: 'ABC1D23' });

test('duas baixas concorrentes do mesmo pacote: uma passa, a outra é recusada e o saldo fica em 0', async () => {
  const { cen, servicos } = await montar();
  const r1 = await servicos.romaneios.criar(novoRomaneio(cen));
  const r2 = await servicos.romaneios.criar(novoRomaneio(cen));
  const resultados = await Promise.allSettled([
    servicos.romaneios.adicionarItem(r1.id, { pacoteId: cen.pacote.id, quantidade: 100 }),
    servicos.romaneios.adicionarItem(r2.id, { pacoteId: cen.pacote.id, quantidade: 100 }),
  ]);
  assert.deepEqual(resultados.map((r) => r.status).sort(), ['fulfilled', 'rejected']);
  const [resumo] = await servicos.pacotes.listarComResumo();
  assert.equal(resumo.saldo, 0);
});

test('dois romaneios criados ao mesmo tempo recebem números diferentes', async () => {
  const { cen, servicos } = await montar();
  const [a, b] = await Promise.all([
    servicos.romaneios.criar(novoRomaneio(cen)),
    servicos.romaneios.criar(novoRomaneio(cen)),
  ]);
  assert.deepEqual([a.numero, b.numero].sort(), [1, 2]);
});

test('dois pacotes com o mesmo número criados ao mesmo tempo: só um é aceito', async () => {
  const { cen, servicos } = await montar();
  const p = () => servicos.pacotes.criar({
    tipo: 'PB', numero: '7', especieId: cen.especie.id, bitolaId: cen.bitola.id,
    localEstoqueId: cen.local.id, comprimento: '3', quantidade: '10',
  });
  const resultados = await Promise.allSettled([p(), p()]);
  assert.deepEqual(resultados.map((r) => r.status).sort(), ['fulfilled', 'rejected']);
});

test('cadastros também entram na fila: nome repetido concorrente é recusado', async () => {
  const { servicos } = await montar();
  const resultados = await Promise.allSettled([
    servicos.cadastros.locais.criar({ nome: 'Pátio 2' }),
    servicos.cadastros.locais.criar({ nome: 'Pátio 2' }),
  ]);
  assert.deepEqual(resultados.map((r) => r.status).sort(), ['fulfilled', 'rejected']);
});

test('uma chamada que falha não trava a fila', async () => {
  const { cen, servicos } = await montar();
  await assert.rejects(() => servicos.romaneios.criar({ ...novoRomaneio(cen), clienteId: '' }));
  const r = await servicos.romaneios.criar(novoRomaneio(cen));
  assert.equal(r.numero, 1);
});

test('métodos de leitura não passam pela fila e continuam funcionando', async () => {
  const { servicos } = await montar();
  assert.equal((await servicos.pacotes.listarComResumo()).length, 1);
  assert.equal((await servicos.cadastros.especies.listar()).length, 1);
});
