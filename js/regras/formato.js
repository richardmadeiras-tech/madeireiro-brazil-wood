export function formatarNumero(n, casas = 3) {
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function formatarM3(n) {
  return `${formatarNumero(n, 3)} m³`;
}

export function formatarData(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

const NUMERO_BR = /^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/;

export function lerNumero(texto) {
  const t = String(texto ?? '').trim();
  if (!NUMERO_BR.test(t)) return NaN;
  return Number(t.replace(/\./g, '').replace(',', '.'));
}

export function hojeISO(agora = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`;
}

export function numeroParaCampo(v) {
  if (v === null || v === undefined || v === '') return '';
  return String(v).replace('.', ',');
}

export function numeroDoCampo(texto) {
  if (String(texto ?? '').trim() === '') return '';
  return lerNumero(texto);
}
