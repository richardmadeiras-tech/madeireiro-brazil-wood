const VERSAO = 'madeireiro-brazil-wood-v1';
const ARQUIVOS = [
  './',
  'index.html',
  'estilo.css',
  'manifest.webmanifest',
  'icone.svg',
  'icone-192.png',
  'icone-512.png',
  'js/app.js',
  'js/ui.js',
  'js/regras/cadastros.js',
  'js/regras/estoque.js',
  'js/regras/formato.js',
  'js/regras/medidas.js',
  'js/regras/pacote.js',
  'js/regras/romaneio.js',
  'js/dados/backup.js',
  'js/dados/colecoes.js',
  'js/dados/index.js',
  'js/dados/indexeddb.js',
  'js/dados/memoria.js',
  'js/dados/repositorio.js',
  'js/dados/ultimoBackup.js',
  'js/servicos/cadastros.js',
  'js/servicos/erro.js',
  'js/servicos/estufa.js',
  'js/servicos/index.js',
  'js/servicos/pacotes.js',
  'js/servicos/romaneios.js',
  'js/telas/backup.js',
  'js/telas/cadastros.js',
  'js/telas/estoque.js',
  'js/telas/estufa.js',
  'js/telas/pacotes.js',
  'js/telas/romaneios.js',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(VERSAO)
      .then((c) => c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;
  ev.respondWith(
    fetch(ev.request)
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(VERSAO).then((c) => c.put(ev.request, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(ev.request, { ignoreSearch: true })),
  );
});
