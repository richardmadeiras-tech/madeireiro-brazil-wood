import { h, campo, selecao, lerFormulario, tabela } from '../ui.js';
import { ROTULO_SECAGEM, TIPOS_PACOTE } from '../regras/pacote.js';
import { filtrarEstoque, totaisEstoque } from '../regras/estoque.js';
import { formatarM3, formatarNumero } from '../regras/formato.js';

export async function montarEstoque(contexto) {
  const { dados, servicos } = contexto;
  const cad = servicos.cadastros;
  const [linhas, especies, bitolas, locais] = await Promise.all([
    servicos.pacotes.listarComResumo(),
    dados.especies.listar(),
    dados.bitolas.listar(),
    dados.locais.listar(),
  ]);
  const opcoes = (lista, servico) => lista
    .map((r) => ({ valor: r.id, texto: servico.descricao(r) }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'pt-BR', { numeric: true }));

  const colunas = [
    { titulo: 'Pacote', valor: (l) => `${l.pacote.tipo} ${l.pacote.numero}` },
    { titulo: 'Espécie', valor: (l) => l.especie?.nome ?? '—' },
    { titulo: 'Medidas', valor: (l) => (l.bitola.espessura ? `${cad.bitolas.descricao(l.bitola)} × ${formatarNumero(l.pacote.comprimento, 2)} m` : '—') },
    { titulo: 'Qualidade', valor: (l) => l.pacote.qualidade || '—' },
    { titulo: 'Local', valor: (l) => l.local?.nome ?? '—' },
    { titulo: 'Peças', classe: 'num', valor: (l) => (l.saldo === l.pacote.quantidade ? l.saldo : `${l.saldo} de ${l.pacote.quantidade}`) },
    { titulo: 'm³ em saldo', classe: 'num', valor: (l) => formatarNumero(l.m3Saldo, 3) },
    { titulo: 'Secagem', valor: (l) => h('span', { class: `etiqueta ${l.statusSecagem}` }, ROTULO_SECAGEM[l.statusSecagem]) },
  ];

  const filtros = {};
  const resultado = h('div', {});

  function atualizar() {
    const visiveis = filtrarEstoque(linhas, filtros);
    const t = totaisEstoque(visiveis);
    resultado.replaceChildren(
      h('p', { class: 'totais' }, `${t.pacotes} pacote(s) · ${t.pecas} peça(s) · ${formatarM3(t.m3Bruto)} brutos · ${formatarM3(t.m3Comercial)} comerciais`),
      tabela(colunas, visiveis, linhas.length ? 'Nenhum pacote encontrado com esses filtros.' : 'Nenhum pacote cadastrado ainda. Comece pela tela Pacotes.'),
    );
  }

  const form = h('form', {
    class: 'filtros',
    onsubmit: (ev) => ev.preventDefault(),
    oninput: () => { Object.assign(filtros, lerFormulario(form)); atualizar(); },
  },
  selecao({ rotulo: 'Tipo', nome: 'tipo', opcoes: TIPOS_PACOTE.map((t) => ({ valor: t, texto: t })), vazio: 'Todos' }),
  selecao({ rotulo: 'Espécie', nome: 'especieId', opcoes: opcoes(especies, cad.especies), vazio: 'Todas' }),
  selecao({ rotulo: 'Bitola', nome: 'bitolaId', opcoes: opcoes(bitolas, cad.bitolas), vazio: 'Todas' }),
  selecao({ rotulo: 'Local', nome: 'localId', opcoes: opcoes(locais, cad.locais), vazio: 'Todos' }),
  selecao({
    rotulo: 'Secagem',
    nome: 'statusSecagem',
    opcoes: Object.entries(ROTULO_SECAGEM).map(([valor, texto]) => ({ valor, texto })),
    vazio: 'Todas',
  }),
  campo({ rotulo: 'Qualidade contém', nome: 'qualidade' }),
  campo({ rotulo: 'Mostrar pacotes sem saldo', nome: 'incluirZerados', tipo: 'checkbox' }));

  atualizar();
  return h('section', {}, h('h2', {}, 'Estoque'), form, resultado);
}
