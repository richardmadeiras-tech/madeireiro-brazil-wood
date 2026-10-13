import test from 'node:test';
import assert from 'node:assert/strict';
import { criarServicoCadastros } from '../js/servicos/cadastros.js';
import { ErroDeRegra } from '../js/servicos/erro.js';
import { normalizarPlaca } from '../js/regras/cadastros.js';
import { criarDadosDeTeste, prepararCenario } from './auxiliar.js';

const montar = () => {
  const dados = criarDadosDeTeste();
  return { dados, cad: criarServicoCadastros(dados) };
};

test('normalizarPlaca deixa maiúsculas sem traço', () => {
  assert.equal(normalizarPlaca('abc-1d23'), 'ABC1D23');
  assert.equal(normalizarPlaca(null), '');
});

test('cria espécie com espaços aparados', async () => {
  const { cad } = montar();
  const e = await cad.especies.criar({ nome: '  Cumaru ' });
  assert.equal(e.nome, 'Cumaru');
  assert.equal(e.nomeCientifico, '');
});

test('recusa espécie sem nome com ErroDeRegra', async () => {
  const { cad } = montar();
  await assert.rejects(
    () => cad.especies.criar({ nome: '  ' }),
    (e) => e instanceof ErroDeRegra && /nome da espécie/.test(e.message),
  );
});

test('recusa espécie repetida ignorando maiúsculas, mas deixa editar o próprio registro', async () => {
  const { cad } = montar();
  const e = await cad.especies.criar({ nome: 'Cumaru' });
  await assert.rejects(() => cad.especies.criar({ nome: 'cumaru' }), /Já existe/);
  const igual = await cad.especies.atualizar(e.id, { nome: 'Cumaru', apelido: 'Ipê-cumaru' });
  assert.equal(igual.apelido, 'Ipê-cumaru');
});

test('bitola exige medidas positivas e recusa repetida', async () => {
  const { cad } = montar();
  await assert.rejects(() => cad.bitolas.criar({ espessura: NaN, largura: 15 }), ErroDeRegra);
  await assert.rejects(() => cad.bitolas.criar({ espessura: 0, largura: 15 }), ErroDeRegra);
  const b = await cad.bitolas.criar({ espessura: '5', largura: 15 });
  assert.equal(b.espessura, 5);
  await assert.rejects(() => cad.bitolas.criar({ espessura: 5, largura: 15 }), /Já existe/);
  assert.equal(cad.bitolas.descricao(b), '5 x 15 cm');
});

test('pessoa exige nome e tipo válido', async () => {
  const { cad } = montar();
  await assert.rejects(() => cad.pessoas.criar({ nome: 'Ana', tipo: 'outro' }), ErroDeRegra);
  const p = await cad.pessoas.criar({ nome: 'Ana', tipo: 'cliente' });
  assert.equal(p.tipo, 'cliente');
});

test('placa é normalizada e placa repetida é recusada mesmo escrita diferente', async () => {
  const { cad } = montar();
  const v = await cad.veiculos.criar({ placa: 'abc-1d23' });
  assert.equal(v.placa, 'ABC1D23');
  await assert.rejects(() => cad.veiculos.criar({ placa: 'ABC1D23' }), /Já existe/);
  await assert.rejects(() => cad.veiculos.criar({ placa: '--' }), ErroDeRegra);
});

test('não exclui item em uso, mas exclui item livre', async () => {
  const { dados, cad } = montar();
  const cen = await prepararCenario(dados);
  await assert.rejects(() => cad.especies.excluir(cen.especie.id), /em uso/);
  await assert.rejects(() => cad.bitolas.excluir(cen.bitola.id), /em uso/);
  await assert.rejects(() => cad.locais.excluir(cen.local.id), /em uso/);
  const livre = await cad.especies.criar({ nome: 'Ipê' });
  await cad.especies.excluir(livre.id);
  assert.equal((await cad.especies.listar()).length, 1);
});

test('não exclui cliente nem veículo usados em romaneio ativo', async () => {
  const { dados, cad } = montar();
  const cen = await prepararCenario(dados);
  const v = await cad.veiculos.criar({ placa: 'AAA1A11' });
  await dados.romaneios.criar({ numero: 1, data: '2026-10-13', clienteId: cen.cliente.id, veiculoId: v.id, status: 'aberto' });
  await assert.rejects(() => cad.pessoas.excluir(cen.cliente.id), /em uso/);
  await assert.rejects(() => cad.veiculos.excluir(v.id), /em uso/);
});
