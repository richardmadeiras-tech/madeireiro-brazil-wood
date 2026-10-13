import test from 'node:test';
import assert from 'node:assert/strict';
import { validarRomaneio, validarBaixa, totaisRomaneio } from '../js/regras/romaneio.js';

test('romaneio exige data no formato AAAA-MM-DD e cliente', () => {
  assert.deepEqual(validarRomaneio({ data: '2026-10-13', clienteId: 'c1' }), []);
  assert.equal(validarRomaneio({ data: '', clienteId: 'c1' }).length, 1);
  assert.equal(validarRomaneio({ data: '13/10/2026', clienteId: 'c1' }).length, 1);
  assert.equal(validarRomaneio({ data: '2026-10-13', clienteId: '' }).length, 1);
});

const pacote = { numero: '100' };

test('baixa dentro do saldo é aceita, inclusive o saldo todo', () => {
  assert.deepEqual(validarBaixa({ pacote, saldo: 60, quantidade: 60, jaNoRomaneio: false }), []);
  assert.deepEqual(validarBaixa({ pacote, saldo: 60, quantidade: 1, jaNoRomaneio: false }), []);
});

test('baixa acima do saldo diz quanto sobra', () => {
  const erros = validarBaixa({ pacote, saldo: 60, quantidade: 61, jaNoRomaneio: false });
  assert.equal(erros.length, 1);
  assert.match(erros[0], /só tem 60/);
});

test('baixa recusa zero, decimal e NaN', () => {
  for (const q of [0, 1.5, NaN, -3]) {
    assert.equal(validarBaixa({ pacote, saldo: 60, quantidade: q, jaNoRomaneio: false }).length, 1, `quantidade ${q}`);
  }
});

test('baixa recusa pacote que já está no romaneio', () => {
  const erros = validarBaixa({ pacote, saldo: 60, quantidade: 10, jaNoRomaneio: true });
  assert.equal(erros.length, 1);
  assert.match(erros[0], /já está neste romaneio/);
});

test('totaisRomaneio soma peças e volumes', () => {
  const t = totaisRomaneio([
    { quantidade: 40, m3Bruto: 0.9, m3Comercial: 1 },
    { quantidade: 10, m3Bruto: 0.225, m3Comercial: 0.25 },
  ]);
  assert.deepEqual(t, { pacotes: 2, pecas: 50, m3Bruto: 1.125, m3Comercial: 1.25 });
  assert.deepEqual(totaisRomaneio([]), { pacotes: 0, pecas: 0, m3Bruto: 0, m3Comercial: 0 });
});
