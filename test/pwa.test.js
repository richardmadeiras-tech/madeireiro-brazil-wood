import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function arquivos(pasta) {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
}

test('o service worker guarda todos os arquivos js do app (senão o offline quebra)', () => {
  const sw = readFileSync('sw.js', 'utf8');
  for (const arquivo of arquivos('js')) {
    const caminho = arquivo.replaceAll(String.fromCharCode(92), '/');
    assert.ok(sw.includes(`'${caminho}'`), `${caminho} não está na lista de sw.js`);
  }
});

test('o service worker lista só arquivos que existem', () => {
  const sw = readFileSync('sw.js', 'utf8');
  const lista = sw.match(/const ARQUIVOS = \[([\s\S]*?)\];/)[1];
  const itens = [...lista.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.ok(itens.length > 20);
  for (const item of itens) {
    const caminho = item === './' ? 'index.html' : item;
    assert.ok(existsSync(caminho), `${item} está em sw.js mas não existe`);
  }
});

test('o manifesto aponta para ícones e página inicial que existem', () => {
  const manifesto = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
  assert.ok(manifesto.icons.some((i) => i.sizes === '192x192'));
  assert.ok(manifesto.icons.some((i) => i.sizes === '512x512'));
  for (const icone of manifesto.icons) assert.ok(existsSync(icone.src), `${icone.src} não existe`);
  assert.ok(existsSync(manifesto.start_url.replace('./', '')));
});

test('o index.html liga o manifesto', () => {
  assert.match(readFileSync('index.html', 'utf8'), /rel="manifest" href="manifest\.webmanifest"/);
});
