export const TIPOS_PACOTE = ['MS', 'PB', 'PF'];

export const STATUS_SECAGEM = { VERDE: 'verde', EM_ESTUFA: 'em_estufa', SECO: 'seco' };

export const ROTULO_SECAGEM = { verde: 'Verde', em_estufa: 'Em estufa', seco: 'Seco' };

const OPCIONAIS_NAO_NEGATIVOS = [
  ['peso', 'O peso'],
  ['qtdAmarras', 'A quantidade de amarras'],
  ['abonoComprimento', 'O abono de comprimento'],
  ['abonoLargura', 'O abono de largura'],
  ['abonoEspessura', 'O abono de espessura'],
];

export function validarPacote(p) {
  const erros = [];
  if (!TIPOS_PACOTE.includes(p.tipo)) erros.push('Escolha o tipo do pacote (MS, PB ou PF).');
  if (!String(p.numero ?? '').trim()) erros.push('Informe o número do pacote.');
  if (!p.especieId) erros.push('Escolha a espécie.');
  if (!p.bitolaId) erros.push('Escolha a bitola.');
  if (!(p.comprimento > 0)) erros.push('O comprimento deve ser um número maior que zero (use vírgula, por exemplo 3,5).');
  if (!Number.isInteger(p.quantidade) || p.quantidade < 1) {
    erros.push('A quantidade deve ser um número inteiro de 1 ou mais.');
  }
  for (const [campo, nome] of OPCIONAIS_NAO_NEGATIVOS) {
    const v = p[campo];
    if (v !== undefined && v !== null && v !== '' && !(Number(v) >= 0)) {
      erros.push(`${nome} deve ser um número sem sinal de menos (use vírgula nos decimais).`);
    }
  }
  return erros;
}

export function quantidadeBaixada(pacoteId, itens) {
  return itens
    .filter((i) => i.pacoteId === pacoteId && !i.excluidoEm)
    .reduce((soma, i) => soma + i.quantidadeBaixada, 0);
}

export function saldoPacote(pacote, itens) {
  return pacote.quantidade - quantidadeBaixada(pacote.id, itens);
}

export function statusSecagemDe(passagens) {
  const ativas = passagens.filter((p) => !p.excluidoEm);
  if (ativas.length === 0) return STATUS_SECAGEM.VERDE;
  return ativas.some((p) => !p.dtSaida) ? STATUS_SECAGEM.EM_ESTUFA : STATUS_SECAGEM.SECO;
}
