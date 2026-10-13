import { criarRepositorio } from './repositorio.js';

export function criarDados(armazem, opcoes) {
  const r = (colecao) => criarRepositorio(armazem, colecao, opcoes);
  return {
    armazem,
    especies: r('especies'),
    bitolas: r('bitolas'),
    locais: r('locais'),
    pessoas: r('pessoas'),
    veiculos: r('veiculos'),
    pacotes: r('pacotes'),
    passagens: r('passagens'),
    romaneios: r('romaneios'),
    itens: r('itens'),
  };
}
