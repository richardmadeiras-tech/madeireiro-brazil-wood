import test from 'node:test';
import assert from 'node:assert/strict';
import { filtrarEstoque, totaisEstoque } from '../js/regras/estoque.js';

const linhas = [
  { pacote: { tipo: 'MS', especieId: 'e1', bitolaId: 'b1', localEstoqueId: 'l1', qualidade: 'Primeira' }, saldo: 60, statusSecagem: 'seco', m3Saldo: 1.35, m3SaldoComercial: 1.5 },
  { pacote: { tipo: 'PB', especieId: 'e2', bitolaId: 'b1', localEstoqueId: '', qualidade: 'Segunda' }, saldo: 0, statusSecagem: 'verde', m3Saldo: 0, m3SaldoComercial: 0 },
  { pacote: { tipo: 'MS', especieId: 'e2', bitolaId: 'b2', localEstoqueId: 'l1' }, saldo: 10, statusSecagem: 'verde', m3Saldo: 0.5, m3SaldoComercial: 0.5 },
];

test('por padrão esconde pacotes sem saldo', () => {
  assert.equal(filtrarEstoque(linhas).length, 2);
});

test('incluirZerados traz tudo', () => {
  assert.equal(filtrarEstoque(linhas, { incluirZerados: true }).length, 3);
});

test('filtra por espécie, tipo, local e secagem', () => {
  assert.equal(filtrarEstoque(linhas, { especieId: 'e2' }).length, 1);
  assert.equal(filtrarEstoque(linhas, { tipo: 'MS' }).length, 2);
  assert.equal(filtrarEstoque(linhas, { localId: 'l1', statusSecagem: 'seco' }).length, 1);
  assert.equal(filtrarEstoque(linhas, { bitolaId: 'b2' }).length, 1);
});

test('filtro vazio ("") não filtra', () => {
  assert.equal(filtrarEstoque(linhas, { especieId: '', tipo: '', qualidade: '' }).length, 2);
});

test('qualidade ignora maiúsculas e não quebra com pacote sem qualidade', () => {
  assert.equal(filtrarEstoque(linhas, { qualidade: 'prim' }).length, 1);
  assert.equal(filtrarEstoque(linhas, { qualidade: 'zzz' }).length, 0);
});

test('totaisEstoque soma saldo e volumes das linhas visíveis', () => {
  const t = totaisEstoque(filtrarEstoque(linhas));
  assert.deepEqual(t, { pacotes: 2, pecas: 70, m3Bruto: 1.85, m3Comercial: 2 });
});
