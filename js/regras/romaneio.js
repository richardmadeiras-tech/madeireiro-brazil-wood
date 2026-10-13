import { arredondar } from './medidas.js';

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function validarRomaneio(r) {
  const erros = [];
  if (!DATA_ISO.test(r.data ?? '')) erros.push('Informe a data do romaneio.');
  if (!r.clienteId) erros.push('Escolha o cliente.');
  return erros;
}

export function validarBaixa({ pacote, saldo, quantidade, jaNoRomaneio }) {
  const erros = [];
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    erros.push('A quantidade da baixa deve ser um número inteiro de 1 ou mais.');
  } else if (quantidade > saldo) {
    erros.push(`O pacote ${pacote.numero} só tem ${saldo} peça(s) em saldo.`);
  }
  if (jaNoRomaneio) erros.push(`O pacote ${pacote.numero} já está neste romaneio.`);
  return erros;
}

export function totaisRomaneio(linhas) {
  return {
    pacotes: linhas.length,
    pecas: linhas.reduce((s, l) => s + l.quantidade, 0),
    m3Bruto: arredondar(linhas.reduce((s, l) => s + l.m3Bruto, 0)),
    m3Comercial: arredondar(linhas.reduce((s, l) => s + l.m3Comercial, 0)),
  };
}
