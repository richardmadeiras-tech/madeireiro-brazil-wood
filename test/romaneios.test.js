import test from 'node:test';
import assert from 'node:assert/strict';
import { criarServicoRomaneios } from '../js/servicos/romaneios.js';
import { criarServicoPacotes } from '../js/servicos/pacotes.js';
import { ErroDeRegra } from '../js/servicos/erro.js';
import { criarDadosDeTeste, prepararCenario } from './auxiliar.js';

async function montar() {
  const dados = criarDadosDeTeste();
  const cen = await prepararCenario(dados);
  const romaneios = criarServicoRomaneios(dados);
  const saldo = async () => (await criarServicoPacotes(dados).listarComResumo())[0].saldo;
  return { dados, cen, romaneios, saldo };
}

const entrada = (cen, extra = {}) => ({ data: '2026-10-13', clienteId: cen.cliente.id, placa: 'abc-1d23', ...extra });

test('cria romaneios numerados em sequência, abertos, com placa normalizada', async () => {
  const { cen, romaneios } = await montar();
  const a = await romaneios.criar(entrada(cen));
  const b = await romaneios.criar(entrada(cen));
  assert.equal(a.numero, 1);
  assert.equal(b.numero, 2);
  assert.equal(a.status, 'aberto');
  assert.equal(a.placa, 'ABC1D23');
});

test('usa a placa do veículo quando a placa não é digitada', async () => {
  const { dados, cen, romaneios } = await montar();
  const v = await dados.veiculos.criar({ placa: 'XYZ9K88' });
  const r = await romaneios.criar(entrada(cen, { placa: '', veiculoId: v.id }));
  assert.equal(r.placa, 'XYZ9K88');
});

test('recusa romaneio sem cliente, sem data ou com cliente que não existe', async () => {
  const { cen, romaneios } = await montar();
  await assert.rejects(() => romaneios.criar(entrada(cen, { clienteId: '' })), ErroDeRegra);
  await assert.rejects(() => romaneios.criar(entrada(cen, { data: '' })), ErroDeRegra);
  await assert.rejects(() => romaneios.criar(entrada(cen, { clienteId: 'nada' })), /cliente escolhido não existe/);
});

test('baixa parcial reduz o saldo e calcula os m³ do romaneio', async () => {
  const { cen, romaneios, saldo } = await montar();
  const r = await romaneios.criar(entrada(cen));
  await romaneios.adicionarItem(r.id, { pacoteId: cen.pacote.id, quantidade: '40' });
  const d = await romaneios.detalhar(r.id);
  assert.equal(d.totais.pecas, 40);
  assert.equal(d.totais.m3Bruto, 0.9);
  assert.equal(d.linhas[0].especie.nome, 'Cumaru');
  assert.equal(d.cliente.nome, 'Cliente Teste');
  assert.equal(await saldo(), 60);
});

test('FOCO: dois romaneios abertos não baixam mais que o saldo juntos', async () => {
  const { cen, romaneios, saldo } = await montar();
  const r1 = await romaneios.criar(entrada(cen));
  const r2 = await romaneios.criar(entrada(cen));
  await romaneios.adicionarItem(r1.id, { pacoteId: cen.pacote.id, quantidade: 70 });
  await assert.rejects(() => romaneios.adicionarItem(r2.id, { pacoteId: cen.pacote.id, quantidade: 40 }), /só tem 30/);
  await romaneios.adicionarItem(r2.id, { pacoteId: cen.pacote.id, quantidade: 30 });
  assert.equal(await saldo(), 0);
});

test('o mesmo pacote não entra duas vezes no mesmo romaneio e quantidade inválida é recusada', async () => {
  const { cen, romaneios } = await montar();
  const r = await romaneios.criar(entrada(cen));
  await romaneios.adicionarItem(r.id, { pacoteId: cen.pacote.id, quantidade: 10 });
  await assert.rejects(() => romaneios.adicionarItem(r.id, { pacoteId: cen.pacote.id, quantidade: 5 }), /já está neste romaneio/);
  const r2 = await romaneios.criar(entrada(cen));
  for (const q of [0, 2.5, NaN, '']) {
    await assert.rejects(() => romaneios.adicionarItem(r2.id, { pacoteId: cen.pacote.id, quantidade: q }), ErroDeRegra);
  }
  await assert.rejects(() => romaneios.adicionarItem(r2.id, { pacoteId: 'nada', quantidade: 1 }), /Escolha um pacote/);
});

