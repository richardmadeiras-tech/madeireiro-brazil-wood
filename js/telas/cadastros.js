import { h, campo, selecao, lerFormulario, tentar, tabela, confirmar } from '../ui.js';
import { numeroDoCampo, numeroParaCampo } from '../regras/formato.js';

const TIPOS = {
  especies: {
    titulo: 'Espécies',
    campos: [
      { nome: 'nome', rotulo: 'Nome', obrigatorio: true },
      { nome: 'nomeCientifico', rotulo: 'Nome científico' },
      { nome: 'apelido', rotulo: 'Apelido' },
    ],
  },
  bitolas: {
    titulo: 'Bitolas',
    campos: [
      { nome: 'espessura', rotulo: 'Espessura (cm)', numero: true, obrigatorio: true },
      { nome: 'largura', rotulo: 'Largura (cm)', numero: true, obrigatorio: true },
    ],
  },
  locais: {
    titulo: 'Locais de estoque',
    campos: [{ nome: 'nome', rotulo: 'Nome', obrigatorio: true }],
  },
  pessoas: {
    titulo: 'Clientes e fornecedores',
    campos: [
      { nome: 'nome', rotulo: 'Nome', obrigatorio: true },
      { nome: 'tipo', rotulo: 'Tipo', opcoes: [{ valor: 'cliente', texto: 'Cliente' }, { valor: 'fornecedor', texto: 'Fornecedor' }] },
      { nome: 'documento', rotulo: 'CPF ou CNPJ' },
      { nome: 'telefone', rotulo: 'Telefone' },
      { nome: 'observacao', rotulo: 'Observação' },
    ],
  },
  veiculos: {
    titulo: 'Veículos',
    campos: [
      { nome: 'placa', rotulo: 'Placa', obrigatorio: true },
      { nome: 'descricao', rotulo: 'Descrição' },
    ],
  },
};

export async function montarCadastros(contexto) {
  const raiz = h('section', {});
  let tipo = 'especies';
  let editando = null;

  async function desenhar() {
    const def = TIPOS[tipo];
    const servico = contexto.servicos.cadastros[tipo];
    const registros = (await servico.listar()).sort((a, b) =>
      servico.descricao(a).localeCompare(servico.descricao(b), 'pt-BR', { numeric: true }));
    const erros = h('div', { class: 'erros', role: 'alert' });
    const errosLista = h('div', { class: 'erros', role: 'alert' });

    const form = h('form', {
      class: 'formulario',
      onsubmit: async (ev) => {
        ev.preventDefault();
        const bruto = lerFormulario(form);
        const entrada = {};
        for (const c of def.campos) entrada[c.nome] = c.numero ? numeroDoCampo(bruto[c.nome]) : bruto[c.nome];
        const ok = await tentar(erros, () => (editando ? servico.atualizar(editando.id, entrada) : servico.criar(entrada)));
        if (ok) {
          editando = null;
          await desenhar();
        }
      },
    },
    h('h2', {}, editando ? `Editar: ${servico.descricao(editando)}` : 'Adicionar'),
    def.campos.map((c) => (c.opcoes
      ? selecao({ rotulo: c.rotulo, nome: c.nome, opcoes: c.opcoes, valor: editando?.[c.nome] ?? c.opcoes[0].valor })
      : campo({
        rotulo: c.rotulo,
        nome: c.nome,
        valor: c.numero ? numeroParaCampo(editando?.[c.nome]) : (editando?.[c.nome] ?? ''),
        obrigatorio: c.obrigatorio,
        modo: c.numero ? 'decimal' : null,
      }))),
    erros,
    h('div', { class: 'acoes' },
      h('button', { type: 'submit' }, editando ? 'Salvar alterações' : 'Adicionar'),
      editando && h('button', { type: 'button', class: 'secundario', onclick: () => { editando = null; desenhar(); } }, 'Cancelar')));

    const colunas = [
      ...def.campos.map((c) => ({
        titulo: c.rotulo,
        valor: (r) => {
          if (c.opcoes) return c.opcoes.find((o) => o.valor === r[c.nome])?.texto ?? r[c.nome];
          return c.numero ? numeroParaCampo(r[c.nome]) : (r[c.nome] ?? '');
        },
      })),
      {
        titulo: 'Ações',
        valor: (r) => h('span', { class: 'acoes' },
          h('button', { type: 'button', class: 'secundario pequeno', onclick: async () => { editando = r; await desenhar(); window.scrollTo(0, 0); } }, 'Editar'),
          h('button', {
            type: 'button',
            class: 'perigo pequeno',
            onclick: async () => {
              if (!confirmar(`Excluir "${servico.descricao(r)}"?`)) return;
              if (await tentar(errosLista, () => servico.excluir(r.id))) {
                if (editando?.id === r.id) editando = null;
                await desenhar();
              }
            },
          }, 'Excluir')),
      },
    ];

    raiz.replaceChildren(
      h('nav', { class: 'abas' }, Object.entries(TIPOS).map(([chave, d]) =>
        h('button', { type: 'button', class: chave === tipo ? '' : 'secundario', onclick: () => { tipo = chave; editando = null; desenhar(); } }, d.titulo))),
      form,
      h('h2', {}, TIPOS[tipo].titulo),
      errosLista,
      tabela(colunas, registros),
    );
  }

  await desenhar();
  return raiz;
}
