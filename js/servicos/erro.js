export class ErroDeRegra extends Error {
  constructor(erros) {
    super(erros.join(' '));
    this.name = 'ErroDeRegra';
    this.erros = erros;
  }
}

export function exigir(erros) {
  if (erros.length) throw new ErroDeRegra(erros);
}
