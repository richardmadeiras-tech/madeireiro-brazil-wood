import { validarPacote, quantidadeBaixada, saldoPacote, statusSecagemDe } from '../regras/pacote.js';
import { volumeBrutoPacote, volumeComercialPacote } from '../regras/medidas.js';
import { ErroDeRegra, exigir } from './erro.js';

const texto = (v) => String(v ?? '').trim();
const opcional = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
const BITOLA_VAZIA = { espessura: 0, largura: 0 };
const mapa = (lista) => new Map(lista.map((r) => [r.id, r]));

function limpar(e) {
  return {
    tipo: e.tipo,
    numero: texto(e.numero),
    numeroAutex: texto(e.numeroAutex),
    numeroControleInterno: texto(e.numeroControleInterno),
    especieId: e.especieId || '',
    bitolaId: e.bitolaId || '',
    localEstoqueId: e.localEstoqueId || '',
    pacoteOrigemId: e.pacoteOrigemId || '',
    comprimento: Number(e.comprimento),
    quantidade: Number(e.quantidade),
    peso: opcional(e.peso),
    qtdAmarras: opcional(e.qtdAmarras),
    qualidade: texto(e.qualidade),
    abonoComprimento: opcional(e.abonoComprimento),
    abonoLargura: opcional(e.abonoLargura),
    abonoEspessura: opcional(e.abonoEspessura),
    somarAbono: Boolean(e.somarAbono),
    dtRecebimento: texto(e.dtRecebimento),
    dtEntradaEstoque: texto(e.dtEntradaEstoque),
    dtFinalizacao: texto(e.dtFinalizacao),
    observacao: texto(e.observacao),
  };
}

export function criarServicoPacotes(dados) {
  async function existe(repo, id) {
    const r = await repo.obter(id);
    return Boolean(r) && !r.excluidoEm;
  }

  async function conferirReferencias(p) {
    const erros = [];
    if (p.especieId && !(await existe(dados.especies, p.especieId))) erros.push('A espécie escolhida não existe mais.');
    if (p.bitolaId && !(await existe(dados.bitolas, p.bitolaId))) erros.push('A bitola escolhida não existe mais.');
    if (p.localEstoqueId && !(await existe(dados.locais, p.localEstoqueId))) {
      erros.push('O local de estoque escolhido não existe mais.');
    }
    if (p.pacoteOrigemId && !(await existe(dados.pacotes, p.pacoteOrigemId))) {
      erros.push('O pacote de origem não existe mais.');
    }
    return erros;
  }

  async function conferirNumero(p, idAtual) {
    const outros = await dados.pacotes.listar();
    const repetido = outros.some(
      (o) => o.id !== idAtual && o.tipo === p.tipo && o.numero.toLowerCase() === p.numero.toLowerCase(),
    );
    return repetido ? [`Já existe o pacote ${p.tipo} número ${p.numero}.`] : [];
  }

  async function conferirTudo(p, idAtual) {
    exigir(validarPacote(p));
    exigir([...(await conferirReferencias(p)), ...(await conferirNumero(p, idAtual))]);
  }

  return {
    async criar(entrada) {
      const p = limpar(entrada);
      await conferirTudo(p, null);
      return dados.pacotes.criar(p);
    },

    async atualizar(id, entrada) {
      const atual = await dados.pacotes.obter(id);
      if (!atual || atual.excluidoEm) throw new ErroDeRegra(['Pacote não encontrado.']);
      const p = limpar(entrada);
      await conferirTudo(p, id);
      const baixado = quantidadeBaixada(id, await dados.itens.listar());
      if (p.quantidade < baixado) {
        throw new ErroDeRegra([`A quantidade não pode ficar abaixo do que já foi baixado (${baixado}).`]);
      }
      return dados.pacotes.atualizar(id, p);
    },

    async excluir(id) {
      if (quantidadeBaixada(id, await dados.itens.listar()) > 0) {
        throw new ErroDeRegra(['Este pacote já tem baixas em romaneios e não pode ser excluído.']);
      }
      const passagens = (await dados.passagens.listar()).filter((x) => x.pacoteId === id);
      if (passagens.length) {
        throw new ErroDeRegra(['Este pacote já passou pela estufa e não pode ser excluído.']);
      }
      return dados.pacotes.excluir(id);
    },

    async listarComResumo() {
      const [pacotes, especies, bitolas, locais, itens, passagens] = await Promise.all([
        dados.pacotes.listar(),
        dados.especies.listar({ incluirExcluidos: true }),
        dados.bitolas.listar({ incluirExcluidos: true }),
        dados.locais.listar({ incluirExcluidos: true }),
        dados.itens.listar(),
        dados.passagens.listar(),
      ]);
      const especiePorId = mapa(especies);
      const bitolaPorId = mapa(bitolas);
      const localPorId = mapa(locais);
      return pacotes
        .map((pacote) => {
          const bitola = bitolaPorId.get(pacote.bitolaId) ?? BITOLA_VAZIA;
          const saldo = saldoPacote(pacote, itens);
          return {
            pacote,
            especie: especiePorId.get(pacote.especieId) ?? null,
            bitola,
            local: localPorId.get(pacote.localEstoqueId) ?? null,
            saldo,
            statusSecagem: statusSecagemDe(passagens.filter((x) => x.pacoteId === pacote.id)),
            m3Bruto: volumeBrutoPacote(pacote, bitola),
            m3Comercial: volumeComercialPacote(pacote, bitola),
            m3Saldo: volumeBrutoPacote(pacote, bitola, saldo),
            m3SaldoComercial: volumeComercialPacote(pacote, bitola, saldo),
          };
        })
        .sort(
          (a, b) => a.pacote.tipo.localeCompare(b.pacote.tipo)
            || a.pacote.numero.localeCompare(b.pacote.numero, 'pt-BR', { numeric: true }),
        );
    },
  };
}