test('remover item devolve o saldo e permite incluir o pacote de novo', async () => {
  const { cen, romaneios, saldo } = await montar();
  const r = await romaneios.criar(entrada(cen));
  const item = await romaneios.adicionarItem(r.id, { pacoteId: cen.pacote.id, quantidade: 40 });
  await romaneios.removerItem(item.id);
  assert.equal(await saldo(), 100);
  await romaneios.adicionarItem(r.id, { pacoteId: cen.pacote.id, quantidade: 100 });
  assert.equal(await saldo(), 0);
});

test('finalizar exige item, trava alterações e reabrir libera', async () => {
  const { cen, romaneios } = await montar();
  const r = await romaneios.criar(entrada(cen));
  await assert.rejects(() => romaneios.finalizar(r.id), /ao menos um pacote/);
  const item = await romaneios.adicionarItem(r.id, { pacoteId: cen.pacote.id, quantidade: 10 });
  const f = await romaneios.finalizar(r.id, '2026-10-14');
  assert.equal(f.status, 'finalizado');
  assert.equal(f.dtFinalizacao, '2026-10-14');
  await assert.rejects(() => romaneios.adicionarItem(r.id, { pacoteId: cen.pacote.id, quantidade: 1 }), /finalizado/);
  await assert.rejects(() => romaneios.removerItem(item.id), /finalizado/);
  await assert.rejects(() => romaneios.atualizar(r.id, entrada(cen)), /finalizado/);
  const reaberto = await romaneios.reabrir(r.id);
  assert.equal(reaberto.status, 'aberto');
  assert.equal(reaberto.dtFinalizacao, '');
  await romaneios.removerItem(item.id);
});

test('atualizar romaneio aberto troca os dados', async () => {
  const { cen, romaneios } = await montar();
  const r = await romaneios.criar(entrada(cen));
  const novo = await romaneios.atualizar(r.id, entrada(cen, { notaFiscal: ' 123 ', dof: 'D1' }));
  assert.equal(novo.notaFiscal, '123');
  assert.equal(novo.numero, 1);
});

test('FOCO: excluir romaneio aberto devolve o saldo e some das listas; finalizado não exclui', async () => {
  const { cen, romaneios, saldo } = await montar();
  const r = await romaneios.criar(entrada(cen));
  await romaneios.adicionarItem(r.id, { pacoteId: cen.pacote.id, quantidade: 40 });
  await romaneios.excluir(r.id);
  assert.equal(await saldo(), 100);
  assert.equal((await romaneios.listarResumo()).length, 0);
  await assert.rejects(() => romaneios.detalhar(r.id), /não encontrado/);

  const r2 = await romaneios.criar(entrada(cen));
  await romaneios.adicionarItem(r2.id, { pacoteId: cen.pacote.id, quantidade: 5 });
  await romaneios.finalizar(r2.id);
  await assert.rejects(() => romaneios.excluir(r2.id), /finalizado/);
});

test('listarResumo traz cliente e totais, do número maior para o menor', async () => {
  const { cen, romaneios } = await montar();
  const a = await romaneios.criar(entrada(cen));
  await romaneios.criar(entrada(cen));
  await romaneios.adicionarItem(a.id, { pacoteId: cen.pacote.id, quantidade: 40 });
  const resumo = await romaneios.listarResumo();
  assert.deepEqual(resumo.map((x) => x.romaneio.numero), [2, 1]);
  assert.equal(resumo[1].cliente.nome, 'Cliente Teste');
  assert.equal(resumo[1].totais.pecas, 40);
});

test('a placa sempre acompanha o veículo escolhido', async () => {
  const { dados, cen, romaneios } = await montar();
  const a = await dados.veiculos.criar({ placa: 'AAA1A11' });
  const b = await dados.veiculos.criar({ placa: 'BBB2B22' });
  const r = await romaneios.criar(entrada(cen, { placa: '', veiculoId: a.id }));
  assert.equal(r.placa, 'AAA1A11');
  const atualizado = await romaneios.atualizar(r.id, entrada(cen, { placa: r.placa, veiculoId: b.id }));
  assert.equal(atualizado.placa, 'BBB2B22');
});
