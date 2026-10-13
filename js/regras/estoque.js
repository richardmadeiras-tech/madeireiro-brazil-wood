import { arredondar } from './medidas.js';

export function filtrarEstoque(linhas, f = {}) {
  return linhas.filter((l) => {
    if (!f.incluirZerados && l.saldo <= 0) return false;
    if (f.tipo && l.pacote.tipo !== f.tipo) return false;
    if (f.especieId && l.pacote.especieId !== f.especieId) return false;
    if (f.bitolaId && l.pacote.bitolaId !== f.bitolaId) return false;
    if (f.localId && l.pacote.localEstoqueId !== f.localId) return false;
    if (f.statusSecagem && l.statusSecagem !== f.statusSecagem) return false;
    if (f.qualidade && !(l.pacote.qualidade ?? '').toLowerCase().includes(f.qualidade.toLowerCase())) return false;
    return true;
  });
}

export function totaisEstoque(linhas) {
  return {
    pacotes: linhas.length,
    pecas: linhas.reduce((s, l) => s + l.saldo, 0),
    m3Bruto: arredondar(linhas.reduce((s, l) => s + l.m3Saldo, 0)),
    m3Comercial: arredondar(linhas.reduce((s, l) => s + l.m3SaldoComercial, 0)),
  };
}
