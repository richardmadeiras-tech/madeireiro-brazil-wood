import { h, campo, selecao, lerFormulario, tentar, tabela, confirmar } from '../ui.js';
import { TIPOS_PACOTE, ROTULO_SECAGEM } from '../regras/pacote.js';
import { formatarNumero, numeroDoCampo, numeroParaCampo } from '../regras/formato.js';

const NUMEROS = ['comprimento', 'quantidade', 'peso', 'qtdAmarras', 'abonoComprimento', 'abonoLargura', 'abonoEspessura'];

export async function montarPacotes(contexto) {
  const { dados, servicos } = contexto;
  const cad = servicos.cadastros;
  const raiz = h('section', {});
  let editando = null;

  const ordenar = (lista) => lista.sort((a, b) => a.texto.localeCompare(b.texto, 'pt-BR', { numeric: true }));
  const opcoes = (lista, servico) => ordenar(lista.map((r) => ({ valor: r.id, texto: servico.descricao(r) })));

  async function desenhar() {
    const [linhas, especies, bitolas, locais] = await Promise.all([
      servicos.pacotes.listarComResumo(),
      dados.especies.listar(),
      dados.bitolas.listar(),
      dados.locais.listar(),
    ]);
    const p = editando ?? {};
    const erros = h('div', { class: 'erros', role: 'alert' });
    const errosLista = h('div', { class: 'erros', role: 'alert' });

    const form = h('form', {
      class: 'formulario',
      onsubmit: async (ev) => {
        ev.preventDefault();
        const entrada = lerFormulario(form);
        for (const n of NUMEROS) entrada[n] = numeroDoCampo(entrada[n]);
        const ok = await tentar(erros, () => (editando
          ? servicos.pacotes.atualizar(editando.id, entrada)
          : servicos.pacotes.criar(entrada)));
        if (ok) {
          editando = null;
          await desenhar();
        }
      },
    },
    h('h2', {}, editando ? `Editar pacote ${p.tipo} ${p.numero}` : 'Novo pacote'),
    selecao({ rotulo: 'Tipo', nome: 'tipo', opcoes: TIPOS_PACOTE.map((t) => ({ valor: t, texto: t })), valor: p.tipo ?? 'MS' }),
    campo({ rotulo: 'Número', nome: 'numero', valor: p.numero, obrigatorio: true }),
    campo({ rotulo: 'Número AUTEX', nome: 'numeroAutex', valor: p.numeroAutex }),
    campo({ rotulo: 'Controle interno', nome: 'numeroControleInterno', valor: p.numeroControleInterno }),
    selecao({ rotulo: 'Espécie', nome: 'especieId', opcoes: opcoes(especies, cad.especies), valor: p.especieId, vazio: 'Escolha…', obrigatorio: true }),
    selecao({ rotulo: 'Bitola (espessura x largura)', nome: 'bitolaId', opcoes: opcoes(bitolas, cad.bitolas), valor: p.bitolaId, vazio: 'Escolha…', obrigatorio: true }),
    campo({ rotulo: 'Comprimento (m)', nome: 'comprimento', valor: numeroParaCampo(p.comprimento), obrigatorio: true, modo: 'decimal' }),
    campo({ rotulo: 'Quantidade de peças', nome: 'quantidade', valor: numeroParaCampo(p.quantidade), obrigatorio: true, modo: 'numeric' }),
    campo({ rotulo: 'Peso (kg)', nome: 'peso', valor: numeroParaCampo(p.peso), modo: 'decimal' }),
    campo({ rotulo: 'Quantidade de amarras', nome: 'qtdAmarras', valor: numeroParaCampo(p.qtdAmarras), modo: 'numeric' }),
    campo({ rotulo: 'Qualidade', nome: 'qualidade', valor: p.qualidade }),
    selecao({ rotulo: 'Local de estoque', nome: 'localEstoqueId', opcoes: opcoes(locais, cad.locais), valor: p.localEstoqueId, vazio: 'Sem local' }),
    campo({ rotulo: 'Abono de espessura (cm)', nome: 'abonoEspessura', valor: numeroParaCampo(p.abonoEspessura), modo: 'decimal' }),
    campo({ rotulo: 'Abono de largura (cm)', nome: 'abonoLargura', valor: numeroParaCampo(p.abonoLargura), modo: 'decimal' }),
    campo({ rotulo: 'Abono de comprimento (m)', nome: 'abonoComprimento', valor: numeroParaCampo(p.abonoComprimento), modo: 'decimal' }),
    campo({ rotulo: 'Somar o abono no volume comercial', nome: 'somarAbono', tipo: 'checkbox', valor: p.somarAbono }),
    campo({ rotulo: 'Data de recebimento', nome: 'dtRecebimento', tipo: 'date', valor: p.dtRecebimento }),
    campo({ rotulo: 'Entrada no estoque', nome: 'dtEntradaEstoque', tipo: 'date', valor: p.dtEntradaEstoque }),
    campo({ rotulo: 'Data de finalização', nome: 'dtFinalizacao', tipo: 'date', valor: p.dtFinalizacao }),
    selecao({
      rotulo: 'Pacote de origem',
      nome: 'pacoteOrigemId',
      opcoes: ordenar(linhas.filter((l) => l.pacote.id !== p.id).map((l) => ({ valor: l.pacote.id, texto: `${l.pacote.tipo} ${l.pacote.numero}` }))),
      valor: p.pacoteOrigemId,
      vazio: 'Nenhum',
    }),
    campo({ rotulo: 'Observação', nome: 'observacao', valor: p.observacao }),
    erros,
    h('div', { class: 'acoes' },
      h('button', { type: 'submit' }, editando ? 'Salvar alterações' : 'Adicionar pacote'),
      editando && h('button', { type: 'button', class: 'secundario', onclick: () => { editando = null; desenhar(); } }, 'Cancelar')));

    const colunas = [
      { titulo: 'Pacote', valor: (l) => `${l.pacote.tipo} ${l.pacote.numero}` },
      { titulo: 'Espécie', valor: (l) => l.especie?.nome ?? '—' },
      {
        titulo: 'Medidas',
        valor: (l) => (l.bitola.espessura ? `${cad.bitolas.descricao(l.bitola)} × ${formatarNumero(l.pacote.comprimento, 2)} m` : '—'),
      },
      { titulo: 'Peças (saldo de total)', classe: 'num', valor: (l) => `${l.saldo} de ${l.pacote.quantidade}` },
      { titulo: 'm³ em saldo', classe: 'num', valor: (l) => formatarNumero(l.m3Saldo, 3) },
      { titulo: 'Secagem', valor: (l) => h('span', { class: `etiqueta ${l.statusSecagem}` }, ROTULO_SECAGEM[l.statusSecagem]) },
      {
        titulo: 'Ações',
        valor: (l) => h('span', { class: 'acoes' },
          h('button', { type: 'button', class: 'secundario pequeno', onclick: () => { editando = l.pacote; desenhar(); window.scrollTo(0, 0); } }, 'Editar'),
          h('button', {
            type: 'button',
            class: 'perigo pequeno',
            onclick: async () => {
              if (!confirmar(`Excluir o pacote ${l.pacote.tipo} ${l.pacote.numero}?`)) return;
              if (await tentar(errosLista, () => servicos.pacotes.excluir(l.pacote.id))) {
                if (editando?.id === l.pacote.id) editando = null;
                await desenhar();
              }
            },
          }, 'Excluir')),
      },
    ];

    raiz.replaceChildren(form, h('h2', {}, `Pacotes (${linhas.length})`), errosLista, tabela(colunas, linhas, 'Nenhum pacote cadastrado ainda.'));
  }

  await desenhar();
  return raiz;
}
