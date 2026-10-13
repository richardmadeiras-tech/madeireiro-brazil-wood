import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_BACKUP, VERSAO_BACKUP, exportarBackup, validarBackup, resumirImportacao, importarBackup, precisaLembrarBackup,
} from '../js/dados/backup.js';
import { criarDadosDeTeste, prepararCenario } from './auxiliar.js';

test('exportar e importar devolvem os mesmos dados, inclusive excluídos', async () => {
  const dados = criarDadosDeTeste();
  const cen = await prepararCenario(dados);
  const apagada = await dados.especies.criar({ nome: 'Apagada' });
  await dados.especies.excluir(apagada.id);
  const backup = await exportarBackup(dados.armazem, () => '2026-10-13T12:00:00.000Z');
  assert.equal(backup.app, APP_BACKUP);
  assert.equal(backup.versao, VERSAO_BACKUP);
  assert.equal(backup.exportadoEm, '2026-10-13T12:00:00.000Z');

  const outros = criarDadosDeTeste();
  await importarBackup(outros.armazem, JSON.parse(JSON.stringify(backup)));
  assert.equal((await outros.pacotes.obter(cen.pacote.id)).numero, '100');
  assert.equal((await outros.especies.listar({ incluirExcluidos: true })).length, 2);
  assert.equal((await outros.especies.listar()).length, 1);
});

test('importar substitui o que havia antes', async () => {
  const origem = criarDadosDeTeste();
  await origem.especies.criar({ nome: 'Só no backup' });
  const backup = await exportarBackup(origem.armazem);
  const destino = criarDadosDeTeste();
  await prepararCenario(destino);
  await importarBackup(destino.armazem, backup);
  assert.equal((await destino.pacotes.listar()).length, 0);
  assert.equal((await destino.especies.listar()).length, 1);
});

test('validarBackup aceita um backup bom', async () => {
  const dados = criarDadosDeTeste();
  assert.deepEqual(validarBackup(await exportarBackup(dados.armazem)), []);
});

test('FOCO: backup corrompido ou de outro app é recusado e os dados atuais ficam intactos', async () => {
  const dados = criarDadosDeTeste();
  await prepararCenario(dados);
  const bom = await exportarBackup(dados.armazem);

  const ruins = [
    null,
    'texto solto',
    {},
    { ...bom, app: 'outro-app' },
    { ...bom, versao: 99 },
    { ...bom, versao: 'x' },
    { ...bom, colecoes: null },
    { ...bom, colecoes: { ...bom.colecoes, pacotes: 'não é lista' } },
    { ...bom, colecoes: { ...bom.colecoes, pacotes: [{ semId: true }] } },
  ];
  for (const ruim of ruins) {
    assert.ok(validarBackup(ruim).length > 0, `deveria recusar ${JSON.stringify(ruim)?.slice(0, 40)}`);
    await assert.rejects(() => importarBackup(dados.armazem, ruim));
  }
  assert.equal((await dados.pacotes.listar()).length, 1, 'os dados atuais não podem mudar');
  assert.equal((await dados.especies.listar()).length, 1);
});

test('resumirImportacao compara registros ativos de agora e do backup', async () => {
  const dados = criarDadosDeTeste();
  await prepararCenario(dados);
  const vazio = criarDadosDeTeste();
  const backupVazio = await exportarBackup(vazio.armazem);
  const resumo = await resumirImportacao(dados.armazem, backupVazio);
  const pacotes = resumo.find((r) => r.colecao === 'pacotes');
  assert.deepEqual(pacotes, { colecao: 'pacotes', atuais: 1, noBackup: 0 });
});

test('precisaLembrarBackup: nunca, recente e antigo', () => {
  const agora = '2026-10-13T12:00:00.000Z';
  assert.equal(precisaLembrarBackup(null, agora), true);
  assert.equal(precisaLembrarBackup('2026-10-12T12:00:00.000Z', agora), false);
  assert.equal(precisaLembrarBackup('2026-10-06T12:00:00.000Z', agora), true);
  assert.equal(precisaLembrarBackup('2026-10-06T12:00:01.000Z', agora), false);
  assert.equal(precisaLembrarBackup('2026-10-10T12:00:00.000Z', agora, 3), true);
});

test('precisaLembrarBackup: data ilegível ou no futuro pede backup', () => {
  const agora = '2026-10-13T12:00:00.000Z';
  assert.equal(precisaLembrarBackup('lixo', agora), true);
  assert.equal(precisaLembrarBackup('2027-01-01T00:00:00.000Z', agora), true);
  assert.equal(precisaLembrarBackup('2026-10-12T12:00:00.000Z', 'lixo'), true);
});
