import { ErroDeRegra, exigir } from './erro.js';

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const texto = (v) => String(v ?? '').trim();
const numeroOuNulo = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
const umidadeOk = (n) => n >= 0 && n <= 100;

export function criarServicoEstufa(dados) {
  return {
    async entrar({ pacoteId, estufa, dtEntrada, umidadeEntrada, tipoSecagem }) {
      const erros = [];
      const pacote = pacoteId ? await dados.pacotes.obter(pacoteId) : null;
      if (!pacote || pacote.excluidoEm) erros.push('Escolha um pacote.');
      if (!texto(estufa)) erros.push('Informe a estufa.');
      if (!DATA_ISO.test(dtEntrada ?? '')) erros.push('Informe a data de entrada.');
      const umidade = numeroOuNulo(umidadeEntrada);
      if (umidade !== null && !umidadeOk(umidade)) {
        erros.push('A umidade de entrada deve ficar entre 0 e 100 (use vírgula nos decimais).');
      }
      exigir(erros);
      const abertas = (await dados.passagens.listar()).filter((p) => p.pacoteId === pacoteId && !p.dtSaida);
      if (abertas.length) throw new ErroDeRegra(['Este pacote já está em uma estufa.']);
      return dados.passagens.criar({
        pacoteId,
        estufa: texto(estufa),
        dtEntrada,
        dtSaida: '',
        umidadeEntrada: umidade,
        umidadeSaida: null,
        tipoSecagem: texto(tipoSecagem),
      });
    },

    async sair(passagemId, { dtSaida, umidadeSaida }) {
      const passagem = await dados.passagens.obter(passagemId);
      if (!passagem || passagem.excluidoEm) throw new ErroDeRegra(['Passagem pela estufa não encontrada.']);
      if (passagem.dtSaida) throw new ErroDeRegra(['Este pacote já saiu da estufa.']);
      const erros = [];
      if (!DATA_ISO.test(dtSaida ?? '')) erros.push('Informe a data de saída.');
      else if (dtSaida < passagem.dtEntrada) erros.push('A data de saída não pode ser antes da entrada.');
      const umidade = numeroOuNulo(umidadeSaida);
      if (umidade === null) erros.push('Informe a umidade de saída.');
      else if (!umidadeOk(umidade)) erros.push('A umidade de saída deve ficar entre 0 e 100 (use vírgula nos decimais).');
      exigir(erros);
      return dados.passagens.atualizar(passagemId, { dtSaida, umidadeSaida: umidade });
    },
  };
}
