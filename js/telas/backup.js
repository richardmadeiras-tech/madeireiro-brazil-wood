import { h, tentar, tabela, confirmar, baixarArquivo } from '../ui.js';
import { exportarBackup, validarBackup, resumirImportacao, importarBackup } from '../dados/backup.js';
import { lerUltimoBackup, guardarUltimoBackup } from '../dados/ultimoBackup.js';
import { ErroDeRegra, exigir } from '../servicos/erro.js';
import { formatarData } from '../regras/formato.js';

const ROTULOS = {
  especies: 'Espécies',
  bitolas: 'Bitolas',
  locais: 'Locais de estoque',
  pessoas: 'Clientes e fornecedores',
  veiculos: 'Veículos',
  pacotes: 'Pacotes',
  passagens: 'Passagens pela estufa',
  romaneios: 'Romaneios',
  itens: 'Itens de romaneio',
};

export async function montarBackup(contexto) {
  const { armazem } = contexto;
  const errosExportar = h('div', { class: 'erros', role: 'alert' });
  const erros = h('div', { class: 'erros', role: 'alert' });
  const previa = h('div', {});
  const estado = h('p', {});

  function mostrarEstado() {
    const ultimo = lerUltimoBackup();
    estado.textContent = ultimo
      ? `Último backup exportado em ${formatarData(ultimo.slice(0, 10))}.`
      : 'Você ainda não exportou nenhum backup neste aparelho.';
  }

  async function exportar(prefixo) {
    const backup = await exportarBackup(armazem);
    baixarArquivo(`${prefixo}-${backup.exportadoEm.slice(0, 10)}.json`, JSON.stringify(backup));
    guardarUltimoBackup(backup.exportadoEm);
    mostrarEstado();
  }

  let ocupado = false;
  async function comTrava(botao, acao) {
    if (ocupado) return false;
    ocupado = true;
    botao.disabled = true;
    try {
      return await acao();
    } finally {
      ocupado = false;
      botao.disabled = false;
    }
  }

  async function escolherArquivo(ev) {
    previa.replaceChildren();
    const entrada = ev.target;
    const arquivo = entrada.files[0];
    if (!arquivo) return;
    const lido = await tentar(erros, async () => {
      let backup;
      try {
        backup = JSON.parse(await arquivo.text());
      } catch {
        throw new ErroDeRegra(['O arquivo não é um backup válido: não consegui ler o conteúdo.']);
      }
      exigir(validarBackup(backup));
      const resumo = await resumirImportacao(armazem, backup);
      previa.replaceChildren(
        h('h2', {}, 'O que vai mudar'),
        h('p', {}, `Backup exportado em ${formatarData(String(backup.exportadoEm ?? '').slice(0, 10)) || 'data desconhecida'}. Os dados deste aparelho serão substituídos pelos do backup.`),
        tabela([
          { titulo: 'Item', valor: (r) => ROTULOS[r.colecao] },
          { titulo: 'Agora', classe: 'num', valor: (r) => r.atuais },
          { titulo: 'No backup', classe: 'num', valor: (r) => r.noBackup },
        ], resumo),
        h('div', { class: 'acoes' },
          h('button', {
            type: 'button',
            class: 'perigo',
            onclick: async (ev) => {
              if (ocupado) return;
              if (!confirmar('Substituir TODOS os dados deste aparelho pelo backup? Uma cópia dos dados atuais será baixada antes.')) return;
              const ok = await comTrava(ev.currentTarget, () => tentar(erros, async () => {
                await exportar('copia-antes-da-importacao');
                await importarBackup(armazem, backup);
              }));
              if (ok) {
                entrada.value = '';
                previa.replaceChildren(h('p', { class: 'totais' }, 'Backup importado com sucesso. Abra o Estoque para conferir.'));
              }
            },
          }, 'Substituir meus dados por este backup'),
          h('button', {
            type: 'button',
            class: 'secundario',
            onclick: () => { entrada.value = ''; previa.replaceChildren(); },
          }, 'Cancelar')),
      );
    });
    if (!lido) entrada.value = '';
  }

  mostrarEstado();
  return h('section', {},
    h('h2', {}, 'Exportar backup'),
    h('p', {}, 'Baixa um arquivo com todos os seus dados. Guarde-o em lugar seguro (por exemplo, no Google Drive). É também assim que você leva os dados do computador para o celular e de volta.'),
    estado,
    h('div', { class: 'acoes' },
      h('button', {
        type: 'button',
        onclick: async (ev) => { await comTrava(ev.currentTarget, () => tentar(errosExportar, () => exportar('backup-madeireiro'))); },
      }, 'Exportar backup agora')),
    errosExportar,
    h('h2', {}, 'Importar backup'),
    h('p', {}, 'Escolha um arquivo de backup. Antes de substituir qualquer coisa, o app mostra o que vai mudar e baixa uma cópia dos dados atuais.'),
    h('input', { type: 'file', accept: 'application/json,.json', onchange: escolherArquivo }),
    erros,
    previa,
  );
}
