import { abrirArmazemIndexedDB } from './dados/indexeddb.js';
import { criarDados } from './dados/index.js';
import { criarServicos } from './servicos/index.js';
import { precisaLembrarBackup } from './dados/backup.js';
import { lerUltimoBackup } from './dados/ultimoBackup.js';
import { h } from './ui.js';
import { montarCadastros } from './telas/cadastros.js';
import { montarPacotes } from './telas/pacotes.js';
import { montarEstufa } from './telas/estufa.js';
import { montarRomaneios } from './telas/romaneios.js';
import { montarEstoque } from './telas/estoque.js';
import { montarBackup } from './telas/backup.js';

// -- telas: cada tarefa de tela acrescenta uma linha de import acima e uma entrada abaixo --
const TELAS = {
  cadastros: montarCadastros,
  pacotes: montarPacotes,
  estufa: montarEstufa,
  romaneios: montarRomaneios,
  estoque: montarEstoque,
  backup: montarBackup,
};

async function mostrarAviso(contexto) {
  const area = document.getElementById('aviso');
  area.replaceChildren();
  try {
    const pacotes = await contexto.dados.pacotes.listar();
    if (pacotes.length && precisaLembrarBackup(lerUltimoBackup(), new Date().toISOString())) {
      area.append(h('div', { class: 'lembrete' },
        'Faz tempo que você não exporta um backup dos seus dados. ',
        h('a', { href: '#/backup' }, 'Exportar agora')));
    }
  } catch {
    // o aviso é opcional: se falhar, a tela continua normal
  }
}

let ultimoDesenho = 0;

async function desenhar(contexto) {
  const meu = ++ultimoDesenho;
  const nome = location.hash.replace(/^#\//, '') || 'estoque';
  const raiz = document.getElementById('tela');
  for (const a of document.querySelectorAll('#menu a')) {
    a.classList.toggle('ativo', a.getAttribute('href') === `#/${nome}`);
  }
  const montar = Object.hasOwn(TELAS, nome) ? TELAS[nome] : TELAS.estoque;
  if (!montar) {
    raiz.replaceChildren(h('p', { class: 'vazio' }, 'Esta tela ainda não foi instalada.'));
    return;
  }
  try {
    const tela = await montar(contexto);
    if (meu !== ultimoDesenho) return;
    raiz.replaceChildren(tela);
  } catch (e) {
    if (meu !== ultimoDesenho) return;
    raiz.replaceChildren(h('div', { class: 'erros', role: 'alert' }, h('p', {}, `Não consegui abrir esta tela: ${e?.message || e}`)));
  }
  await mostrarAviso(contexto);
}

async function iniciar() {
  const raiz = document.getElementById('tela');
  let contexto;
  try {
    const armazem = await abrirArmazemIndexedDB();
    const dados = criarDados(armazem);
    contexto = { armazem, dados, servicos: criarServicos(dados) };
    navigator.storage?.persist?.();
  } catch (e) {
    raiz.replaceChildren(h('div', { class: 'erro-grave' },
      h('h2', {}, 'O app não conseguiu abrir o armazenamento de dados'),
      h('p', {}, e.message),
      h('p', {}, 'Saia do modo anônimo, libere o armazenamento do site nas configurações do navegador e recarregue a página.')));
    return;
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  const desenharSeguro = () => desenhar(contexto).catch((e) => {
    raiz.replaceChildren(h('div', { class: 'erros', role: 'alert' }, h('p', {}, `Não consegui abrir esta tela: ${e?.message || e}`)));
  });
  window.addEventListener('hashchange', desenharSeguro);
  await desenharSeguro();
}

iniciar();
