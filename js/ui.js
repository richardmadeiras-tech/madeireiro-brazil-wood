import { ErroDeRegra } from './servicos/erro.js';

export function h(tag, atributos, ...filhos) {
  const el = document.createElement(tag);
  let valor;
  for (const [chave, v] of Object.entries(atributos ?? {})) {
    if (v === false || v === null || v === undefined) continue;
    if (chave === 'value') valor = v;
    else if (chave === 'class') el.className = v;
    else if (chave.startsWith('on')) el.addEventListener(chave.slice(2), v);
    else if (v === true) el.setAttribute(chave, '');
    else el.setAttribute(chave, String(v));
  }
  for (const f of filhos.flat(Infinity)) {
    if (f === null || f === undefined || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  if (valor !== undefined) el.value = valor;
  return el;
}

export function campo({ rotulo, nome, valor = '', tipo = 'text', obrigatorio = false, modo = null, lista = null }) {
  if (tipo === 'checkbox') {
    return h('label', { class: 'campo campo-marcar' },
      h('input', { type: 'checkbox', name: nome, checked: Boolean(valor) }),
      h('span', {}, rotulo));
  }
  return h('label', { class: 'campo' },
    h('span', {}, rotulo),
    h('input', { type: tipo, name: nome, value: valor ?? '', required: obrigatorio, inputmode: modo, list: lista }));
}

export function selecao({ rotulo, nome, opcoes, valor = '', vazio = null, obrigatorio = false }) {
  const todas = vazio === null ? opcoes : [{ valor: '', texto: vazio }, ...opcoes];
  return h('label', { class: 'campo' },
    h('span', {}, rotulo),
    h('select', { name: nome, value: valor ?? '', required: obrigatorio },
      todas.map((o) => h('option', { value: o.valor }, o.texto))));
}

export function lerFormulario(form) {
  const dados = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    dados[el.name] = el.type === 'checkbox' ? el.checked : el.value;
  }
  return dados;
}

export function mostrarErros(elemento, erro) {
  elemento.replaceChildren();
  if (!erro) return;
  const lista = erro instanceof ErroDeRegra && erro.erros.length
    ? erro.erros
    : [`Não consegui gravar: ${erro.message || String(erro)}`];
  elemento.append(...lista.map((t) => h('p', {}, t)));
}

export async function tentar(elementoErros, acao) {
  mostrarErros(elementoErros, null);
  try {
    await acao();
    return true;
  } catch (e) {
    mostrarErros(elementoErros, e ?? new Error('erro desconhecido'));
    return false;
  }
}

export function tabela(colunas, linhas, textoVazio = 'Nada cadastrado ainda.') {
  if (!linhas.length) return h('p', { class: 'vazio' }, textoVazio);
  return h('div', { class: 'rolagem' },
    h('table', {},
      h('thead', {}, h('tr', {}, colunas.map((c) => h('th', { class: c.classe }, c.titulo)))),
      h('tbody', {}, linhas.map((l) =>
        h('tr', {}, colunas.map((c) => h('td', { class: c.classe, 'data-rotulo': c.titulo }, c.valor(l))))))));
}

export function confirmar(texto) {
  return window.confirm(texto);
}

export function baixarArquivo(nome, texto, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([texto], { type: `${tipo};charset=utf-8` }));
  const a = h('a', { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
