import test from 'node:test';
import assert from 'node:assert/strict';
import { arredondar, volumeM3, volumeBrutoPacote, volumeComercialPacote } from '../js/regras/medidas.js';

const bitola = { espessura: 5, largura: 15 };
const pacote = { comprimento: 3, quantidade: 100, somarAbono: false };

test('arredondar elimina ruído de ponto flutuante', () => {
  assert.equal(arredondar(0.1 + 0.2), 0.3);
  assert.equal(arredondar(1.8500000000000001), 1.85);
});

test('volumeM3 de 100 peças 5 x 15 cm com 3 m são 2,25 m³', () => {
  assert.equal(volumeM3({ espessuraCm: 5, larguraCm: 15, comprimentoM: 3, quantidade: 100 }), 2.25);
});

test('volumeBrutoPacote usa a bitola e aceita quantidade parcial', () => {
  assert.equal(volumeBrutoPacote(pacote, bitola), 2.25);
  assert.equal(volumeBrutoPacote(pacote, bitola, 40), 0.9);
  assert.equal(volumeBrutoPacote(pacote, bitola, 0), 0);
});

test('sem somarAbono o comercial é igual ao bruto, mesmo com abono preenchido', () => {
  const p = { ...pacote, abonoEspessura: 0.5, abonoLargura: 0.5, abonoComprimento: 0.1 };
  assert.equal(volumeComercialPacote(p, bitola), 2.25);
});

test('com somarAbono o comercial soma as medidas de abono', () => {
  const p = { ...pacote, somarAbono: true, abonoEspessura: 0.5, abonoLargura: 0.5, abonoComprimento: 0.1 };
  assert.equal(volumeComercialPacote(p, bitola), 2.64275);
});

test('somarAbono com abonos vazios (null) não quebra', () => {
  const p = { ...pacote, somarAbono: true, abonoEspessura: null, abonoLargura: null, abonoComprimento: null };
  assert.equal(volumeComercialPacote(p, bitola), 2.25);
});
