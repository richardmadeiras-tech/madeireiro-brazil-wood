import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatarNumero, formatarM3, formatarData, lerNumero, hojeISO, numeroParaCampo, numeroDoCampo,
} from '../js/regras/formato.js';

test('formatarNumero usa vírgula e ponto de milhar', () => {
  assert.equal(formatarNumero(1234.5, 2), '1.234,50');
  assert.equal(formatarNumero(0, 3), '0,000');
});

test('formatarM3 mostra três casas e a unidade', () => {
  assert.equal(formatarM3(2.25), '2,250 m³');
});

test('formatarData converte AAAA-MM-DD e aceita vazio', () => {
  assert.equal(formatarData('2026-10-13'), '13/10/2026');
  assert.equal(formatarData(''), '');
  assert.equal(formatarData(null), '');
});

test('lerNumero aceita vírgula e milhar do Brasil', () => {
  assert.equal(lerNumero('12,5'), 12.5);
  assert.equal(lerNumero('1.234,56'), 1234.56);
  assert.equal(lerNumero(' 7 '), 7);
  assert.equal(lerNumero('100'), 100);
});

test('lerNumero recusa o que não é número do Brasil, inclusive ponto decimal', () => {
  assert.ok(Number.isNaN(lerNumero('')));
  assert.ok(Number.isNaN(lerNumero('abc')));
  assert.ok(Number.isNaN(lerNumero('1,2,3')));
  assert.ok(Number.isNaN(lerNumero('2.5')));
  assert.ok(Number.isNaN(lerNumero('-4')));
});

test('hojeISO usa a data local', () => {
  assert.equal(hojeISO(new Date(2026, 9, 13, 23, 59)), '2026-10-13');
});

test('numeroParaCampo e numeroDoCampo fazem o caminho de ida e volta', () => {
  assert.equal(numeroParaCampo(12.5), '12,5');
  assert.equal(numeroParaCampo(null), '');
  assert.equal(numeroParaCampo(undefined), '');
  assert.equal(numeroDoCampo('12,5'), 12.5);
  assert.equal(numeroDoCampo('  '), '');
  assert.ok(Number.isNaN(numeroDoCampo('2.5')));
});
