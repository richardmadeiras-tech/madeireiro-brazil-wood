export function arredondar(n, casas = 6) {
  const f = 10 ** casas;
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function volumeM3({ espessuraCm, larguraCm, comprimentoM, quantidade }) {
  return arredondar((espessuraCm / 100) * (larguraCm / 100) * comprimentoM * quantidade);
}

export function volumeBrutoPacote(pacote, bitola, quantidade = pacote.quantidade) {
  return volumeM3({
    espessuraCm: bitola.espessura,
    larguraCm: bitola.largura,
    comprimentoM: pacote.comprimento,
    quantidade,
  });
}

export function volumeComercialPacote(pacote, bitola, quantidade = pacote.quantidade) {
  if (!pacote.somarAbono) return volumeBrutoPacote(pacote, bitola, quantidade);
  return volumeM3({
    espessuraCm: bitola.espessura + (pacote.abonoEspessura || 0),
    larguraCm: bitola.largura + (pacote.abonoLargura || 0),
    comprimentoM: pacote.comprimento + (pacote.abonoComprimento || 0),
    quantidade,
  });
}
