import { h, campo, selecao, lerFormulario, tentar, tabela } from '../ui.js';
import { ROTULO_SECAGEM } from '../regras/pacote.js';
import { formatarData, hojeISO, numeroDoCampo, numeroParaCampo } from '../regras/formato.js';

export async function montarEstufa(contexto) {
  const { dados, servicos } = contexto;
  const raiz = h('section', {});

  async function desenhar() {
    const [linhas, passagens] = await Promise.all([servicos.pacotes.listarComResumo(), dados.passagens.listar()]);
    const porId = new Map(linhas.map((l) => [l.pacote.id, l]));
    const nomePacote = (id) => {
      const l = porId.get(id);
      return l ? `${l.pacote.tipo} ${l.pacote.numero}` : '(pacote removido)';
    };
    const abertas = passagens
      .filter((p) => !p.dtSaida)
      .sort((a, b) => a.dtEntrada.localeCompare(b.dtEntrada) || nomePacote(a.pacoteId).localeCompare(nomePacote(b.pacoteId), 'pt-BR', { numeric: true }));
    const fechadas = passagens.filter((p) => p.dtSaida).sort((a, b) => b.dtSaida.localeCompare(a.dtSaida));
    const elegiveis = linhas.filter((l) => l.saldo > 0 && l.statusSecagem !== 'em_estufa');
    const nomesEstufas = [...new Set(passagens.map((p) => p.estufa))];

    const errosEntrada = h('div', { class: 'erros', role: 'alert' });
    const formEntrada = h('form', {
      class: 'formulario',
      onsubmit: async (ev) => {
        ev.preventDefault();
        const f = lerFormulario(formEntrada);
        const ok = await tentar(errosEntrada, () => servicos.estufa.entrar({ ...f, umidadeEntrada: numeroDoCampo(f.umidadeEntrada) }));
        if (ok) await desenhar();
      },
    },
    h('h2', {}, 'Colocar pacote na estufa'),
    selecao({
      rotulo: 'Pacote',
      nome: 'pacoteId',
      opcoes: elegiveis.map((l) => ({
        valor: l.pacote.id,
        texto: `${l.pacote.tipo} ${l.pacote.numero} · ${l.especie?.nome ?? '—'} · ${ROTULO_SECAGEM[l.statusSecagem]}`,
      })),
      vazio: 'Escolha…',
      obrigatorio: true,
    }),
    campo({ rotulo: 'Estufa', nome: 'estufa', obrigatorio: true, lista: 'lista-estufas' }),
    h('datalist', { id: 'lista-estufas' }, nomesEstufas.map((n) => h('option', { value: n }))),
    campo({ rotulo: 'Data de entrada', nome: 'dtEntrada', tipo: 'date', valor: hojeISO(), obrigatorio: true }),
    campo({ rotulo: 'Umidade de entrada (%)', nome: 'umidadeEntrada', modo: 'decimal' }),
    campo({ rotulo: 'Tipo de secagem', nome: 'tipoSecagem' }),
    errosEntrada,
    h('div', { class: 'acoes' }, h('button', { type: 'submit' }, 'Colocar na estufa')));

    const cartoes = abertas.length
      ? abertas.map((p) => {
        const erros = h('div', { class: 'erros', role: 'alert' });
        const f = h('form', {
          onsubmit: async (ev) => {
            ev.preventDefault();
            const v = lerFormulario(f);
            const ok = await tentar(erros, () => servicos.estufa.sair(p.id, { dtSaida: v.dtSaida, umidadeSaida: numeroDoCampo(v.umidadeSaida) }));
            if (ok) await desenhar();
          },
        },
        campo({ rotulo: 'Data de saída', nome: 'dtSaida', tipo: 'date', valor: hojeISO(), obrigatorio: true }),
        campo({ rotulo: 'Umidade de saída (%)', nome: 'umidadeSaida', modo: 'decimal', obrigatorio: true }),
        h('button', { type: 'submit' }, 'Registrar saída'));
        const umidade = p.umidadeEntrada === null ? '' : ` com ${numeroParaCampo(p.umidadeEntrada)}% de umidade`;
        return h('div', { class: 'cartao' },
          h('strong', {}, nomePacote(p.pacoteId)),
          ` · ${p.estufa} · entrou em ${formatarData(p.dtEntrada)}${umidade}`,
          f,
          erros);
      })
      : h('p', { class: 'vazio' }, 'Nenhum pacote na estufa agora.');

    const colunas = [
      { titulo: 'Pacote', valor: (p) => nomePacote(p.pacoteId) },
      { titulo: 'Estufa', valor: (p) => p.estufa },
      { titulo: 'Entrada', valor: (p) => formatarData(p.dtEntrada) },
      { titulo: 'Saída', valor: (p) => formatarData(p.dtSaida) },
      { titulo: 'Umidade (entrada → saída)', classe: 'num', valor: (p) => `${numeroParaCampo(p.umidadeEntrada) || '—'} → ${numeroParaCampo(p.umidadeSaida) || '—'}` },
      { titulo: 'Secagem', valor: (p) => p.tipoSecagem || '—' },
    ];

    raiz.replaceChildren(
      formEntrada,
      h('h2', {}, `Na estufa agora (${abertas.length})`),
      h('div', {}, cartoes),
      h('h2', {}, 'Histórico'),
      tabela(colunas, fechadas, 'Nenhuma secagem concluída ainda.'),
    );
  }

  await desenhar();
  return raiz;
}
