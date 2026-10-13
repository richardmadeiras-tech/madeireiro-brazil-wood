import { h, campo, selecao, lerFormulario, tentar, tabela, confirmar } from '../ui.js';
import { formatarData, formatarM3, formatarNumero, hojeISO, numeroDoCampo } from '../regras/formato.js';

const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
const porPlaca = (a, b) => a.placa.localeCompare(b.placa, 'pt-BR');
const porPacote = (a, b) => `${a.pacote.tipo}`.localeCompare(`${b.pacote.tipo}`, 'pt-BR')
  || String(a.pacote.numero).localeCompare(String(b.pacote.numero), 'pt-BR', { numeric: true });
const rotuloStatus = (s) => (s === 'aberto' ? 'Aberto' : 'Finalizado');

export async function montarRomaneios(contexto) {
  const { dados, servicos } = contexto;
  const cad = servicos.cadastros;
  const raiz = h('section', {});
  let abertoId = null;

  const desenhar = () => (abertoId ? desenharDetalhe() : desenharLista());

  function camposCabecalho(r, clientes, veiculos) {
    return [
      campo({ rotulo: 'Data', nome: 'data', tipo: 'date', valor: r.data ?? hojeISO(), obrigatorio: true }),
      selecao({ rotulo: 'Cliente', nome: 'clienteId', opcoes: clientes.map((c) => ({ valor: c.id, texto: c.nome })), valor: r.clienteId, vazio: 'Escolha…', obrigatorio: true }),
      selecao({ rotulo: 'Veículo', nome: 'veiculoId', opcoes: veiculos.map((v) => ({ valor: v.id, texto: v.placa + (v.descricao ? ` · ${v.descricao}` : '') })), valor: r.veiculoId, vazio: 'Nenhum' }),
      campo({ rotulo: 'Placa (se não escolher veículo)', nome: 'placa', valor: r.placa }),
      campo({ rotulo: 'Nota fiscal', nome: 'notaFiscal', valor: r.notaFiscal }),
      campo({ rotulo: 'DOF', nome: 'dof', valor: r.dof }),
      campo({ rotulo: 'Guia florestal (GF)', nome: 'guiaFlorestal', valor: r.guiaFlorestal }),
      campo({ rotulo: 'Observação', nome: 'observacao', valor: r.observacao }),
    ];
  }

  async function desenharLista() {
    const [resumo, pessoas, veiculosTodos] = await Promise.all([
      servicos.romaneios.listarResumo(),
      dados.pessoas.listar(),
      dados.veiculos.listar(),
    ]);
    const veiculos = [...veiculosTodos].sort(porPlaca);
    const clientes = pessoas.filter((p) => p.tipo === 'cliente').sort(porNome);
    const erros = h('div', { class: 'erros', role: 'alert' });
    const form = h('form', {
      class: 'formulario',
      onsubmit: async (ev) => {
        ev.preventDefault();
        let novo;
        const ok = await tentar(erros, async () => { novo = await servicos.romaneios.criar(lerFormulario(form)); });
        if (ok) {
          abertoId = novo.id;
          await desenhar();
        }
      },
    },
    h('h2', {}, 'Novo romaneio de venda'),
    camposCabecalho({}, clientes, veiculos),
    erros,
    h('div', { class: 'acoes' }, h('button', { type: 'submit' }, 'Criar romaneio')));

    const colunas = [
      { titulo: 'Nº', classe: 'num', valor: (r) => r.romaneio.numero },
      { titulo: 'Data', valor: (r) => formatarData(r.romaneio.data) },
      { titulo: 'Cliente', valor: (r) => r.cliente?.nome ?? '—' },
      { titulo: 'Placa', valor: (r) => r.romaneio.placa || '—' },
      { titulo: 'Peças', classe: 'num', valor: (r) => r.totais.pecas },
      { titulo: 'm³ bruto', classe: 'num', valor: (r) => formatarNumero(r.totais.m3Bruto, 3) },
      { titulo: 'Situação', valor: (r) => h('span', { class: `etiqueta ${r.romaneio.status}` }, rotuloStatus(r.romaneio.status)) },
      { titulo: '', valor: (r) => h('button', { type: 'button', class: 'secundario pequeno', onclick: () => { abertoId = r.romaneio.id; desenhar(); } }, 'Abrir') },
    ];
    const clientesVazio = clientes.length === 0
      ? h('p', { class: 'vazio' }, 'Cadastre ao menos um cliente em Cadastros para criar um romaneio.')
      : null;
    raiz.replaceChildren(...[form, clientesVazio, h('h2', {}, 'Romaneios'), tabela(colunas, resumo, 'Nenhum romaneio ainda.')].filter(Boolean));
  }

  async function desenharDetalhe() {
    const [d, linhas, pessoas, veiculosTodos] = await Promise.all([
      servicos.romaneios.detalhar(abertoId),
      servicos.pacotes.listarComResumo(),
      dados.pessoas.listar(),
      dados.veiculos.listar(),
    ]);
    const veiculos = [...veiculosTodos].sort(porPlaca);
    const { romaneio, cliente, totais } = d;
    const linhasItens = [...d.linhas].sort(porPacote);
    const aberto = romaneio.status === 'aberto';
    const clientes = pessoas.filter((p) => p.tipo === 'cliente').sort(porNome);
    const erros = h('div', { class: 'erros', role: 'alert' });

    const acoes = h('div', { class: 'acoes nao-imprimir' },
      h('button', { type: 'button', class: 'secundario', onclick: () => { abertoId = null; desenhar(); } }, '← Todos os romaneios'),
      aberto && h('button', { type: 'button', onclick: async () => { if (await tentar(erros, () => servicos.romaneios.finalizar(abertoId))) await desenhar(); } }, 'Finalizar romaneio'),
      !aberto && h('button', {
        type: 'button',
        class: 'secundario',
        onclick: async () => {
          if (!confirmar('Reabrir este romaneio para alterar?')) return;
          if (await tentar(erros, () => servicos.romaneios.reabrir(abertoId))) await desenhar();
        },
      }, 'Reabrir'),
      h('button', { type: 'button', class: 'secundario', onclick: () => window.print() }, 'Imprimir ou salvar em PDF'),
      aberto && h('button', {
        type: 'button',
        class: 'perigo',
        onclick: async () => {
          if (!confirmar(`Excluir o romaneio ${romaneio.numero}? As peças voltam para o estoque.`)) return;
          if (await tentar(erros, () => servicos.romaneios.excluir(abertoId))) {
            abertoId = null;
            await desenhar();
          }
        },
      }, 'Excluir romaneio'));

    const campoResumo = (rotulo, valor) => h('div', {}, h('strong', {}, `${rotulo}: `), valor || '—');
    const folha = h('div', { class: 'cartao' },
      h('h2', {}, `Romaneio de venda nº ${romaneio.numero} `, h('span', { class: `etiqueta ${romaneio.status}` }, rotuloStatus(romaneio.status))),
      h('div', { class: 'folha-cabecalho' },
        campoResumo('Data', formatarData(romaneio.data)),
        campoResumo('Cliente', cliente?.nome),
        campoResumo('Placa', romaneio.placa),
        campoResumo('Nota fiscal', romaneio.notaFiscal),
        campoResumo('DOF', romaneio.dof),
        campoResumo('Guia florestal', romaneio.guiaFlorestal),
        romaneio.observacao && campoResumo('Observação', romaneio.observacao)));

    const formCab = aberto && h('form', {
      class: 'formulario nao-imprimir',
      onsubmit: async (ev) => {
        ev.preventDefault();
        if (await tentar(erros, () => servicos.romaneios.atualizar(abertoId, lerFormulario(formCab)))) await desenhar();
      },
    },
    h('h2', {}, 'Dados do romaneio'),
    camposCabecalho(romaneio, clientes, veiculos),
    h('div', { class: 'acoes' }, h('button', { type: 'submit' }, 'Salvar dados')));

    const jaNoRomaneio = new Set(d.linhas.map((l) => l.pacote.id));
    const disponiveis = linhas.filter((l) => l.saldo > 0 && !jaNoRomaneio.has(l.pacote.id));
    const seletor = selecao({
      rotulo: 'Pacote',
      nome: 'pacoteId',
      opcoes: disponiveis.map((l) => ({ valor: l.pacote.id, texto: `${l.pacote.tipo} ${l.pacote.numero} · ${l.especie?.nome ?? '—'} · saldo ${l.saldo}` })),
      vazio: 'Escolha…',
      obrigatorio: true,
    });
    const quantidade = campo({ rotulo: 'Quantidade a baixar (peças)', nome: 'quantidade', obrigatorio: true, modo: 'numeric' });
    seletor.querySelector('select').addEventListener('change', (ev) => {
      const l = disponiveis.find((x) => x.pacote.id === ev.target.value);
      quantidade.querySelector('input').value = l ? String(l.saldo) : '';
    });
    const formItem = aberto && h('form', {
      class: 'formulario nao-imprimir',
      onsubmit: async (ev) => {
        ev.preventDefault();
        const f = lerFormulario(formItem);
        const ok = await tentar(erros, () => servicos.romaneios.adicionarItem(abertoId, { pacoteId: f.pacoteId, quantidade: numeroDoCampo(f.quantidade) }));
        if (ok) await desenhar();
      },
    },
    h('h2', {}, 'Incluir pacote (baixa)'),
    seletor,
    quantidade,
    h('div', { class: 'acoes' }, h('button', { type: 'submit' }, 'Incluir no romaneio')));

    const colunas = [
      { titulo: 'Pacote', valor: (l) => `${l.pacote.tipo} ${l.pacote.numero}` },
      { titulo: 'Espécie', valor: (l) => l.especie?.nome ?? '—' },
      { titulo: 'Medidas', valor: (l) => (l.bitola.espessura ? `${cad.bitolas.descricao(l.bitola)} × ${formatarNumero(l.pacote.comprimento, 2)} m` : '—') },
      { titulo: 'Peças', classe: 'num', valor: (l) => l.item.quantidadeBaixada },
      { titulo: 'm³ bruto', classe: 'num', valor: (l) => formatarNumero(l.m3Bruto, 3) },
      { titulo: 'm³ comercial', classe: 'num', valor: (l) => formatarNumero(l.m3Comercial, 3) },
    ];
    if (aberto) {
      colunas.push({
        titulo: '',
        valor: (l) => h('button', {
          type: 'button',
          class: 'perigo pequeno nao-imprimir',
          onclick: async () => { if (await tentar(erros, () => servicos.romaneios.removerItem(l.item.id))) await desenhar(); },
        }, 'Remover'),
      });
    }

    raiz.replaceChildren(...[
      acoes,
      erros,
      folha,
      formCab,
      formItem,
      h('h2', {}, 'Pacotes do romaneio'),
      tabela(colunas, linhasItens, 'Nenhum pacote incluído ainda.'),
      h('p', { class: 'totais' }, `${totais.pacotes} pacote(s) · ${totais.pecas} peça(s) · ${formatarM3(totais.m3Bruto)} brutos · ${formatarM3(totais.m3Comercial)} comerciais`),
    ].filter(Boolean));
  }

  await desenhar();
  return raiz;
}
