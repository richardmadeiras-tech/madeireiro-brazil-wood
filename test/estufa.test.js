import test from 'node:test';
import assert from 'node:assert/strict';
import { criarServicoEstufa } from '../js/servicos/estufa.js';
import { criarServicoPacotes } from '../js/servicos/pacotes.js';
import { ErroDeRegra } from '../js/servicos/erro.js';
import { criarDadosDeTeste, prepararCenario } from './auxiliar.js';

async function montar() {
  const dados = criarDadosDeTeste();
  const cen = await prepararCenario(dados);
  const estufa = criarServicoEstufa(dados);
  const pacotes = criarServicoPacotes(dados);
  const status = async () => (await pacotes.listarComResumo())[0].statusSecagem;
  return { dados, cen, estufa, status };
}

const entrada = (cen, extra = {}) => ({
  pacoteId: cen.pacote.id, estufa: 'Estufa 1', dtEntrada: '2026-10-10', umidadeEntrada: '22', tipoSecagem: 'KD', ...extra,
});

test('entrar cria passagem aberta e o pacote fica em estufa', async () => {
  const { cen, estufa, status } = await montar();
  assert.equal(await status(), 'verde');
  const p = await estufa.entrar(entrada(cen));
  assert.equal(p.dtSaida, '');
  assert.equal(p.umidadeEntrada, 22);
  assert.equal(p.umidadeSaida, null);
  assert.equal(await status(), 'em_estufa');
});

test('o mesmo pacote não entra duas vezes sem sair', async () => {
  const { cen, estufa } = await montar();
  await estufa.entrar(entrada(cen));
  await assert.rejects(() => estufa.entrar(entrada(cen)), /já está em uma estufa/);
});

test('entrar valida pacote, estufa, data e umidade', async () => {
  const { cen, estufa } = await montar();
  await assert.rejects(() => estufa.entrar(entrada(cen, { pacoteId: 'nada' })), ErroDeRegra);
  await assert.rejects(() => estufa.entrar(entrada(cen, { estufa: '  ' })), /Informe a estufa/);
  await assert.rejects(() => estufa.entrar(entrada(cen, { dtEntrada: '10/10/2026' })), /data de entrada/);
  await assert.rejects(() => estufa.entrar(entrada(cen, { umidadeEntrada: 150 })), /entre 0 e 100/);
  await assert.rejects(() => estufa.entrar(entrada(cen, { umidadeEntrada: NaN })), /entre 0 e 100/);
  const semUmidade = await estufa.entrar(entrada(cen, { umidadeEntrada: '' }));
  assert.equal(semUmidade.umidadeEntrada, null);
});

test('sair registra data e umidade e o pacote fica seco', async () => {
  const { cen, estufa, status } = await montar();
  const p = await estufa.entrar(entrada(cen));
  const fechada = await estufa.sair(p.id, { dtSaida: '2026-10-14', umidadeSaida: '12' });
  assert.equal(fechada.dtSaida, '2026-10-14');
  assert.equal(fechada.umidadeSaida, 12);
  assert.equal(await status(), 'seco');
});

test('sair valida data, ordem das datas, umidade e saída repetida', async () => {
  const { cen, estufa } = await montar();
  const p = await estufa.entrar(entrada(cen));
  await assert.rejects(() => estufa.sair(p.id, { dtSaida: 'x', umidadeSaida: 12 }), /data de saída/);
  await assert.rejects(() => estufa.sair(p.id, { dtSaida: '2026-10-09', umidadeSaida: 12 }), /antes da entrada/);
  await assert.rejects(() => estufa.sair(p.id, { dtSaida: '2026-10-14', umidadeSaida: '' }), /umidade de saída/);
  await assert.rejects(() => estufa.sair(p.id, { dtSaida: '2026-10-14', umidadeSaida: 101 }), /entre 0 e 100/);
  await estufa.sair(p.id, { dtSaida: '2026-10-14', umidadeSaida: 12 });
  await assert.rejects(() => estufa.sair(p.id, { dtSaida: '2026-10-15', umidadeSaida: 12 }), /já saiu/);
  await assert.rejects(() => estufa.sair('nada', { dtSaida: '2026-10-15', umidadeSaida: 12 }), /não encontrada/);
});

test('pacote seco pode voltar para a estufa', async () => {
  const { cen, estufa, status } = await montar();
  const p = await estufa.entrar(entrada(cen));
  await estufa.sair(p.id, { dtSaida: '2026-10-14', umidadeSaida: 12 });
  await estufa.entrar(entrada(cen, { dtEntrada: '2026-10-20' }));
  assert.equal(await status(), 'em_estufa');
});
