import { validarRomaneio, validarBaixa, totaisRomaneio } from '../regras/romaneio.js';
import { saldoPacote } from '../regras/pacote.js';
import { volumeBrutoPacote, volumeComercialPacote } from '../regras/medidas.js';
import { normalizarPlaca } from '../regras/cadastros.js';
import { hojeISO } from '../regras/formato.js';
import { ErroDeRegra, exigir } from './erro.js';

const texto = (v) => String(v ?? '').trim();
const BITOLA_VAZIA = { espessura: 0, largura: 0 };
const mapa = (lista) => new Map(lista.map((r) => [r.id, r]));

function limpar(e) {
  return {
    data: texto(e.data),
    clienteId: e.clienteId || '',
    veiculoId: e.veiculoId || '',
    placa: normalizarPlaca(e.placa),
    notaFiscal: texto(e.notaFiscal),
    dof: texto(e.dof),
    guiaFlorestal: texto(e.guiaFlorestal),
    observacao: texto(e.observacao),
  };
}

export function criarServicoRomaneios(dados) {
  async function preparar(entrada) {
    const r = limpar(entrada);
    const erros = validarRomaneio(r);
    if (r.clienteId) {
      const cliente = await dados.pessoas.obter(r.clienteId);
      if (!cliente || cliente.excluidoEm) erros.push('O cliente escolhido não existe mais.');
    }
    if (r.veiculoId) {
      const veiculo = await dados.veiculos.obter(r.veiculoId);
      if (!veiculo || veiculo.excluidoEm) erros.push('O veículo escolhido não existe mais.');
      else if (!r.placa) r.placa = veiculo.placa;
    }
    exigir(erros);
    return r;
  }

  async function carregar(id) {
    const r = await dados.romaneios.obter(id);
    if (!r || r.excluidoEm) throw new ErroDeRegra(['Romaneio não encontrado.']);
    return r;
  }

  async function carregarAberto(id) {
    const r = await carregar(id);
    if (r.status === 'finalizado') {
      throw new ErroDeRegra(['Este romaneio está finalizado. Reabra o romaneio para alterar.']);
    }
    return r;
  }

  const servico = {
    async criar(entrada) {
      const r = await preparar(entrada);
      const todos = await dados.romaneios.listar({ incluirExcluidos: true });
      const numero = Math.max(0, ...todos.map((x) => x.numero || 0)) + 1;
      return dados.romaneios.criar({ ...r, numero, status: 'aberto', dtFinalizacao: '' });
    },

    async atualizar(id, entrada) {
      await carregarAberto(id);
      return dados.romaneios.atualizar(id, await preparar(entrada));
    },

    async adicionarItem(romaneioId, { pacoteId, quantidade }) {
      await carregarAberto(romaneioId);
      const pacote = pacoteId ? await dados.pacotes.obter(pacoteId) : null;
      if (!pacote || pacote.excluidoEm) throw new ErroDeRegra(['Escolha um pacote.']);
      const itens = await dados.itens.listar();
      const jaNoRomaneio = itens.some((i) => i.romaneioId === romaneioId && i.pacoteId === pacoteId);
      exigir(validarBaixa({ pacote, saldo: saldoPacote(pacote, itens), quantidade: Number(quantidade), jaNoRomaneio }));
      return dados.itens.criar({ romaneioId, pacoteId, quantidadeBaixada: Number(quantidade) });
    },

    async removerItem(itemId) {
      const item = await dados.itens.obter(itemId);
      if (!item || item.excluidoEm) throw new ErroDeRegra(['Item não encontrado.']);
      await carregarAberto(item.romaneioId);
      return dados.itens.excluir(itemId);
    },

    async finalizar(id, hoje = hojeISO()) {
      await carregarAberto(id);
      const itens = (await dados.itens.listar()).filter((i) => i.romaneioId === id);
      if (itens.length === 0) throw new ErroDeRegra(['Inclua ao menos um pacote antes de finalizar.']);
      return dados.romaneios.atualizar(id, { status: 'finalizado', dtFinalizacao: hoje });
    },

    async reabrir(id) {
      await carregar(id);
      return dados.romaneios.atualizar(id, { status: 'aberto', dtFinalizacao: '' });
    },

    async excluir(id) {
      await carregarAberto(id);
      const itens = (await dados.itens.listar()).filter((i) => i.romaneioId === id);
      for (const item of itens) await dados.itens.excluir(item.id);
      return dados.romaneios.excluir(id);
    },

    async detalhar(id) {
      const romaneio = await carregar(id);
      const [itens, pacotes, especies, bitolas, cliente, veiculo] = await Promise.all([
        dados.itens.listar(),
        dados.pacotes.listar({ incluirExcluidos: true }),
        dados.especies.listar({ incluirExcluidos: true }),
        dados.bitolas.listar({ incluirExcluidos: true }),
        romaneio.clienteId ? dados.pessoas.obter(romaneio.clienteId) : null,
        romaneio.veiculoId ? dados.veiculos.obter(romaneio.veiculoId) : null,
      ]);
      const pacotePorId = mapa(pacotes);
      const especiePorId = mapa(especies);
      const bitolaPorId = mapa(bitolas);
      const linhas = itens
        .filter((i) => i.romaneioId === id)
        .flatMap((item) => {
          const pacote = pacotePorId.get(item.pacoteId);
          if (!pacote) return [];
          const bitola = bitolaPorId.get(pacote.bitolaId) ?? BITOLA_VAZIA;
          return [{
            item,
            pacote,
            especie: especiePorId.get(pacote.especieId) ?? null,
            bitola,
            m3Bruto: volumeBrutoPacote(pacote, bitola, item.quantidadeBaixada),
            m3Comercial: volumeComercialPacote(pacote, bitola, item.quantidadeBaixada),
          }];
        });
      const totais = totaisRomaneio(
        linhas.map((l) => ({ quantidade: l.item.quantidadeBaixada, m3Bruto: l.m3Bruto, m3Comercial: l.m3Comercial })),
      );
      return { romaneio, cliente, veiculo, linhas, totais };
    },

    async listarResumo() {
      const lista = await dados.romaneios.listar();
      const resumo = await Promise.all(
        lista.map(async (r) => {
          const d = await servico.detalhar(r.id);
          return { romaneio: d.romaneio, cliente: d.cliente, totais: d.totais };
        }),
      );
      return resumo.sort((a, b) => b.romaneio.numero - a.romaneio.numero);
    },
  };
  return servico;
}
