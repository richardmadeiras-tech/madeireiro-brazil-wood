import test from 'node:test';
import assert from 'node:assert/strict';
import { criarServicoPacotes } from '../js/servicos/pacotes.js';
import { ErroDeRegra } from '../js/servicos/erro.js';
import { criarDadosDeTeste, prepararCenario } from './auxiliar.js';

async function montar() {
  const dados = criarDadosDeTeste();
  const cen = await prepararCenario(dados);
  return { dados, cen, pacotes: criarServicoPacotes(dados) };
}

const entrada = (cen, extra = {}) => ({
  tipo: 'MS', numero: '200', especieId: cen.especie.id, bitolaId: cen.bitola.id,
  localEstoqueId: cen.local.id, comprimento: '3', quantidade: '50', ...extra,
});

test('criar normaliza os campos', async () => {
  const { cen, pacotes } = await montar();
  const p = await pacotes.criar(entrada(cen, { numero: ' 200 ', peso: '' }));
  assert.equal(p.numero, '200');
  assert.equal(p.comprimento, 3);
  assert.equal(p.quantidade, 50);
  assert.equal(p.peso, null);
  assert.equal(p.somarAbono, false);
});

test('mesmo número no mesmo tipo é recusado, em outro tipo é aceito', async () => {
  const { cen, pacotes } = await montar();
  await assert.rejects(() => pacotes.criar(entrada(cen, { numero: '100' })), /Já existe o pacote MS número 100/);
  const pb = await pacotes.criar(entrada(cen, { tipo: 'PB', numero: '100' }));
  assert.equal(pb.tipo, 'PB');
});

test('recusa espécie, bitola, local ou origem que não existem', async () => {
  const { cen, pacotes } = await montar();
  await assert.rejects(() => pacotes.criar(entrada(cen, { especieId: 'nada' })), /espécie escolhida não existe/);
  await assert.rejects(() => pacotes.criar(entrada(cen, { bitolaId: 'nada' })), /bitola escolhida não existe/);
  await assert.rejects(() => pacotes.criar(entrada(cen, { localEstoqueId: 'nada' })), /local de estoque escolhido não existe/);
  await assert.rejects(() => pacotes.criar(entrada(cen, { pacoteOrigemId: 'nada' })), /pacote de origem não existe/);
});

test('FOCO: número digitado com ponto decimal chega como NaN e é recusado com mensagem', async () => {
  const { cen, pacotes } = await montar();
  await assert.rejects(
    () => pacotes.criar(entrada(cen, { comprimento: NaN })),
    (e) => e instanceof ErroDeRegra && /comprimento/.test(e.message),
  );
  await assert.rejects(() => pacotes.criar(entrada(cen, { quantidade: NaN })), /quantidade/);
  await assert.rejects(() => pacotes.criar(entrada(cen, { peso: NaN })), /peso/);
});

test('atualizar não deixa a quantidade ficar abaixo do que já foi baixado', async () => {
  const { dados, cen, pacotes } = await montar();
  await dados.itens.criar({ romaneioId: 'r1', pacoteId: cen.pacote.id, quantidadeBaixada: 40 });
  await assert.rejects(
    () => pacotes.atualizar(cen.pacote.id, entrada(cen, { numero: '100', quantidade: 30 })),
    /abaixo do que já foi baixado \(40\)/,
  );
  const ok = await pacotes.atualizar(cen.pacote.id, entrada(cen, { numero: '100', quantidade: 40 }));
  assert.equal(ok.quantidade, 40);
});

test('atualizar pacote inexistente dá erro de regra', async () => {
  const { cen, pacotes } = await montar();
  await assert.rejects(() => pacotes.atualizar('nada', entrada(cen)), ErroDeRegra);
});

test('excluir recusa pacote com baixa ou com passagem pela estufa e aceita pacote livre', async () => {
  const { dados, cen, pacotes } = await montar();
  await dados.itens.criar({ romaneioId: 'r1', pacoteId: cen.pacote.id, quantidadeBaixada: 1 });
  await assert.rejects(() => pacotes.excluir(cen.pacote.id), /já tem baixas/);

  const livre = await pacotes.criar(entrada(cen));
  await dados.passagens.criar({ pacoteId: livre.id, dtEntrada: '2026-10-10', dtSaida: '' });
  await assert.rejects(() => pacotes.excluir(livre.id), /estufa/);

  const outro = await pacotes.criar(entrada(cen, { numero: '300' }));
  await pacotes.excluir(outro.id);
  assert.equal((await dados.pacotes.listar()).length, 2);
});

test('listarComResumo calcula saldo, volumes e status de secagem', async () => {
  const { dados, cen, pacotes } = await montar();
  await dados.itens.criar({ romaneioId: 'r1', pacoteId: cen.pacote.id, quantidadeBaixada: 40 });
  let [r] = await pacotes.listarComResumo();
  assert.equal(r.saldo, 60);
  assert.equal(r.m3Bruto, 2.25);
  assert.equal(r.m3Saldo, 1.35);
  assert.equal(r.m3SaldoComercial, 1.35);
  assert.equal(r.statusSecagem, 'verde');
  assert.equal(r.especie.nome, 'Cumaru');
  assert.equal(r.bitola.largura, 15);
  assert.equal(r.local.nome, 'Pátio 1');

  await dados.passagens.criar({ pacoteId: cen.pacote.id, dtEntrada: '2026-10-10', dtSaida: '' });
  [r] = await pacotes.listarComResumo();
  assert.equal(r.statusSecagem, 'em_estufa');
});

test('listarComResumo ordena por tipo e número natural e não quebra com cadastro sumido', async () => {
  const { dados, cen, pacotes } = await montar();
  await pacotes.criar(entrada(cen, { numero: '20' }));
  await pacotes.criar(entrada(cen, { tipo: 'PB', numero: '1' }));
  await pacotes.criar(entrada(cen, { numero: '9' }));
  await dados.bitolas.excluir(cen.bitola.id);
  const nomes = (await pacotes.listarComResumo()).map((l) => `${l.pacote.tipo}${l.pacote.numero}`);
  assert.deepEqual(nomes, ['MS9', 'MS20', 'MS100', 'PB1']);
});
