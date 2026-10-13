import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TIPOS_PACOTE, STATUS_SECAGEM, ROTULO_SECAGEM, validarPacote, quantidadeBaixada, saldoPacote, statusSecagemDe,
} from '../js/regras/pacote.js';

const base = { tipo: 'MS', numero: '100', especieId: 'e1', bitolaId: 'b1', comprimento: 3, quantidade: 100 };

test('pacote válido não tem erros', () => {
  assert.deepEqual(validarPacote(base), []);
});

test('tipos aceitos são MS, PB e PF', () => {
  assert.deepEqual(TIPOS_PACOTE, ['MS', 'PB', 'PF']);
  assert.equal(validarPacote({ ...base, tipo: 'XX' }).length, 1);
});

test('campos obrigatórios geram um erro cada', () => {
  assert.equal(validarPacote({ ...base, numero: '  ' }).length, 1);
  assert.equal(validarPacote({ ...base, especieId: '' }).length, 1);
  assert.equal(validarPacote({ ...base, bitolaId: '' }).length, 1);
});

test('comprimento e quantidade recusam zero, decimal e NaN (número digitado errado)', () => {
  assert.equal(validarPacote({ ...base, comprimento: 0 }).length, 1);
  assert.equal(validarPacote({ ...base, comprimento: NaN }).length, 1);
  assert.equal(validarPacote({ ...base, quantidade: 0 }).length, 1);
  assert.equal(validarPacote({ ...base, quantidade: 2.5 }).length, 1);
  assert.equal(validarPacote({ ...base, quantidade: NaN }).length, 1);
});

test('peso, amarras e abonos opcionais aceitam vazio mas recusam negativo e NaN', () => {
  assert.deepEqual(validarPacote({ ...base, peso: null, abonoLargura: null }), []);
  assert.equal(validarPacote({ ...base, peso: -1 }).length, 1);
  assert.equal(validarPacote({ ...base, abonoEspessura: NaN }).length, 1);
});

test('saldo é a quantidade menos as baixas ativas do próprio pacote', () => {
  const pacote = { id: 'p1', quantidade: 100 };
  const itens = [
    { pacoteId: 'p1', quantidadeBaixada: 40, excluidoEm: null },
    { pacoteId: 'p1', quantidadeBaixada: 10, excluidoEm: '2026-10-13T00:00:00.000Z' },
    { pacoteId: 'p2', quantidadeBaixada: 99, excluidoEm: null },
  ];
  assert.equal(quantidadeBaixada('p1', itens), 40);
  assert.equal(saldoPacote(pacote, itens), 60);
});

test('status de secagem: verde, em estufa e seco', () => {
  assert.equal(statusSecagemDe([]), STATUS_SECAGEM.VERDE);
  assert.equal(statusSecagemDe([{ dtSaida: '' }]), STATUS_SECAGEM.EM_ESTUFA);
  assert.equal(statusSecagemDe([{ dtSaida: '2026-10-10' }]), STATUS_SECAGEM.SECO);
  assert.equal(statusSecagemDe([{ dtSaida: '2026-10-10' }, { dtSaida: '' }]), STATUS_SECAGEM.EM_ESTUFA);
  assert.equal(statusSecagemDe([{ dtSaida: '', excluidoEm: 'x' }]), STATUS_SECAGEM.VERDE);
});

test('há um rótulo em português para cada status', () => {
  assert.equal(ROTULO_SECAGEM.em_estufa, 'Em estufa');
});

test('limites plausíveis: aceita no limite e recusa acima', () => {
  assert.deepEqual(validarPacote({ ...base, comprimento: 30 }), []);
  assert.equal(validarPacote({ ...base, comprimento: 30.1 }).length, 1);
  assert.deepEqual(validarPacote({ ...base, abonoEspessura: 10, abonoLargura: 10, abonoComprimento: 1 }), []);
  assert.equal(validarPacote({ ...base, abonoEspessura: 10.5 }).length, 1);
  assert.equal(validarPacote({ ...base, abonoLargura: 11 }).length, 1);
  assert.equal(validarPacote({ ...base, abonoComprimento: 1.5 }).length, 1);
});
