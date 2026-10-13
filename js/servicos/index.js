import { criarServicoCadastros } from './cadastros.js';
import { criarServicoPacotes } from './pacotes.js';
import { criarServicoEstufa } from './estufa.js';
import { criarServicoRomaneios } from './romaneios.js';

export function criarServicos(dados) {
  return {
    cadastros: criarServicoCadastros(dados),
    pacotes: criarServicoPacotes(dados),
    estufa: criarServicoEstufa(dados),
    romaneios: criarServicoRomaneios(dados),
  };
}
