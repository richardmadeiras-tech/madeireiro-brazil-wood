# App Madeireiro Brazil Wood: plano de implementação da v1

> **Para quem for executar:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendada) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam caixas de marcação (`- [ ]`) para acompanhar o andamento.

**Objetivo:** construir a v1 do app web instalável da Brazil Wood para controlar pacotes de madeira serrada, estufa, estoque e romaneios de venda.

**Arquitetura:** app web estático (PWA) em JavaScript puro, sem frameworks e sem servidor. Três camadas: `regras/` (funções puras e testadas), `dados/` + `servicos/` (gravação no IndexedDB e regras de negócio que combinam cadastros) e `telas/` (interface). Os dados ficam no aparelho; a troca entre PC e celular é por arquivo de backup.

**Tecnologias:** HTML, CSS e JavaScript (módulos ES), IndexedDB, service worker, `node:test` para os testes (Node 24, sem dependências), Python 3 só para gerar os ícones PNG uma vez.

**Spec:** `docs/superpowers/specs/2026-10-13-app-madeireiro-brazil-wood-design.md`

## Restrições globais

- Sem frameworks, sem bibliotecas externas, sem servidor, sem custo mensal.
- Interface toda em português do Brasil; números no formato `1.234,56`; datas exibidas como `dd/mm/aaaa`.
- Datas guardadas como texto `AAAA-MM-DD`; carimbos de sistema (`criadoEm`, `alteradoEm`, `excluidoEm`) em ISO 8601.
- Medidas: espessura e largura em **cm**, comprimento em **m**, volume em **m³**.
- Todo registro tem `id`, `criadoEm`, `alteradoEm`, `excluidoEm` (exclusão lógica; `null` quando ativo).
- Toda gravação confirma o resultado; se falhar, a tela mostra o erro e nada fica pela metade.
- Os dados nunca saem do aparelho, exceto pelo arquivo de backup que o Richard exporta.
- Nenhum dado real do app Madeireiro de terceiros entra no projeto, nem código, visual ou imagens dele.
- Testes: `npm test` (usa `node --test`). Servidor local: `npm start` em `http://localhost:8081`.

## Refinamentos em relação ao spec

Estas decisões detalham o spec e valem para todas as tarefas (o spec foi atualizado para refletir isto):

1. `statusSecagem` **não é gravado**: é calculado a partir das passagens pela estufa (sem passagem = verde; passagem sem saída = em estufa; todas com saída = seco). Assim não existe risco de ficar fora de sincronia.
2. O código QR fica **fora da v1** (exigiria biblioteca). O campo `hashQr` não existe ainda.
3. Abono: quando `somarAbono` é verdadeiro, o volume comercial usa espessura + `abonoEspessura`, largura + `abonoLargura` e comprimento + `abonoComprimento`.
4. A baixa reserva o saldo assim que o item entra num romaneio aberto (dois romaneios abertos não podem disputar as mesmas peças).
5. Romaneio aberto pode ser excluído (devolve o saldo); romaneio finalizado precisa ser reaberto antes.
6. O PDF do romaneio sai pela impressão do navegador ("Salvar como PDF"), sem biblioteca.
7. Pessoa tem um único tipo (cliente ou fornecedor).
8. Exclusão é lógica: o registro some das telas, mas continua gravado e entra no backup. A v1 não tem botão de desfazer (o repositório já tem `restaurar`, para uma tela futura).

## Foco da revisão

Entradas e falhas que o spec implica mas que nenhum teste de tarefa óbvio cobriria; cada uma tem seu teste na tarefa indicada:

1. **Falha ao gravar** (disco cheio, armazenamento bloqueado): a tela deve mostrar o erro e nada ficar gravado pela metade. Teste na Tarefa 5.
2. **Backup corrompido ou de outro app**: importar não pode apagar nem alterar os dados atuais. Teste na Tarefa 7.
3. **Número digitado com ponto decimal** (`2.5` em vez de `2,5`): o app deve recusar com mensagem, nunca gravar `25` ou `0`. Testes nas Tarefas 1 e 9.
4. **Dois romaneios abertos disputando o mesmo pacote**: a soma das baixas nunca passa do saldo. Teste na Tarefa 11.
5. **Excluir romaneio aberto**: o saldo volta ao pacote e o romaneio some das listas. Teste na Tarefa 11.

---

## Estrutura de arquivos

```
package.json              scripts npm
servir.js                 servidor local simples
Abrir.bat                 atalho para abrir no Windows
index.html                casca da página e menu
estilo.css                visual (PC e celular, impressão)
sw.js                     service worker (offline)
manifest.webmanifest      instalação como app
icone.svg, icone-192.png, icone-512.png
ferramentas/gerar_icones.py
README.md
js/app.js                 inicialização e rotas
js/ui.js                  helpers de tela (h, campo, selecao, tabela, erros)
js/regras/formato.js      números, datas
js/regras/medidas.js      volumes em m³
js/regras/pacote.js       validação, saldo, status de secagem
js/regras/romaneio.js     validação de romaneio e baixa, totais
js/regras/estoque.js      filtros e totais do estoque
js/regras/cadastros.js    validação dos cadastros
js/dados/colecoes.js      nomes das coleções
js/dados/memoria.js       armazém em memória (testes)
js/dados/indexeddb.js     armazém real do navegador
js/dados/repositorio.js   criar/atualizar/excluir com carimbos
js/dados/index.js         monta todos os repositórios
js/dados/backup.js        exportar, validar, importar
js/dados/ultimoBackup.js  data do último backup (localStorage)
js/servicos/erro.js       ErroDeRegra
js/servicos/cadastros.js  espécies, bitolas, locais, pessoas, veículos
js/servicos/pacotes.js    pacotes e resumo de estoque
js/servicos/estufa.js     entrada e saída da estufa
js/servicos/romaneios.js  romaneios, itens, baixa
js/servicos/index.js      monta os serviços
js/telas/*.js             uma tela por arquivo
test/*.test.js            testes automáticos
```

---

### Tarefa 1: Esqueleto do projeto e formatação de números e datas

**Arquivos:**
- Criar: `package.json`, `.gitignore`, `servir.js`, `Abrir.bat`
- Criar: `js/regras/formato.js`
- Teste: `test/formato.test.js`

**Interfaces:**
- Produz (usado por todas as telas): `formatarNumero(n, casas=3): string`, `formatarM3(n): string`, `formatarData(iso): string`, `lerNumero(texto): number` (NaN se inválido), `hojeISO(agora=new Date()): string`, `numeroParaCampo(v): string`, `numeroDoCampo(texto): number | ''` (vazio vira `''`, inválido vira NaN).

- [ ] **Passo 1: Criar os arquivos de esqueleto**

`package.json`:

```json
{
  "name": "app-madeireiro-brazil-wood",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "start": "node servir.js"
  }
}
```

`.gitignore`:

```
node_modules/
.superpowers/
.DS_Store
```

`servir.js`:

```js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('.', import.meta.url));
const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};
const porta = Number(process.env.PORT) || 8081;

createServer(async (req, res) => {
  let caminho;
  try {
    caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    res.writeHead(400).end('requisição inválida');
    return;
  }
  const arquivo = normalize(join(raiz, caminho === '/' ? 'index.html' : caminho));
  if (!arquivo.startsWith(raiz)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const dados = await readFile(arquivo);
    res.writeHead(200, {
      'Content-Type': tipos[extname(arquivo)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(dados);
  } catch {
    res.writeHead(404).end('não encontrado');
  }
}).listen(porta, () => console.log(`http://localhost:${porta}`));
```

`Abrir.bat`:

```bat
@echo off
cd /d "%~dp0"
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8081"
echo Madeireiro Brazil Wood rodando em http://localhost:8081 - feche esta janela para parar.
node servir.js
```

- [ ] **Passo 2: Escrever o teste que falha**

`test/formato.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatarNumero, formatarM3, formatarData, lerNumero, hojeISO, numeroParaCampo, numeroDoCampo,
} from '../js/regras/formato.js';

test('formatarNumero usa vírgula e ponto de milhar', () => {
  assert.equal(formatarNumero(1234.5, 2), '1.234,50');
  assert.equal(formatarNumero(0, 3), '0,000');
});

test('formatarM3 mostra três casas e a unidade', () => {
  assert.equal(formatarM3(2.25), '2,250 m³');
});

test('formatarData converte AAAA-MM-DD e aceita vazio', () => {
  assert.equal(formatarData('2026-10-13'), '13/10/2026');
  assert.equal(formatarData(''), '');
  assert.equal(formatarData(null), '');
});

test('lerNumero aceita vírgula e milhar do Brasil', () => {
  assert.equal(lerNumero('12,5'), 12.5);
  assert.equal(lerNumero('1.234,56'), 1234.56);
  assert.equal(lerNumero(' 7 '), 7);
  assert.equal(lerNumero('100'), 100);
});

test('lerNumero recusa o que não é número do Brasil, inclusive ponto decimal', () => {
  assert.ok(Number.isNaN(lerNumero('')));
  assert.ok(Number.isNaN(lerNumero('abc')));
  assert.ok(Number.isNaN(lerNumero('1,2,3')));
  assert.ok(Number.isNaN(lerNumero('2.5')));
  assert.ok(Number.isNaN(lerNumero('-4')));
});

test('hojeISO usa a data local', () => {
  assert.equal(hojeISO(new Date(2026, 9, 13, 23, 59)), '2026-10-13');
});

test('numeroParaCampo e numeroDoCampo fazem o caminho de ida e volta', () => {
  assert.equal(numeroParaCampo(12.5), '12,5');
  assert.equal(numeroParaCampo(null), '');
  assert.equal(numeroParaCampo(undefined), '');
  assert.equal(numeroDoCampo('12,5'), 12.5);
  assert.equal(numeroDoCampo('  '), '');
  assert.ok(Number.isNaN(numeroDoCampo('2.5')));
});
```

- [ ] **Passo 3: Rodar o teste e ver falhar**

Rodar: `npm test`
Esperado: FALHA com `Cannot find module` apontando para `js/regras/formato.js`.

- [ ] **Passo 4: Implementar**

`js/regras/formato.js`:

```js
export function formatarNumero(n, casas = 3) {
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function formatarM3(n) {
  return `${formatarNumero(n, 3)} m³`;
}

export function formatarData(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

const NUMERO_BR = /^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/;

export function lerNumero(texto) {
  const t = String(texto ?? '').trim();
  if (!NUMERO_BR.test(t)) return NaN;
  return Number(t.replace(/\./g, '').replace(',', '.'));
}

export function hojeISO(agora = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`;
}

export function numeroParaCampo(v) {
  if (v === null || v === undefined || v === '') return '';
  return String(v).replace('.', ',');
}

export function numeroDoCampo(texto) {
  if (String(texto ?? '').trim() === '') return '';
  return lerNumero(texto);
}
```

- [ ] **Passo 5: Rodar o teste e ver passar**

Rodar: `npm test`
Esperado: PASSA, 7 testes.

- [ ] **Passo 6: Commit**

```bash
git add package.json .gitignore servir.js Abrir.bat js/regras/formato.js test/formato.test.js
git commit -m "feat: esqueleto do projeto e formatação de números e datas"
```

---

### Tarefa 2: Medidas e volumes em m³

**Arquivos:**
- Criar: `js/regras/medidas.js`
- Teste: `test/medidas.test.js`

**Interfaces:**
- Consome: nada.
- Produz: `arredondar(n, casas=6)`, `volumeM3({ espessuraCm, larguraCm, comprimentoM, quantidade })`, `volumeBrutoPacote(pacote, bitola, quantidade = pacote.quantidade)`, `volumeComercialPacote(pacote, bitola, quantidade = pacote.quantidade)`. `bitola` é `{ espessura, largura }` em cm; `pacote` tem `comprimento` (m), `quantidade`, `somarAbono`, `abonoEspessura`, `abonoLargura`, `abonoComprimento`.

- [ ] **Passo 1: Escrever o teste que falha**

`test/medidas.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { arredondar, volumeM3, volumeBrutoPacote, volumeComercialPacote } from '../js/regras/medidas.js';

const bitola = { espessura: 5, largura: 15 };
const pacote = { comprimento: 3, quantidade: 100, somarAbono: false };

test('arredondar elimina ruído de ponto flutuante', () => {
  assert.equal(arredondar(0.1 + 0.2), 0.3);
  assert.equal(arredondar(1.8500000000000001), 1.85);
});

test('volumeM3 de 100 peças 5 x 15 cm com 3 m são 2,25 m³', () => {
  assert.equal(volumeM3({ espessuraCm: 5, larguraCm: 15, comprimentoM: 3, quantidade: 100 }), 2.25);
});

test('volumeBrutoPacote usa a bitola e aceita quantidade parcial', () => {
  assert.equal(volumeBrutoPacote(pacote, bitola), 2.25);
  assert.equal(volumeBrutoPacote(pacote, bitola, 40), 0.9);
  assert.equal(volumeBrutoPacote(pacote, bitola, 0), 0);
});

test('sem somarAbono o comercial é igual ao bruto, mesmo com abono preenchido', () => {
  const p = { ...pacote, abonoEspessura: 0.5, abonoLargura: 0.5, abonoComprimento: 0.1 };
  assert.equal(volumeComercialPacote(p, bitola), 2.25);
});

test('com somarAbono o comercial soma as medidas de abono', () => {
  const p = { ...pacote, somarAbono: true, abonoEspessura: 0.5, abonoLargura: 0.5, abonoComprimento: 0.1 };
  assert.equal(volumeComercialPacote(p, bitola), 2.64275);
});

test('somarAbono com abonos vazios (null) não quebra', () => {
  const p = { ...pacote, somarAbono: true, abonoEspessura: null, abonoLargura: null, abonoComprimento: null };
  assert.equal(volumeComercialPacote(p, bitola), 2.25);
});
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rodar: `node --test test/medidas.test.js`
Esperado: FALHA com `Cannot find module`.

- [ ] **Passo 3: Implementar**

`js/regras/medidas.js`:

```js
export function arredondar(n, casas = 6) {
  const f = 10 ** casas;
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function volumeM3({ espessuraCm, larguraCm, comprimentoM, quantidade }) {
  return arredondar((espessuraCm / 100) * (larguraCm / 100) * comprimentoM * quantidade);
}

export function volumeBrutoPacote(pacote, bitola, quantidade = pacote.quantidade) {
  return volumeM3({
    espessuraCm: bitola.espessura,
    larguraCm: bitola.largura,
    comprimentoM: pacote.comprimento,
    quantidade,
  });
}

export function volumeComercialPacote(pacote, bitola, quantidade = pacote.quantidade) {
  if (!pacote.somarAbono) return volumeBrutoPacote(pacote, bitola, quantidade);
  return volumeM3({
    espessuraCm: bitola.espessura + (pacote.abonoEspessura || 0),
    larguraCm: bitola.largura + (pacote.abonoLargura || 0),
    comprimentoM: pacote.comprimento + (pacote.abonoComprimento || 0),
    quantidade,
  });
}
```

- [ ] **Passo 4: Rodar o teste e ver passar**

Rodar: `node --test test/medidas.test.js`
Esperado: PASSA, 6 testes.

- [ ] **Passo 5: Commit**

```bash
git add js/regras/medidas.js test/medidas.test.js
git commit -m "feat: cálculo de volume em m³ com abono"
```

---

### Tarefa 3: Regras de pacote e secagem

**Arquivos:**
- Criar: `js/regras/pacote.js`
- Teste: `test/pacote.test.js`

**Interfaces:**
- Produz: `TIPOS_PACOTE = ['MS','PB','PF']`, `STATUS_SECAGEM = { VERDE:'verde', EM_ESTUFA:'em_estufa', SECO:'seco' }`, `ROTULO_SECAGEM = { verde:'Verde', em_estufa:'Em estufa', seco:'Seco' }`, `validarPacote(p): string[]`, `quantidadeBaixada(pacoteId, itens): number`, `saldoPacote(pacote, itens): number`, `statusSecagemDe(passagensDoPacote): string`.
- Formato esperado de `itens`: lista de `{ pacoteId, quantidadeBaixada, excluidoEm }`. De `passagens`: lista de `{ dtSaida, excluidoEm }`.

- [ ] **Passo 1: Escrever o teste que falha**

`test/pacote.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TIPOS_PACOTE, STATUS_SECAGEM, ROTULO_SECAGEM, validarPacote, quantidadeBaixada, saldoPacote, statusSecagemDe,
} from '../js/regras/pacote.js';

const base = { tipo: 'MS', numero: '100', especieId: 'e1', bitolaId: 'b1', comprimento: 3, quantidade: 100 };

test('pacote válido não tem erros', () => {
  assert.deepEqual(validarPacote(base), []);
});

test('tipos aceitos são MS, PB e PF', () => {
  assert.deepEqual(TIPOS_PACOTE, ['MS', 'PB', 'PF']);
  assert.equal(validarPacote({ ...base, tipo: 'XX' }).length, 1);
});

test('campos obrigatórios geram um erro cada', () => {
  assert.equal(validarPacote({ ...base, numero: '  ' }).length, 1);
  assert.equal(validarPacote({ ...base, especieId: '' }).length, 1);
  assert.equal(validarPacote({ ...base, bitolaId: '' }).length, 1);
});

test('comprimento e quantidade recusam zero, decimal e NaN (número digitado errado)', () => {
  assert.equal(validarPacote({ ...base, comprimento: 0 }).length, 1);
  assert.equal(validarPacote({ ...base, comprimento: NaN }).length, 1);
  assert.equal(validarPacote({ ...base, quantidade: 0 }).length, 1);
  assert.equal(validarPacote({ ...base, quantidade: 2.5 }).length, 1);
  assert.equal(validarPacote({ ...base, quantidade: NaN }).length, 1);
});

test('peso, amarras e abonos opcionais aceitam vazio mas recusam negativo e NaN', () => {
  assert.deepEqual(validarPacote({ ...base, peso: null, abonoLargura: null }), []);
  assert.equal(validarPacote({ ...base, peso: -1 }).length, 1);
  assert.equal(validarPacote({ ...base, abonoEspessura: NaN }).length, 1);
});

test('saldo é a quantidade menos as baixas ativas do próprio pacote', () => {
  const pacote = { id: 'p1', quantidade: 100 };
  const itens = [
    { pacoteId: 'p1', quantidadeBaixada: 40, excluidoEm: null },
    { pacoteId: 'p1', quantidadeBaixada: 10, excluidoEm: '2026-10-13T00:00:00.000Z' },
    { pacoteId: 'p2', quantidadeBaixada: 99, excluidoEm: null },
  ];
  assert.equal(quantidadeBaixada('p1', itens), 40);
  assert.equal(saldoPacote(pacote, itens), 60);
});

test('status de secagem: verde, em estufa e seco', () => {
  assert.equal(statusSecagemDe([]), STATUS_SECAGEM.VERDE);
  assert.equal(statusSecagemDe([{ dtSaida: '' }]), STATUS_SECAGEM.EM_ESTUFA);
  assert.equal(statusSecagemDe([{ dtSaida: '2026-10-10' }]), STATUS_SECAGEM.SECO);
  assert.equal(statusSecagemDe([{ dtSaida: '2026-10-10' }, { dtSaida: '' }]), STATUS_SECAGEM.EM_ESTUFA);
  assert.equal(statusSecagemDe([{ dtSaida: '', excluidoEm: 'x' }]), STATUS_SECAGEM.VERDE);
});

test('há um rótulo em português para cada status', () => {
  assert.equal(ROTULO_SECAGEM.em_estufa, 'Em estufa');
});
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rodar: `node --test test/pacote.test.js`
Esperado: FALHA com `Cannot find module`.

- [ ] **Passo 3: Implementar**

`js/regras/pacote.js`:

```js
export const TIPOS_PACOTE = ['MS', 'PB', 'PF'];

export const STATUS_SECAGEM = { VERDE: 'verde', EM_ESTUFA: 'em_estufa', SECO: 'seco' };

export const ROTULO_SECAGEM = { verde: 'Verde', em_estufa: 'Em estufa', seco: 'Seco' };

const OPCIONAIS_NAO_NEGATIVOS = [
  ['peso', 'O peso'],
  ['qtdAmarras', 'A quantidade de amarras'],
  ['abonoComprimento', 'O abono de comprimento'],
  ['abonoLargura', 'O abono de largura'],
  ['abonoEspessura', 'O abono de espessura'],
];

export function validarPacote(p) {
  const erros = [];
  if (!TIPOS_PACOTE.includes(p.tipo)) erros.push('Escolha o tipo do pacote (MS, PB ou PF).');
  if (!String(p.numero ?? '').trim()) erros.push('Informe o número do pacote.');
  if (!p.especieId) erros.push('Escolha a espécie.');
  if (!p.bitolaId) erros.push('Escolha a bitola.');
  if (!(p.comprimento > 0)) erros.push('O comprimento deve ser um número maior que zero (use vírgula, por exemplo 3,5).');
  if (!Number.isInteger(p.quantidade) || p.quantidade < 1) {
    erros.push('A quantidade deve ser um número inteiro de 1 ou mais.');
  }
  for (const [campo, nome] of OPCIONAIS_NAO_NEGATIVOS) {
    const v = p[campo];
    if (v !== undefined && v !== null && v !== '' && !(Number(v) >= 0)) {
      erros.push(`${nome} deve ser um número sem sinal de menos (use vírgula nos decimais).`);
    }
  }
  return erros;
}

export function quantidadeBaixada(pacoteId, itens) {
  return itens
    .filter((i) => i.pacoteId === pacoteId && !i.excluidoEm)
    .reduce((soma, i) => soma + i.quantidadeBaixada, 0);
}

export function saldoPacote(pacote, itens) {
  return pacote.quantidade - quantidadeBaixada(pacote.id, itens);
}

export function statusSecagemDe(passagens) {
  const ativas = passagens.filter((p) => !p.excluidoEm);
  if (ativas.length === 0) return STATUS_SECAGEM.VERDE;
  return ativas.some((p) => !p.dtSaida) ? STATUS_SECAGEM.EM_ESTUFA : STATUS_SECAGEM.SECO;
}
```

- [ ] **Passo 4: Rodar o teste e ver passar**

Rodar: `node --test test/pacote.test.js`
Esperado: PASSA, 8 testes.

- [ ] **Passo 5: Commit**

```bash
git add js/regras/pacote.js test/pacote.test.js
git commit -m "feat: regras de pacote, saldo e status de secagem"
```

---

### Tarefa 4: Regras de romaneio e de estoque

**Arquivos:**
- Criar: `js/regras/romaneio.js`, `js/regras/estoque.js`
- Teste: `test/romaneio.test.js`, `test/estoque.test.js`

**Interfaces:**
- Consome: `arredondar` de `js/regras/medidas.js`.
- Produz:
  - `validarRomaneio({ data, clienteId }): string[]`
  - `validarBaixa({ pacote, saldo, quantidade, jaNoRomaneio }): string[]` (`pacote.numero` entra na mensagem)
  - `totaisRomaneio(linhas): { pacotes, pecas, m3Bruto, m3Comercial }` com `linhas = [{ quantidade, m3Bruto, m3Comercial }]`
  - `filtrarEstoque(linhas, filtros): linhas[]` com `filtros = { incluirZerados, tipo, especieId, bitolaId, localId, statusSecagem, qualidade }`; cada linha tem `{ pacote, saldo, statusSecagem, m3Saldo, m3SaldoComercial }`
  - `totaisEstoque(linhas): { pacotes, pecas, m3Bruto, m3Comercial }`

- [ ] **Passo 1: Escrever os testes que falham**

`test/romaneio.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validarRomaneio, validarBaixa, totaisRomaneio } from '../js/regras/romaneio.js';

test('romaneio exige data no formato AAAA-MM-DD e cliente', () => {
  assert.deepEqual(validarRomaneio({ data: '2026-10-13', clienteId: 'c1' }), []);
  assert.equal(validarRomaneio({ data: '', clienteId: 'c1' }).length, 1);
  assert.equal(validarRomaneio({ data: '13/10/2026', clienteId: 'c1' }).length, 1);
  assert.equal(validarRomaneio({ data: '2026-10-13', clienteId: '' }).length, 1);
});

const pacote = { numero: '100' };

test('baixa dentro do saldo é aceita, inclusive o saldo todo', () => {
  assert.deepEqual(validarBaixa({ pacote, saldo: 60, quantidade: 60, jaNoRomaneio: false }), []);
  assert.deepEqual(validarBaixa({ pacote, saldo: 60, quantidade: 1, jaNoRomaneio: false }), []);
});

test('baixa acima do saldo diz quanto sobra', () => {
  const erros = validarBaixa({ pacote, saldo: 60, quantidade: 61, jaNoRomaneio: false });
  assert.equal(erros.length, 1);
  assert.match(erros[0], /só tem 60/);
});

test('baixa recusa zero, decimal e NaN', () => {
  for (const q of [0, 1.5, NaN, -3]) {
    assert.equal(validarBaixa({ pacote, saldo: 60, quantidade: q, jaNoRomaneio: false }).length, 1, `quantidade ${q}`);
  }
});

test('baixa recusa pacote que já está no romaneio', () => {
  const erros = validarBaixa({ pacote, saldo: 60, quantidade: 10, jaNoRomaneio: true });
  assert.equal(erros.length, 1);
  assert.match(erros[0], /já está neste romaneio/);
});

test('totaisRomaneio soma peças e volumes', () => {
  const t = totaisRomaneio([
    { quantidade: 40, m3Bruto: 0.9, m3Comercial: 1 },
    { quantidade: 10, m3Bruto: 0.225, m3Comercial: 0.25 },
  ]);
  assert.deepEqual(t, { pacotes: 2, pecas: 50, m3Bruto: 1.125, m3Comercial: 1.25 });
  assert.deepEqual(totaisRomaneio([]), { pacotes: 0, pecas: 0, m3Bruto: 0, m3Comercial: 0 });
});
```

`test/estoque.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { filtrarEstoque, totaisEstoque } from '../js/regras/estoque.js';

const linhas = [
  { pacote: { tipo: 'MS', especieId: 'e1', bitolaId: 'b1', localEstoqueId: 'l1', qualidade: 'Primeira' }, saldo: 60, statusSecagem: 'seco', m3Saldo: 1.35, m3SaldoComercial: 1.5 },
  { pacote: { tipo: 'PB', especieId: 'e2', bitolaId: 'b1', localEstoqueId: '', qualidade: 'Segunda' }, saldo: 0, statusSecagem: 'verde', m3Saldo: 0, m3SaldoComercial: 0 },
  { pacote: { tipo: 'MS', especieId: 'e2', bitolaId: 'b2', localEstoqueId: 'l1' }, saldo: 10, statusSecagem: 'verde', m3Saldo: 0.5, m3SaldoComercial: 0.5 },
];

test('por padrão esconde pacotes sem saldo', () => {
  assert.equal(filtrarEstoque(linhas).length, 2);
});

test('incluirZerados traz tudo', () => {
  assert.equal(filtrarEstoque(linhas, { incluirZerados: true }).length, 3);
});

test('filtra por espécie, tipo, local e secagem', () => {
  assert.equal(filtrarEstoque(linhas, { especieId: 'e2' }).length, 1);
  assert.equal(filtrarEstoque(linhas, { tipo: 'MS' }).length, 2);
  assert.equal(filtrarEstoque(linhas, { localId: 'l1', statusSecagem: 'seco' }).length, 1);
  assert.equal(filtrarEstoque(linhas, { bitolaId: 'b2' }).length, 1);
});

test('filtro vazio ("") não filtra', () => {
  assert.equal(filtrarEstoque(linhas, { especieId: '', tipo: '', qualidade: '' }).length, 2);
});

test('qualidade ignora maiúsculas e não quebra com pacote sem qualidade', () => {
  assert.equal(filtrarEstoque(linhas, { qualidade: 'prim' }).length, 1);
  assert.equal(filtrarEstoque(linhas, { qualidade: 'zzz' }).length, 0);
});

test('totaisEstoque soma saldo e volumes das linhas visíveis', () => {
  const t = totaisEstoque(filtrarEstoque(linhas));
  assert.deepEqual(t, { pacotes: 2, pecas: 70, m3Bruto: 1.85, m3Comercial: 2 });
});
```

- [ ] **Passo 2: Rodar os testes e ver falhar**

Rodar: `node --test test/romaneio.test.js test/estoque.test.js`
Esperado: FALHA com `Cannot find module`.

- [ ] **Passo 3: Implementar**

`js/regras/romaneio.js`:

```js
import { arredondar } from './medidas.js';

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function validarRomaneio(r) {
  const erros = [];
  if (!DATA_ISO.test(r.data ?? '')) erros.push('Informe a data do romaneio.');
  if (!r.clienteId) erros.push('Escolha o cliente.');
  return erros;
}

export function validarBaixa({ pacote, saldo, quantidade, jaNoRomaneio }) {
  const erros = [];
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    erros.push('A quantidade da baixa deve ser um número inteiro de 1 ou mais.');
  } else if (quantidade > saldo) {
    erros.push(`O pacote ${pacote.numero} só tem ${saldo} peça(s) em saldo.`);
  }
  if (jaNoRomaneio) erros.push(`O pacote ${pacote.numero} já está neste romaneio.`);
  return erros;
}

export function totaisRomaneio(linhas) {
  return {
    pacotes: linhas.length,
    pecas: linhas.reduce((s, l) => s + l.quantidade, 0),
    m3Bruto: arredondar(linhas.reduce((s, l) => s + l.m3Bruto, 0)),
    m3Comercial: arredondar(linhas.reduce((s, l) => s + l.m3Comercial, 0)),
  };
}
```

`js/regras/estoque.js`:

```js
import { arredondar } from './medidas.js';

export function filtrarEstoque(linhas, f = {}) {
  return linhas.filter((l) => {
    if (!f.incluirZerados && l.saldo <= 0) return false;
    if (f.tipo && l.pacote.tipo !== f.tipo) return false;
    if (f.especieId && l.pacote.especieId !== f.especieId) return false;
    if (f.bitolaId && l.pacote.bitolaId !== f.bitolaId) return false;
    if (f.localId && l.pacote.localEstoqueId !== f.localId) return false;
    if (f.statusSecagem && l.statusSecagem !== f.statusSecagem) return false;
    if (f.qualidade && !(l.pacote.qualidade ?? '').toLowerCase().includes(f.qualidade.toLowerCase())) return false;
    return true;
  });
}

export function totaisEstoque(linhas) {
  return {
    pacotes: linhas.length,
    pecas: linhas.reduce((s, l) => s + l.saldo, 0),
    m3Bruto: arredondar(linhas.reduce((s, l) => s + l.m3Saldo, 0)),
    m3Comercial: arredondar(linhas.reduce((s, l) => s + l.m3SaldoComercial, 0)),
  };
}
```

- [ ] **Passo 4: Rodar os testes e ver passar**

Rodar: `npm test`
Esperado: PASSA, todos os testes das Tarefas 1 a 4.

- [ ] **Passo 5: Commit**

```bash
git add js/regras/romaneio.js js/regras/estoque.js test/romaneio.test.js test/estoque.test.js
git commit -m "feat: regras de romaneio, baixa e filtros de estoque"
```

### Tarefa 5: Armazém em memória e repositórios

**Arquivos:**
- Criar: `js/dados/colecoes.js`, `js/dados/memoria.js`, `js/dados/repositorio.js`, `js/dados/index.js`
- Criar: `test/auxiliar.js` (ajudantes de teste usados pelas tarefas seguintes)
- Teste: `test/repositorio.test.js`

**Interfaces:**
- Produz:
  - `COLECOES = ['especies','bitolas','locais','pessoas','veiculos','pacotes','passagens','romaneios','itens']`
  - Contrato de **armazém** (assíncrono): `listar(colecao): Promise<registro[]>`, `obter(colecao, id): Promise<registro|null>`, `gravar(colecao, registro): Promise<void>`, `exportarTudo(): Promise<{[colecao]: registro[]}>`, `substituirTudo(dados): Promise<void>`
  - `criarArmazemMemoria()` (cumpre o contrato; usado nos testes)
  - `criarRepositorio(armazem, colecao, { agora, novoId })` com `criar(dados)`, `obter(id)`, `listar({ incluirExcluidos })`, `atualizar(id, mudancas)`, `excluir(id)`, `restaurar(id)`
  - `criarDados(armazem, opcoes)` devolve `{ armazem, especies, bitolas, locais, pessoas, veiculos, pacotes, passagens, romaneios, itens }` (cada um é um repositório)
  - Em `test/auxiliar.js`: `criarDadosDeTeste()` e `prepararCenario(dados)` (devolve `{ especie, bitola, local, cliente, pacote }`: espécie "Cumaru", bitola 5 x 15 cm, local "Pátio 1", cliente "Cliente Teste" e o pacote MS número "100" com 100 peças de 3 m, sem abono)

- [ ] **Passo 1: Escrever o teste que falha**

`test/auxiliar.js`:

```js
import { criarArmazemMemoria } from '../js/dados/memoria.js';
import { criarDados } from '../js/dados/index.js';

export function criarDadosDeTeste() {
  let n = 0;
  const opcoes = { agora: () => '2026-10-13T12:00:00.000Z', novoId: () => `id-${++n}` };
  return criarDados(criarArmazemMemoria(), opcoes);
}

export async function prepararCenario(dados) {
  const especie = await dados.especies.criar({ nome: 'Cumaru' });
  const bitola = await dados.bitolas.criar({ espessura: 5, largura: 15 });
  const local = await dados.locais.criar({ nome: 'Pátio 1' });
  const cliente = await dados.pessoas.criar({ nome: 'Cliente Teste', tipo: 'cliente' });
  const pacote = await dados.pacotes.criar({
    tipo: 'MS', numero: '100', especieId: especie.id, bitolaId: bitola.id, localEstoqueId: local.id,
    comprimento: 3, quantidade: 100, somarAbono: false,
  });
  return { especie, bitola, local, cliente, pacote };
}
```

`test/repositorio.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarArmazemMemoria } from '../js/dados/memoria.js';
import { criarDados } from '../js/dados/index.js';
import { COLECOES } from '../js/dados/colecoes.js';
import { criarDadosDeTeste } from './auxiliar.js';

test('criar grava com id e carimbos', async () => {
  const dados = criarDadosDeTeste();
  const e = await dados.especies.criar({ nome: 'Ipê' });
  assert.equal(e.id, 'id-1');
  assert.equal(e.criadoEm, '2026-10-13T12:00:00.000Z');
  assert.equal(e.alteradoEm, '2026-10-13T12:00:00.000Z');
  assert.equal(e.excluidoEm, null);
  assert.deepEqual(await dados.especies.obter(e.id), e);
});

test('ids padrão são textos únicos mesmo sem crypto.randomUUID (página aberta por http no celular)', async () => {
  const dados = criarDados(criarArmazemMemoria());
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
  try {
    const a = await dados.especies.criar({ nome: 'A' });
    const b = await dados.especies.criar({ nome: 'B' });
    assert.equal(typeof a.id, 'string');
    assert.ok(a.id.length >= 10);
    assert.notEqual(a.id, b.id);
  } finally {
    Object.defineProperty(globalThis, 'crypto', original);
  }
  const c = await dados.especies.criar({ nome: 'C' });
  assert.match(c.id, /^[0-9a-f-]{36}$/);
});

test('obter devolve null quando não existe', async () => {
  assert.equal(await criarDadosDeTeste().especies.obter('nada'), null);
});

test('o que se devolve é cópia: alterar o resultado não altera o armazém', async () => {
  const dados = criarDadosDeTeste();
  const e = await dados.especies.criar({ nome: 'Ipê' });
  e.nome = 'Outro';
  assert.equal((await dados.especies.obter(e.id)).nome, 'Ipê');
});

test('atualizar mantém id e criadoEm e muda alteradoEm', async () => {
  let t = 0;
  const dados = criarDados(criarArmazemMemoria(), { agora: () => `t${++t}`, novoId: () => 'x' });
  const e = await dados.especies.criar({ nome: 'Ipê' });
  const novo = await dados.especies.atualizar(e.id, { nome: 'Ipê amarelo', id: 'outro', criadoEm: 'falso' });
  assert.equal(novo.id, 'x');
  assert.equal(novo.criadoEm, 't1');
  assert.equal(novo.alteradoEm, 't2');
  assert.equal(novo.nome, 'Ipê amarelo');
});

test('atualizar registro inexistente dá erro', async () => {
  await assert.rejects(() => criarDadosDeTeste().especies.atualizar('nada', {}), /não encontrado/);
});

test('excluir é lógico: some da lista, continua com incluirExcluidos e pode voltar', async () => {
  const dados = criarDadosDeTeste();
  const e = await dados.especies.criar({ nome: 'Ipê' });
  await dados.especies.excluir(e.id);
  assert.equal((await dados.especies.listar()).length, 0);
  assert.equal((await dados.especies.listar({ incluirExcluidos: true })).length, 1);
  await dados.especies.restaurar(e.id);
  assert.equal((await dados.especies.listar()).length, 1);
});

test('FOCO: falha ao gravar avisa o erro e não deixa nada gravado', async () => {
  const armazem = criarArmazemMemoria();
  armazem.gravar = async () => { throw new Error('disco cheio'); };
  const dados = criarDados(armazem);
  await assert.rejects(() => dados.especies.criar({ nome: 'Ipê' }), /disco cheio/);
  assert.equal((await dados.especies.listar()).length, 0);
});

test('substituirTudo troca todo o conteúdo e exportarTudo lista todas as coleções', async () => {
  const dados = criarDadosDeTeste();
  await dados.especies.criar({ nome: 'Ipê' });
  await dados.armazem.substituirTudo({ bitolas: [{ id: 'b', espessura: 1, largura: 2 }] });
  const tudo = await dados.armazem.exportarTudo();
  assert.deepEqual(Object.keys(tudo).sort(), [...COLECOES].sort());
  assert.equal(tudo.especies.length, 0);
  assert.equal(tudo.bitolas.length, 1);
});

test('coleção desconhecida dá erro', async () => {
  await assert.rejects(() => criarArmazemMemoria().listar('coisas'), /Coleção desconhecida/);
});
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rodar: `node --test test/repositorio.test.js`
Esperado: FALHA com `Cannot find module`.

- [ ] **Passo 3: Implementar**

`js/dados/colecoes.js`:

```js
export const COLECOES = [
  'especies', 'bitolas', 'locais', 'pessoas', 'veiculos',
  'pacotes', 'passagens', 'romaneios', 'itens',
];
```

`js/dados/memoria.js`:

```js
import { COLECOES } from './colecoes.js';

export function criarArmazemMemoria() {
  let tabelas = Object.fromEntries(COLECOES.map((c) => [c, new Map()]));
  const tabela = (c) => {
    if (!tabelas[c]) throw new Error(`Coleção desconhecida: ${c}`);
    return tabelas[c];
  };
  return {
    async listar(c) {
      return [...tabela(c).values()].map((r) => structuredClone(r));
    },
    async obter(c, id) {
      const r = tabela(c).get(id);
      return r ? structuredClone(r) : null;
    },
    async gravar(c, registro) {
      tabela(c).set(registro.id, structuredClone(registro));
    },
    async exportarTudo() {
      return Object.fromEntries(COLECOES.map((c) => [c, [...tabelas[c].values()].map((r) => structuredClone(r))]));
    },
    async substituirTudo(dados) {
      tabelas = Object.fromEntries(
        COLECOES.map((c) => [c, new Map((dados[c] ?? []).map((r) => [r.id, structuredClone(r)]))]),
      );
    },
  };
}
```

`js/dados/repositorio.js`:

```js
function gerarId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const parte = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${parte()}-${parte()}`;
}

export function criarRepositorio(
  armazem,
  colecao,
  { agora = () => new Date().toISOString(), novoId = gerarId } = {},
) {
  const repo = {
    async criar(dados) {
      const t = agora();
      const registro = { ...dados, id: novoId(), criadoEm: t, alteradoEm: t, excluidoEm: null };
      await armazem.gravar(colecao, registro);
      return registro;
    },
    obter(id) {
      return armazem.obter(colecao, id);
    },
    async listar({ incluirExcluidos = false } = {}) {
      const todos = await armazem.listar(colecao);
      return incluirExcluidos ? todos : todos.filter((r) => !r.excluidoEm);
    },
    async atualizar(id, mudancas) {
      const atual = await armazem.obter(colecao, id);
      if (!atual) throw new Error('Registro não encontrado.');
      const registro = { ...atual, ...mudancas, id: atual.id, criadoEm: atual.criadoEm, alteradoEm: agora() };
      await armazem.gravar(colecao, registro);
      return registro;
    },
    excluir(id) {
      return repo.atualizar(id, { excluidoEm: agora() });
    },
    restaurar(id) {
      return repo.atualizar(id, { excluidoEm: null });
    },
  };
  return repo;
}
```

`js/dados/index.js`:

```js
import { criarRepositorio } from './repositorio.js';

export function criarDados(armazem, opcoes) {
  const r = (colecao) => criarRepositorio(armazem, colecao, opcoes);
  return {
    armazem,
    especies: r('especies'),
    bitolas: r('bitolas'),
    locais: r('locais'),
    pessoas: r('pessoas'),
    veiculos: r('veiculos'),
    pacotes: r('pacotes'),
    passagens: r('passagens'),
    romaneios: r('romaneios'),
    itens: r('itens'),
  };
}
```

- [ ] **Passo 4: Rodar o teste e ver passar**

Rodar: `npm test`
Esperado: PASSA, todos os testes até aqui.

- [ ] **Passo 5: Commit**

```bash
git add js/dados test/auxiliar.js test/repositorio.test.js
git commit -m "feat: armazém em memória e repositórios com exclusão lógica"
```

---

### Tarefa 6: Armazém IndexedDB (navegador)

**Arquivos:**
- Criar: `js/dados/indexeddb.js`

**Interfaces:**
- Consome: `COLECOES` de `js/dados/colecoes.js`.
- Produz: `abrirArmazemIndexedDB(nome = 'madeireiro-brazil-wood'): Promise<armazem>` cumprindo o mesmo contrato de armazém da Tarefa 5. Se o navegador não tiver IndexedDB ou bloquear, a promessa **rejeita** (nunca cai em memória em silêncio, para não perder dados).

O IndexedDB só existe no navegador, então esta tarefa é verificada no navegador (Passo 3), não pelo `npm test`.

- [ ] **Passo 1: Implementar**

`js/dados/indexeddb.js`:

```js
import { COLECOES } from './colecoes.js';

function pedido(req) {
  return new Promise((ok, erro) => {
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
}

function transacao(db, nomes, modo, fn) {
  return new Promise((ok, erro) => {
    let tx;
    try {
      tx = db.transaction(nomes, modo, { durability: 'strict' });
    } catch (e) {
      erro(e);
      return;
    }
    let resultado;
    tx.oncomplete = () => ok(resultado);
    tx.onerror = () => erro(tx.error);
    tx.onabort = () => erro(tx.error || new Error('A gravação foi cancelada pelo navegador.'));
    Promise.resolve()
      .then(() => fn(tx))
      .then((r) => { resultado = r; }, (e) => { erro(e); try { tx.abort(); } catch { /* já encerrada */ } });
  });
}

function montar(db) {
  return {
    listar: (c) => transacao(db, [c], 'readonly', (tx) => pedido(tx.objectStore(c).getAll())),
    obter: async (c, id) => (await transacao(db, [c], 'readonly', (tx) => pedido(tx.objectStore(c).get(id)))) ?? null,
    gravar: (c, registro) => transacao(db, [c], 'readwrite', (tx) => { tx.objectStore(c).put(registro); }),
    exportarTudo: async () => {
      const saida = {};
      await transacao(db, COLECOES, 'readonly', async (tx) => {
        for (const c of COLECOES) saida[c] = await pedido(tx.objectStore(c).getAll());
      });
      return saida;
    },
    substituirTudo: (dados) => transacao(db, COLECOES, 'readwrite', (tx) => {
      for (const c of COLECOES) {
        const loja = tx.objectStore(c);
        loja.clear();
        for (const registro of dados[c] ?? []) loja.put(registro);
      }
    }),
  };
}

export function abrirArmazemIndexedDB(nome = 'madeireiro-brazil-wood') {
  return new Promise((ok, erro) => {
    if (typeof indexedDB === 'undefined') {
      erro(new Error('Este navegador não oferece armazenamento local.'));
      return;
    }
    const abrir = indexedDB.open(nome, 1);
    abrir.onupgradeneeded = () => {
      for (const c of COLECOES) abrir.result.createObjectStore(c, { keyPath: 'id' });
    };
    abrir.onerror = () => erro(abrir.error || new Error('O navegador não deixou abrir o armazenamento local.'));
    abrir.onblocked = () => erro(new Error('O armazenamento local está bloqueado por outra aba do app. Feche as outras abas.'));
    abrir.onsuccess = () => ok(montar(abrir.result));
  });
}
```

- [ ] **Passo 2: Commit**

```bash
git add js/dados/indexeddb.js
git commit -m "feat: armazém IndexedDB com gravação confirmada"
```

- [ ] **Passo 3: Verificação no navegador** (feita na Tarefa 12, depois que a página existir; o passo está descrito lá com o código exato).

---

### Tarefa 7: Backup (exportar, validar e importar)

**Arquivos:**
- Criar: `js/dados/backup.js`, `js/dados/ultimoBackup.js`
- Teste: `test/backup.test.js`

**Interfaces:**
- Consome: `COLECOES`; armazém (Tarefa 5).
- Produz:
  - `APP_BACKUP = 'madeireiro-brazil-wood'`, `VERSAO_BACKUP = 1`
  - `exportarBackup(armazem, agora?) → { app, versao, exportadoEm, colecoes }`
  - `validarBackup(backup) → string[]` (vazio = válido)
  - `resumirImportacao(armazem, backup) → [{ colecao, atuais, noBackup }]` (conta só registros ativos)
  - `importarBackup(armazem, backup)`: valida; se houver erros, lança `Error` **sem tocar nos dados**
  - `precisaLembrarBackup(ultimoISO, agoraISO, dias = 7): boolean`
  - `lerUltimoBackup(): string | null` e `guardarUltimoBackup(iso)` (localStorage protegido por try/catch)

- [ ] **Passo 1: Escrever o teste que falha**

`test/backup.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_BACKUP, VERSAO_BACKUP, exportarBackup, validarBackup, resumirImportacao, importarBackup, precisaLembrarBackup,
} from '../js/dados/backup.js';
import { criarDadosDeTeste, prepararCenario } from './auxiliar.js';

test('exportar e importar devolvem os mesmos dados, inclusive excluídos', async () => {
  const dados = criarDadosDeTeste();
  const cen = await prepararCenario(dados);
  const apagada = await dados.especies.criar({ nome: 'Apagada' });
  await dados.especies.excluir(apagada.id);
  const backup = await exportarBackup(dados.armazem, () => '2026-10-13T12:00:00.000Z');
  assert.equal(backup.app, APP_BACKUP);
  assert.equal(backup.versao, VERSAO_BACKUP);
  assert.equal(backup.exportadoEm, '2026-10-13T12:00:00.000Z');

  const outros = criarDadosDeTeste();
  await importarBackup(outros.armazem, JSON.parse(JSON.stringify(backup)));
  assert.equal((await outros.pacotes.obter(cen.pacote.id)).numero, '100');
  assert.equal((await outros.especies.listar({ incluirExcluidos: true })).length, 2);
  assert.equal((await outros.especies.listar()).length, 1);
});

test('importar substitui o que havia antes', async () => {
  const origem = criarDadosDeTeste();
  await origem.especies.criar({ nome: 'Só no backup' });
  const backup = await exportarBackup(origem.armazem);
  const destino = criarDadosDeTeste();
  await prepararCenario(destino);
  await importarBackup(destino.armazem, backup);
  assert.equal((await destino.pacotes.listar()).length, 0);
  assert.equal((await destino.especies.listar()).length, 1);
});

test('validarBackup aceita um backup bom', async () => {
  const dados = criarDadosDeTeste();
  assert.deepEqual(validarBackup(await exportarBackup(dados.armazem)), []);
});

test('FOCO: backup corrompido ou de outro app é recusado e os dados atuais ficam intactos', async () => {
  const dados = criarDadosDeTeste();
  await prepararCenario(dados);
  const bom = await exportarBackup(dados.armazem);

  const ruins = [
    null,
    'texto solto',
    {},
    { ...bom, app: 'outro-app' },
    { ...bom, versao: 99 },
    { ...bom, versao: 'x' },
    { ...bom, colecoes: null },
    { ...bom, colecoes: { ...bom.colecoes, pacotes: 'não é lista' } },
    { ...bom, colecoes: { ...bom.colecoes, pacotes: [{ semId: true }] } },
  ];
  for (const ruim of ruins) {
    assert.ok(validarBackup(ruim).length > 0, `deveria recusar ${JSON.stringify(ruim)?.slice(0, 40)}`);
    await assert.rejects(() => importarBackup(dados.armazem, ruim));
  }
  assert.equal((await dados.pacotes.listar()).length, 1, 'os dados atuais não podem mudar');
  assert.equal((await dados.especies.listar()).length, 1);
});

test('resumirImportacao compara registros ativos de agora e do backup', async () => {
  const dados = criarDadosDeTeste();
  await prepararCenario(dados);
  const vazio = criarDadosDeTeste();
  const backupVazio = await exportarBackup(vazio.armazem);
  const resumo = await resumirImportacao(dados.armazem, backupVazio);
  const pacotes = resumo.find((r) => r.colecao === 'pacotes');
  assert.deepEqual(pacotes, { colecao: 'pacotes', atuais: 1, noBackup: 0 });
});

test('precisaLembrarBackup: nunca, recente e antigo', () => {
  const agora = '2026-10-13T12:00:00.000Z';
  assert.equal(precisaLembrarBackup(null, agora), true);
  assert.equal(precisaLembrarBackup('2026-10-12T12:00:00.000Z', agora), false);
  assert.equal(precisaLembrarBackup('2026-10-06T12:00:00.000Z', agora), true);
  assert.equal(precisaLembrarBackup('2026-10-06T12:00:01.000Z', agora), false);
  assert.equal(precisaLembrarBackup('2026-10-10T12:00:00.000Z', agora, 3), true);
});
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rodar: `node --test test/backup.test.js`
Esperado: FALHA com `Cannot find module`.

- [ ] **Passo 3: Implementar**

`js/dados/backup.js`:

```js
import { COLECOES } from './colecoes.js';

export const APP_BACKUP = 'madeireiro-brazil-wood';
export const VERSAO_BACKUP = 1;

export async function exportarBackup(armazem, agora = () => new Date().toISOString()) {
  return {
    app: APP_BACKUP,
    versao: VERSAO_BACKUP,
    exportadoEm: agora(),
    colecoes: await armazem.exportarTudo(),
  };
}

export function validarBackup(backup) {
  if (!backup || typeof backup !== 'object') return ['O arquivo não é um backup válido.'];
  const erros = [];
  if (backup.app !== APP_BACKUP) erros.push('Este arquivo não é um backup do App Madeireiro Brazil Wood.');
  if (!Number.isInteger(backup.versao) || backup.versao > VERSAO_BACKUP) {
    erros.push('Este backup é de uma versão que este app não conhece.');
  }
  if (!backup.colecoes || typeof backup.colecoes !== 'object') {
    erros.push('O backup não tem dados.');
    return erros;
  }
  for (const c of COLECOES) {
    const lista = backup.colecoes[c];
    if (!Array.isArray(lista)) {
      erros.push(`Faltam os dados de "${c}".`);
    } else if (lista.some((r) => !r || typeof r.id !== 'string' || !r.id)) {
      erros.push(`Há registros sem identificação em "${c}".`);
    }
  }
  return erros;
}

export async function resumirImportacao(armazem, backup) {
  const atuais = await armazem.exportarTudo();
  const ativos = (lista) => (lista ?? []).filter((r) => !r.excluidoEm).length;
  return COLECOES.map((colecao) => ({
    colecao,
    atuais: ativos(atuais[colecao]),
    noBackup: ativos(backup.colecoes[colecao]),
  }));
}

export async function importarBackup(armazem, backup) {
  const erros = validarBackup(backup);
  if (erros.length) throw new Error(erros.join(' '));
  await armazem.substituirTudo(backup.colecoes);
}

export function precisaLembrarBackup(ultimoISO, agoraISO, dias = 7) {
  if (!ultimoISO) return true;
  return (Date.parse(agoraISO) - Date.parse(ultimoISO)) / 86400000 >= dias;
}
```

`js/dados/ultimoBackup.js`:

```js
const CHAVE = 'madeireiro:ultimoBackup';

export function lerUltimoBackup() {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function guardarUltimoBackup(iso) {
  try {
    localStorage.setItem(CHAVE, iso);
  } catch {
    /* sem localStorage: o lembrete só fica mais insistente */
  }
}
```

- [ ] **Passo 4: Rodar o teste e ver passar**

Rodar: `npm test`
Esperado: PASSA.

- [ ] **Passo 5: Commit**

```bash
git add js/dados/backup.js js/dados/ultimoBackup.js test/backup.test.js
git commit -m "feat: backup com validação, resumo e lembrete"
```

---

### Tarefa 8: Serviço de cadastros

**Arquivos:**
- Criar: `js/servicos/erro.js`, `js/regras/cadastros.js`, `js/servicos/cadastros.js`
- Teste: `test/cadastros.test.js`

**Interfaces:**
- Produz:
  - `class ErroDeRegra extends Error` com `.erros: string[]`; `exigir(erros)` lança `ErroDeRegra` se a lista não for vazia
  - `normalizarPlaca(texto)`: maiúsculas, só letras e números
  - `validarEspecie`, `validarBitola`, `validarLocal`, `validarPessoa`, `validarVeiculo` (cada um devolve `string[]`)
  - `criarServicoCadastros(dados)` devolve `{ especies, bitolas, locais, pessoas, veiculos }`; cada um tem `rotulo`, `descricao(registro)`, `listar()`, `criar(entrada)`, `atualizar(id, entrada)`, `excluir(id)`. Erros de regra saem como `ErroDeRegra`.
- Campos: espécie `{nome, nomeCientifico, apelido}`; bitola `{espessura, largura}` (números, cm); local `{nome}`; pessoa `{nome, tipo('cliente'|'fornecedor'), documento, telefone, observacao}`; veículo `{placa, descricao}`.
- Não dá para excluir espécie/bitola/local que algum pacote ativo use, nem pessoa/veículo que algum romaneio ativo use.

- [ ] **Passo 1: Escrever o teste que falha**

`test/cadastros.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarServicoCadastros } from '../js/servicos/cadastros.js';
import { ErroDeRegra } from '../js/servicos/erro.js';
import { normalizarPlaca } from '../js/regras/cadastros.js';
import { criarDadosDeTeste, prepararCenario } from './auxiliar.js';

const montar = () => {
  const dados = criarDadosDeTeste();
  return { dados, cad: criarServicoCadastros(dados) };
};

test('normalizarPlaca deixa maiúsculas sem traço', () => {
  assert.equal(normalizarPlaca('abc-1d23'), 'ABC1D23');
  assert.equal(normalizarPlaca(null), '');
});

test('cria espécie com espaços aparados', async () => {
  const { cad } = montar();
  const e = await cad.especies.criar({ nome: '  Cumaru ' });
  assert.equal(e.nome, 'Cumaru');
  assert.equal(e.nomeCientifico, '');
});

test('recusa espécie sem nome com ErroDeRegra', async () => {
  const { cad } = montar();
  await assert.rejects(
    () => cad.especies.criar({ nome: '  ' }),
    (e) => e instanceof ErroDeRegra && /nome da espécie/.test(e.message),
  );
});

test('recusa espécie repetida ignorando maiúsculas, mas deixa editar o próprio registro', async () => {
  const { cad } = montar();
  const e = await cad.especies.criar({ nome: 'Cumaru' });
  await assert.rejects(() => cad.especies.criar({ nome: 'cumaru' }), /Já existe/);
  const igual = await cad.especies.atualizar(e.id, { nome: 'Cumaru', apelido: 'Ipê-cumaru' });
  assert.equal(igual.apelido, 'Ipê-cumaru');
});

test('bitola exige medidas positivas e recusa repetida', async () => {
  const { cad } = montar();
  await assert.rejects(() => cad.bitolas.criar({ espessura: NaN, largura: 15 }), ErroDeRegra);
  await assert.rejects(() => cad.bitolas.criar({ espessura: 0, largura: 15 }), ErroDeRegra);
  const b = await cad.bitolas.criar({ espessura: '5', largura: 15 });
  assert.equal(b.espessura, 5);
  await assert.rejects(() => cad.bitolas.criar({ espessura: 5, largura: 15 }), /Já existe/);
  assert.equal(cad.bitolas.descricao(b), '5 x 15 cm');
});

test('pessoa exige nome e tipo válido', async () => {
  const { cad } = montar();
  await assert.rejects(() => cad.pessoas.criar({ nome: 'Ana', tipo: 'outro' }), ErroDeRegra);
  const p = await cad.pessoas.criar({ nome: 'Ana', tipo: 'cliente' });
  assert.equal(p.tipo, 'cliente');
});

test('placa é normalizada e placa repetida é recusada mesmo escrita diferente', async () => {
  const { cad } = montar();
  const v = await cad.veiculos.criar({ placa: 'abc-1d23' });
  assert.equal(v.placa, 'ABC1D23');
  await assert.rejects(() => cad.veiculos.criar({ placa: 'ABC1D23' }), /Já existe/);
  await assert.rejects(() => cad.veiculos.criar({ placa: '--' }), ErroDeRegra);
});

test('não exclui item em uso, mas exclui item livre', async () => {
  const { dados, cad } = montar();
  const cen = await prepararCenario(dados);
  await assert.rejects(() => cad.especies.excluir(cen.especie.id), /em uso/);
  await assert.rejects(() => cad.bitolas.excluir(cen.bitola.id), /em uso/);
  await assert.rejects(() => cad.locais.excluir(cen.local.id), /em uso/);
  const livre = await cad.especies.criar({ nome: 'Ipê' });
  await cad.especies.excluir(livre.id);
  assert.equal((await cad.especies.listar()).length, 1);
});

test('não exclui cliente nem veículo usados em romaneio ativo', async () => {
  const { dados, cad } = montar();
  const cen = await prepararCenario(dados);
  const v = await cad.veiculos.criar({ placa: 'AAA1A11' });
  await dados.romaneios.criar({ numero: 1, data: '2026-10-13', clienteId: cen.cliente.id, veiculoId: v.id, status: 'aberto' });
  await assert.rejects(() => cad.pessoas.excluir(cen.cliente.id), /em uso/);
  await assert.rejects(() => cad.veiculos.excluir(v.id), /em uso/);
});
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rodar: `node --test test/cadastros.test.js`
Esperado: FALHA com `Cannot find module`.

- [ ] **Passo 3: Implementar**

`js/servicos/erro.js`:

```js
export class ErroDeRegra extends Error {
  constructor(erros) {
    super(erros.join(' '));
    this.name = 'ErroDeRegra';
    this.erros = erros;
  }
}

export function exigir(erros) {
  if (erros.length) throw new ErroDeRegra(erros);
}
```

`js/regras/cadastros.js`:

```js
const vazio = (v) => !String(v ?? '').trim();

export const normalizarPlaca = (texto) => String(texto ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function validarEspecie(e) {
  return vazio(e.nome) ? ['Informe o nome da espécie.'] : [];
}

export function validarBitola(b) {
  const erros = [];
  if (!(b.espessura > 0)) erros.push('A espessura deve ser um número maior que zero, em cm (use vírgula, por exemplo 2,5).');
  if (!(b.largura > 0)) erros.push('A largura deve ser um número maior que zero, em cm (use vírgula, por exemplo 14,5).');
  return erros;
}

export function validarLocal(l) {
  return vazio(l.nome) ? ['Informe o nome do local de estoque.'] : [];
}

export function validarPessoa(p) {
  const erros = [];
  if (vazio(p.nome)) erros.push('Informe o nome.');
  if (!['cliente', 'fornecedor'].includes(p.tipo)) erros.push('Escolha se é cliente ou fornecedor.');
  return erros;
}

export function validarVeiculo(v) {
  return vazio(v.placa) ? ['Informe a placa do veículo.'] : [];
}
```

`js/servicos/cadastros.js`:

```js
import { ErroDeRegra, exigir } from './erro.js';
import {
  normalizarPlaca, validarBitola, validarEspecie, validarLocal, validarPessoa, validarVeiculo,
} from '../regras/cadastros.js';

const texto = (v) => String(v ?? '').trim();

const DEFINICOES = {
  especies: {
    rotulo: 'espécie',
    artigo: 'uma',
    limpar: (e) => ({ nome: texto(e.nome), nomeCientifico: texto(e.nomeCientifico), apelido: texto(e.apelido) }),
    validar: validarEspecie,
    chave: (e) => e.nome.toLowerCase(),
    descricao: (e) => e.nome,
    uso: ['pacotes', 'especieId'],
  },
  bitolas: {
    rotulo: 'bitola',
    artigo: 'uma',
    limpar: (b) => ({ espessura: Number(b.espessura), largura: Number(b.largura) }),
    validar: validarBitola,
    chave: (b) => `${b.espessura}x${b.largura}`,
    descricao: (b) => `${String(b.espessura).replace('.', ',')} x ${String(b.largura).replace('.', ',')} cm`,
    uso: ['pacotes', 'bitolaId'],
  },
  locais: {
    rotulo: 'local de estoque',
    artigo: 'um',
    limpar: (l) => ({ nome: texto(l.nome) }),
    validar: validarLocal,
    chave: (l) => l.nome.toLowerCase(),
    descricao: (l) => l.nome,
    uso: ['pacotes', 'localEstoqueId'],
  },
  pessoas: {
    rotulo: 'pessoa',
    artigo: 'uma',
    limpar: (p) => ({
      nome: texto(p.nome), tipo: texto(p.tipo), documento: texto(p.documento),
      telefone: texto(p.telefone), observacao: texto(p.observacao),
    }),
    validar: validarPessoa,
    chave: (p) => `${p.tipo}:${p.nome.toLowerCase()}`,
    descricao: (p) => p.nome,
    uso: ['romaneios', 'clienteId'],
  },
  veiculos: {
    rotulo: 'veículo',
    artigo: 'um',
    limpar: (v) => ({ placa: normalizarPlaca(v.placa), descricao: texto(v.descricao) }),
    validar: validarVeiculo,
    chave: (v) => v.placa,
    descricao: (v) => v.placa,
    uso: ['romaneios', 'veiculoId'],
  },
};

export function criarServicoCadastros(dados) {
  const servicos = {};
  for (const [tipo, def] of Object.entries(DEFINICOES)) {
    const repo = dados[tipo];

    async function preparar(entrada, idAtual) {
      const limpo = def.limpar(entrada);
      exigir(def.validar(limpo));
      const repetido = (await repo.listar()).some((r) => r.id !== idAtual && def.chave(r) === def.chave(limpo));
      if (repetido) throw new ErroDeRegra([`Já existe ${def.artigo} ${def.rotulo} "${def.descricao(limpo)}".`]);
      return limpo;
    }

    servicos[tipo] = {
      rotulo: def.rotulo,
      descricao: def.descricao,
      listar: () => repo.listar(),
      criar: async (entrada) => repo.criar(await preparar(entrada, null)),
      atualizar: async (id, entrada) => repo.atualizar(id, await preparar(entrada, id)),
      excluir: async (id) => {
        const [colecao, campo] = def.uso;
        const emUso = (await dados[colecao].listar()).some((r) => r[campo] === id);
        if (emUso) {
          const este = def.artigo === 'um' ? 'este' : 'esta';
          throw new ErroDeRegra([`Não dá para excluir: ${este} ${def.rotulo} está em uso.`]);
        }
        return repo.excluir(id);
      },
    };
  }
  return servicos;
}
```

- [ ] **Passo 4: Rodar o teste e ver passar**

Rodar: `npm test`
Esperado: PASSA.

- [ ] **Passo 5: Commit**

```bash
git add js/servicos/erro.js js/regras/cadastros.js js/servicos/cadastros.js test/cadastros.test.js
git commit -m "feat: serviço de cadastros com validação, duplicidade e proteção de uso"
```

### Tarefa 9: Serviço de pacotes

**Arquivos:**
- Criar: `js/servicos/pacotes.js`
- Teste: `test/pacotes.test.js`

**Interfaces:**
- Consome: `validarPacote`, `quantidadeBaixada`, `saldoPacote`, `statusSecagemDe` (Tarefa 3); `volumeBrutoPacote`, `volumeComercialPacote` (Tarefa 2); `ErroDeRegra`, `exigir` (Tarefa 8); repositórios `dados.*` (Tarefa 5).
- Produz: `criarServicoPacotes(dados)` com:
  - `criar(entrada)`, `atualizar(id, entrada)`, `excluir(id)`
  - `listarComResumo()` devolve `[{ pacote, especie, bitola, local, saldo, statusSecagem, m3Bruto, m3Comercial, m3Saldo, m3SaldoComercial }]` ordenado por tipo e número (número em ordem natural). `especie`, `bitola` e `local` podem ser `null` se o cadastro sumiu (backup antigo); a bitola ausente conta como 0 x 0.
- Entrada aceita texto ou número nos campos numéricos; vazios viram `null` nos opcionais (`peso`, `qtdAmarras`, `abono*`).
- Campos gravados: `tipo, numero, numeroAutex, numeroControleInterno, especieId, bitolaId, localEstoqueId, pacoteOrigemId, comprimento, quantidade, peso, qtdAmarras, qualidade, abonoComprimento, abonoLargura, abonoEspessura, somarAbono, dtRecebimento, dtEntradaEstoque, dtFinalizacao, observacao`.

- [ ] **Passo 1: Escrever o teste que falha**

`test/pacotes.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarServicoPacotes } from '../js/servicos/pacotes.js';
import { ErroDeRegra } from '../js/servicos/erro.js';
import { criarDadosDeTeste, prepararCenario } from './auxiliar.js';

async function montar() {
  const dados = criarDadosDeTeste();
  const cen = await prepararCenario(dados);
  return { dados, cen, pacotes: criarServicoPacotes(dados) };
}

const entrada = (cen, extra = {}) => ({
  tipo: 'MS', numero: '200', especieId: cen.especie.id, bitolaId: cen.bitola.id,
  localEstoqueId: cen.local.id, comprimento: '3', quantidade: '50', ...extra,
});

test('criar normaliza os campos', async () => {
  const { cen, pacotes } = await montar();
  const p = await pacotes.criar(entrada(cen, { numero: ' 200 ', peso: '' }));
  assert.equal(p.numero, '200');
  assert.equal(p.comprimento, 3);
  assert.equal(p.quantidade, 50);
  assert.equal(p.peso, null);
  assert.equal(p.somarAbono, false);
});

test('mesmo número no mesmo tipo é recusado, em outro tipo é aceito', async () => {
  const { cen, pacotes } = await montar();
  await assert.rejects(() => pacotes.criar(entrada(cen, { numero: '100' })), /Já existe o pacote MS número 100/);
  const pb = await pacotes.criar(entrada(cen, { tipo: 'PB', numero: '100' }));
  assert.equal(pb.tipo, 'PB');
});

test('recusa espécie, bitola, local ou origem que não existem', async () => {
  const { cen, pacotes } = await montar();
  await assert.rejects(() => pacotes.criar(entrada(cen, { especieId: 'nada' })), /espécie escolhida não existe/);
  await assert.rejects(() => pacotes.criar(entrada(cen, { bitolaId: 'nada' })), /bitola escolhida não existe/);
  await assert.rejects(() => pacotes.criar(entrada(cen, { localEstoqueId: 'nada' })), /local de estoque escolhido não existe/);
  await assert.rejects(() => pacotes.criar(entrada(cen, { pacoteOrigemId: 'nada' })), /pacote de origem não existe/);
});

test('FOCO: número digitado com ponto decimal chega como NaN e é recusado com mensagem', async () => {
  const { cen, pacotes } = await montar();
  await assert.rejects(
    () => pacotes.criar(entrada(cen, { comprimento: NaN })),
    (e) => e instanceof ErroDeRegra && /comprimento/.test(e.message),
  );
  await assert.rejects(() => pacotes.criar(entrada(cen, { quantidade: NaN })), /quantidade/);
  await assert.rejects(() => pacotes.criar(entrada(cen, { peso: NaN })), /peso/);
});

test('atualizar não deixa a quantidade ficar abaixo do que já foi baixado', async () => {
  const { dados, cen, pacotes } = await montar();
  await dados.itens.criar({ romaneioId: 'r1', pacoteId: cen.pacote.id, quantidadeBaixada: 40 });
  await assert.rejects(
    () => pacotes.atualizar(cen.pacote.id, entrada(cen, { numero: '100', quantidade: 30 })),
    /abaixo do que já foi baixado \(40\)/,
  );
  const ok = await pacotes.atualizar(cen.pacote.id, entrada(cen, { numero: '100', quantidade: 40 }));
  assert.equal(ok.quantidade, 40);
});

test('atualizar pacote inexistente dá erro de regra', async () => {
  const { cen, pacotes } = await montar();
  await assert.rejects(() => pacotes.atualizar('nada', entrada(cen)), ErroDeRegra);
});

test('excluir recusa pacote com baixa ou com passagem pela estufa e aceita pacote livre', async () => {
  const { dados, cen, pacotes } = await montar();
  await dados.itens.criar({ romaneioId: 'r1', pacoteId: cen.pacote.id, quantidadeBaixada: 1 });
  await assert.rejects(() => pacotes.excluir(cen.pacote.id), /já tem baixas/);

  const livre = await pacotes.criar(entrada(cen));
  await dados.passagens.criar({ pacoteId: livre.id, dtEntrada: '2026-10-10', dtSaida: '' });
  await assert.rejects(() => pacotes.excluir(livre.id), /estufa/);

  const outro = await pacotes.criar(entrada(cen, { numero: '300' }));
  await pacotes.excluir(outro.id);
  assert.equal((await dados.pacotes.listar()).length, 2);
});

test('listarComResumo calcula saldo, volumes e status de secagem', async () => {
  const { dados, cen, pacotes } = await montar();
  await dados.itens.criar({ romaneioId: 'r1', pacoteId: cen.pacote.id, quantidadeBaixada: 40 });
  let [r] = await pacotes.listarComResumo();
  assert.equal(r.saldo, 60);
  assert.equal(r.m3Bruto, 2.25);
  assert.equal(r.m3Saldo, 1.35);
  assert.equal(r.m3SaldoComercial, 1.35);
  assert.equal(r.statusSecagem, 'verde');
  assert.equal(r.especie.nome, 'Cumaru');
  assert.equal(r.bitola.largura, 15);
  assert.equal(r.local.nome, 'Pátio 1');

  await dados.passagens.criar({ pacoteId: cen.pacote.id, dtEntrada: '2026-10-10', dtSaida: '' });
  [r] = await pacotes.listarComResumo();
  assert.equal(r.statusSecagem, 'em_estufa');
});

test('listarComResumo ordena por tipo e número natural e não quebra com cadastro sumido', async () => {
  const { dados, cen, pacotes } = await montar();
  await pacotes.criar(entrada(cen, { numero: '20' }));
  await pacotes.criar(entrada(cen, { tipo: 'PB', numero: '1' }));
  await pacotes.criar(entrada(cen, { numero: '9' }));
  await dados.bitolas.excluir(cen.bitola.id);
  const nomes = (await pacotes.listarComResumo()).map((l) => `${l.pacote.tipo}${l.pacote.numero}`);
  assert.deepEqual(nomes, ['MS9', 'MS20', 'MS100', 'PB1']);
});
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rodar: `node --test test/pacotes.test.js`
Esperado: FALHA com `Cannot find module`.

- [ ] **Passo 3: Implementar**

`js/servicos/pacotes.js`:

```js
import { validarPacote, quantidadeBaixada, saldoPacote, statusSecagemDe } from '../regras/pacote.js';
import { volumeBrutoPacote, volumeComercialPacote } from '../regras/medidas.js';
import { ErroDeRegra, exigir } from './erro.js';

const texto = (v) => String(v ?? '').trim();
const opcional = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
const BITOLA_VAZIA = { espessura: 0, largura: 0 };
const mapa = (lista) => new Map(lista.map((r) => [r.id, r]));

function limpar(e) {
  return {
    tipo: e.tipo,
    numero: texto(e.numero),
    numeroAutex: texto(e.numeroAutex),
    numeroControleInterno: texto(e.numeroControleInterno),
    especieId: e.especieId || '',
    bitolaId: e.bitolaId || '',
    localEstoqueId: e.localEstoqueId || '',
    pacoteOrigemId: e.pacoteOrigemId || '',
    comprimento: Number(e.comprimento),
    quantidade: Number(e.quantidade),
    peso: opcional(e.peso),
    qtdAmarras: opcional(e.qtdAmarras),
    qualidade: texto(e.qualidade),
    abonoComprimento: opcional(e.abonoComprimento),
    abonoLargura: opcional(e.abonoLargura),
    abonoEspessura: opcional(e.abonoEspessura),
    somarAbono: Boolean(e.somarAbono),
    dtRecebimento: texto(e.dtRecebimento),
    dtEntradaEstoque: texto(e.dtEntradaEstoque),
    dtFinalizacao: texto(e.dtFinalizacao),
    observacao: texto(e.observacao),
  };
}

export function criarServicoPacotes(dados) {
  async function existe(repo, id) {
    const r = await repo.obter(id);
    return Boolean(r) && !r.excluidoEm;
  }

  async function conferirReferencias(p) {
    const erros = [];
    if (p.especieId && !(await existe(dados.especies, p.especieId))) erros.push('A espécie escolhida não existe mais.');
    if (p.bitolaId && !(await existe(dados.bitolas, p.bitolaId))) erros.push('A bitola escolhida não existe mais.');
    if (p.localEstoqueId && !(await existe(dados.locais, p.localEstoqueId))) {
      erros.push('O local de estoque escolhido não existe mais.');
    }
    if (p.pacoteOrigemId && !(await existe(dados.pacotes, p.pacoteOrigemId))) {
      erros.push('O pacote de origem não existe mais.');
    }
    return erros;
  }

  async function conferirNumero(p, idAtual) {
    const outros = await dados.pacotes.listar();
    const repetido = outros.some(
      (o) => o.id !== idAtual && o.tipo === p.tipo && o.numero.toLowerCase() === p.numero.toLowerCase(),
    );
    return repetido ? [`Já existe o pacote ${p.tipo} número ${p.numero}.`] : [];
  }

  async function conferirTudo(p, idAtual) {
    exigir(validarPacote(p));
    exigir([...(await conferirReferencias(p)), ...(await conferirNumero(p, idAtual))]);
  }

  return {
    async criar(entrada) {
      const p = limpar(entrada);
      await conferirTudo(p, null);
      return dados.pacotes.criar(p);
    },

    async atualizar(id, entrada) {
      const atual = await dados.pacotes.obter(id);
      if (!atual || atual.excluidoEm) throw new ErroDeRegra(['Pacote não encontrado.']);
      const p = limpar(entrada);
      await conferirTudo(p, id);
      const baixado = quantidadeBaixada(id, await dados.itens.listar());
      if (p.quantidade < baixado) {
        throw new ErroDeRegra([`A quantidade não pode ficar abaixo do que já foi baixado (${baixado}).`]);
      }
      return dados.pacotes.atualizar(id, p);
    },

    async excluir(id) {
      if (quantidadeBaixada(id, await dados.itens.listar()) > 0) {
        throw new ErroDeRegra(['Este pacote já tem baixas em romaneios e não pode ser excluído.']);
      }
      const passagens = (await dados.passagens.listar()).filter((x) => x.pacoteId === id);
      if (passagens.length) {
        throw new ErroDeRegra(['Este pacote já passou pela estufa e não pode ser excluído.']);
      }
      return dados.pacotes.excluir(id);
    },

    async listarComResumo() {
      const [pacotes, especies, bitolas, locais, itens, passagens] = await Promise.all([
        dados.pacotes.listar(),
        dados.especies.listar({ incluirExcluidos: true }),
        dados.bitolas.listar({ incluirExcluidos: true }),
        dados.locais.listar({ incluirExcluidos: true }),
        dados.itens.listar(),
        dados.passagens.listar(),
      ]);
      const especiePorId = mapa(especies);
      const bitolaPorId = mapa(bitolas);
      const localPorId = mapa(locais);
      return pacotes
        .map((pacote) => {
          const bitola = bitolaPorId.get(pacote.bitolaId) ?? BITOLA_VAZIA;
          const saldo = saldoPacote(pacote, itens);
          return {
            pacote,
            especie: especiePorId.get(pacote.especieId) ?? null,
            bitola,
            local: localPorId.get(pacote.localEstoqueId) ?? null,
            saldo,
            statusSecagem: statusSecagemDe(passagens.filter((x) => x.pacoteId === pacote.id)),
            m3Bruto: volumeBrutoPacote(pacote, bitola),
            m3Comercial: volumeComercialPacote(pacote, bitola),
            m3Saldo: volumeBrutoPacote(pacote, bitola, saldo),
            m3SaldoComercial: volumeComercialPacote(pacote, bitola, saldo),
          };
        })
        .sort(
          (a, b) => a.pacote.tipo.localeCompare(b.pacote.tipo)
            || a.pacote.numero.localeCompare(b.pacote.numero, 'pt-BR', { numeric: true }),
        );
    },
  };
}
```

- [ ] **Passo 4: Rodar o teste e ver passar**

Rodar: `npm test`
Esperado: PASSA.

- [ ] **Passo 5: Commit**

```bash
git add js/servicos/pacotes.js test/pacotes.test.js
git commit -m "feat: serviço de pacotes com resumo de estoque"
```

---

### Tarefa 10: Serviço de estufa

**Arquivos:**
- Criar: `js/servicos/estufa.js`
- Teste: `test/estufa.test.js`

**Interfaces:**
- Consome: `ErroDeRegra`, `exigir` (Tarefa 8); `dados.pacotes`, `dados.passagens`.
- Produz: `criarServicoEstufa(dados)` com:
  - `entrar({ pacoteId, estufa, dtEntrada, umidadeEntrada, tipoSecagem })` → passagem aberta `{ pacoteId, estufa, dtEntrada, dtSaida: '', umidadeEntrada, umidadeSaida: null, tipoSecagem }`
  - `sair(passagemId, { dtSaida, umidadeSaida })` → passagem fechada
- Regras: um pacote não pode estar em duas estufas ao mesmo tempo; data no formato `AAAA-MM-DD`; umidades entre 0 e 100 (a de entrada é opcional, a de saída é obrigatória); saída não pode ser antes da entrada.

- [ ] **Passo 1: Escrever o teste que falha**

`test/estufa.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarServicoEstufa } from '../js/servicos/estufa.js';
import { criarServicoPacotes } from '../js/servicos/pacotes.js';
import { ErroDeRegra } from '../js/servicos/erro.js';
import { criarDadosDeTeste, prepararCenario } from './auxiliar.js';

async function montar() {
  const dados = criarDadosDeTeste();
  const cen = await prepararCenario(dados);
  const estufa = criarServicoEstufa(dados);
  const pacotes = criarServicoPacotes(dados);
  const status = async () => (await pacotes.listarComResumo())[0].statusSecagem;
  return { dados, cen, estufa, status };
}

const entrada = (cen, extra = {}) => ({
  pacoteId: cen.pacote.id, estufa: 'Estufa 1', dtEntrada: '2026-10-10', umidadeEntrada: '22', tipoSecagem: 'KD', ...extra,
});

test('entrar cria passagem aberta e o pacote fica em estufa', async () => {
  const { cen, estufa, status } = await montar();
  assert.equal(await status(), 'verde');
  const p = await estufa.entrar(entrada(cen));
  assert.equal(p.dtSaida, '');
  assert.equal(p.umidadeEntrada, 22);
  assert.equal(p.umidadeSaida, null);
  assert.equal(await status(), 'em_estufa');
});

test('o mesmo pacote não entra duas vezes sem sair', async () => {
  const { cen, estufa } = await montar();
  await estufa.entrar(entrada(cen));
  await assert.rejects(() => estufa.entrar(entrada(cen)), /já está em uma estufa/);
});

test('entrar valida pacote, estufa, data e umidade', async () => {
  const { cen, estufa } = await montar();
  await assert.rejects(() => estufa.entrar(entrada(cen, { pacoteId: 'nada' })), ErroDeRegra);
  await assert.rejects(() => estufa.entrar(entrada(cen, { estufa: '  ' })), /Informe a estufa/);
  await assert.rejects(() => estufa.entrar(entrada(cen, { dtEntrada: '10/10/2026' })), /data de entrada/);
  await assert.rejects(() => estufa.entrar(entrada(cen, { umidadeEntrada: 150 })), /entre 0 e 100/);
  await assert.rejects(() => estufa.entrar(entrada(cen, { umidadeEntrada: NaN })), /entre 0 e 100/);
  const semUmidade = await estufa.entrar(entrada(cen, { umidadeEntrada: '' }));
  assert.equal(semUmidade.umidadeEntrada, null);
});

test('sair registra data e umidade e o pacote fica seco', async () => {
  const { cen, estufa, status } = await montar();
  const p = await estufa.entrar(entrada(cen));
  const fechada = await estufa.sair(p.id, { dtSaida: '2026-10-14', umidadeSaida: '12' });
  assert.equal(fechada.dtSaida, '2026-10-14');
  assert.equal(fechada.umidadeSaida, 12);
  assert.equal(await status(), 'seco');
});

test('sair valida data, ordem das datas, umidade e saída repetida', async () => {
  const { cen, estufa } = await montar();
  const p = await estufa.entrar(entrada(cen));
  await assert.rejects(() => estufa.sair(p.id, { dtSaida: 'x', umidadeSaida: 12 }), /data de saída/);
  await assert.rejects(() => estufa.sair(p.id, { dtSaida: '2026-10-09', umidadeSaida: 12 }), /antes da entrada/);
  await assert.rejects(() => estufa.sair(p.id, { dtSaida: '2026-10-14', umidadeSaida: '' }), /umidade de saída/);
  await assert.rejects(() => estufa.sair(p.id, { dtSaida: '2026-10-14', umidadeSaida: 101 }), /entre 0 e 100/);
  await estufa.sair(p.id, { dtSaida: '2026-10-14', umidadeSaida: 12 });
  await assert.rejects(() => estufa.sair(p.id, { dtSaida: '2026-10-15', umidadeSaida: 12 }), /já saiu/);
  await assert.rejects(() => estufa.sair('nada', { dtSaida: '2026-10-15', umidadeSaida: 12 }), /não encontrada/);
});

test('pacote seco pode voltar para a estufa', async () => {
  const { cen, estufa, status } = await montar();
  const p = await estufa.entrar(entrada(cen));
  await estufa.sair(p.id, { dtSaida: '2026-10-14', umidadeSaida: 12 });
  await estufa.entrar(entrada(cen, { dtEntrada: '2026-10-20' }));
  assert.equal(await status(), 'em_estufa');
});
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rodar: `node --test test/estufa.test.js`
Esperado: FALHA com `Cannot find module`.

- [ ] **Passo 3: Implementar**

`js/servicos/estufa.js`:

```js
import { ErroDeRegra, exigir } from './erro.js';

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const texto = (v) => String(v ?? '').trim();
const numeroOuNulo = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
const umidadeOk = (n) => n >= 0 && n <= 100;

export function criarServicoEstufa(dados) {
  return {
    async entrar({ pacoteId, estufa, dtEntrada, umidadeEntrada, tipoSecagem }) {
      const erros = [];
      const pacote = pacoteId ? await dados.pacotes.obter(pacoteId) : null;
      if (!pacote || pacote.excluidoEm) erros.push('Escolha um pacote.');
      if (!texto(estufa)) erros.push('Informe a estufa.');
      if (!DATA_ISO.test(dtEntrada ?? '')) erros.push('Informe a data de entrada.');
      const umidade = numeroOuNulo(umidadeEntrada);
      if (umidade !== null && !umidadeOk(umidade)) {
        erros.push('A umidade de entrada deve ficar entre 0 e 100 (use vírgula nos decimais).');
      }
      exigir(erros);
      const abertas = (await dados.passagens.listar()).filter((p) => p.pacoteId === pacoteId && !p.dtSaida);
      if (abertas.length) throw new ErroDeRegra(['Este pacote já está em uma estufa.']);
      return dados.passagens.criar({
        pacoteId,
        estufa: texto(estufa),
        dtEntrada,
        dtSaida: '',
        umidadeEntrada: umidade,
        umidadeSaida: null,
        tipoSecagem: texto(tipoSecagem),
      });
    },

    async sair(passagemId, { dtSaida, umidadeSaida }) {
      const passagem = await dados.passagens.obter(passagemId);
      if (!passagem || passagem.excluidoEm) throw new ErroDeRegra(['Passagem pela estufa não encontrada.']);
      if (passagem.dtSaida) throw new ErroDeRegra(['Este pacote já saiu da estufa.']);
      const erros = [];
      if (!DATA_ISO.test(dtSaida ?? '')) erros.push('Informe a data de saída.');
      else if (dtSaida < passagem.dtEntrada) erros.push('A data de saída não pode ser antes da entrada.');
      const umidade = numeroOuNulo(umidadeSaida);
      if (umidade === null) erros.push('Informe a umidade de saída.');
      else if (!umidadeOk(umidade)) erros.push('A umidade de saída deve ficar entre 0 e 100 (use vírgula nos decimais).');
      exigir(erros);
      return dados.passagens.atualizar(passagemId, { dtSaida, umidadeSaida: umidade });
    },
  };
}
```

- [ ] **Passo 4: Rodar o teste e ver passar**

Rodar: `npm test`
Esperado: PASSA.

- [ ] **Passo 5: Commit**

```bash
git add js/servicos/estufa.js test/estufa.test.js
git commit -m "feat: serviço de estufa com entrada, saída e umidade"
```

---

### Tarefa 11: Serviço de romaneios e baixa

**Arquivos:**
- Criar: `js/servicos/romaneios.js`, `js/servicos/index.js`
- Teste: `test/romaneios.test.js`

**Interfaces:**
- Consome: `validarRomaneio`, `validarBaixa`, `totaisRomaneio` (Tarefa 4); `saldoPacote` (Tarefa 3); `volumeBrutoPacote`, `volumeComercialPacote` (Tarefa 2); `normalizarPlaca` (Tarefa 8); `hojeISO` (Tarefa 1); `criarServicoCadastros`, `criarServicoPacotes`, `criarServicoEstufa`.
- Produz:
  - `criarServicoRomaneios(dados)` com `criar(entrada)`, `atualizar(id, entrada)`, `adicionarItem(romaneioId, { pacoteId, quantidade })`, `removerItem(itemId)`, `finalizar(id, hoje = hojeISO())`, `reabrir(id)`, `excluir(id)`, `detalhar(id)`, `listarResumo()`
  - `entrada` do romaneio: `{ data, clienteId, veiculoId, placa, notaFiscal, dof, guiaFlorestal, observacao }`; o romaneio gravado ganha `numero` (sequencial), `status` (`'aberto'` ou `'finalizado'`) e `dtFinalizacao`. Se a placa vier vazia e houver veículo, usa a placa do veículo.
  - `detalhar(id)` → `{ romaneio, cliente, veiculo, linhas: [{ item, pacote, especie, bitola, m3Bruto, m3Comercial }], totais }`
  - `listarResumo()` → `[{ romaneio, cliente, totais }]`, do número maior para o menor
  - `criarServicos(dados)` → `{ cadastros, pacotes, estufa, romaneios }`
- Regras: só romaneio **aberto** aceita alterações; `finalizar` exige ao menos um item; `excluir` só em romaneio aberto e libera as peças; a baixa reserva o saldo imediatamente.

- [ ] **Passo 1: Escrever o teste que falha**

`test/romaneios.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarServicoRomaneios } from '../js/servicos/romaneios.js';
import { criarServicoPacotes } from '../js/servicos/pacotes.js';
import { ErroDeRegra } from '../js/servicos/erro.js';
import { criarDadosDeTeste, prepararCenario } from './auxiliar.js';

async function montar() {
  const dados = criarDadosDeTeste();
  const cen = await prepararCenario(dados);
  const romaneios = criarServicoRomaneios(dados);
  const saldo = async () => (await criarServicoPacotes(dados).listarComResumo())[0].saldo;
  return { dados, cen, romaneios, saldo };
}

const entrada = (cen, extra = {}) => ({ data: '2026-10-13', clienteId: cen.cliente.id, placa: 'abc-1d23', ...extra });

test('cria romaneios numerados em sequência, abertos, com placa normalizada', async () => {
  const { cen, romaneios } = await montar();
  const a = await romaneios.criar(entrada(cen));
  const b = await romaneios.criar(entrada(cen));
  assert.equal(a.numero, 1);
  assert.equal(b.numero, 2);
  assert.equal(a.status, 'aberto');
  assert.equal(a.placa, 'ABC1D23');
});

test('usa a placa do veículo quando a placa não é digitada', async () => {
  const { dados, cen, romaneios } = await montar();
  const v = await dados.veiculos.criar({ placa: 'XYZ9K88' });
  const r = await romaneios.criar(entrada(cen, { placa: '', veiculoId: v.id }));
  assert.equal(r.placa, 'XYZ9K88');
});

test('recusa romaneio sem cliente, sem data ou com cliente que não existe', async () => {
  const { cen, romaneios } = await montar();
  await assert.rejects(() => romaneios.criar(entrada(cen, { clienteId: '' })), ErroDeRegra);
  await assert.rejects(() => romaneios.criar(entrada(cen, { data: '' })), ErroDeRegra);
  await assert.rejects(() => romaneios.criar(entrada(cen, { clienteId: 'nada' })), /cliente escolhido não existe/);
});

test('baixa parcial reduz o saldo e calcula os m³ do romaneio', async () => {
  const { cen, romaneios, saldo } = await montar();
  const r = await romaneios.criar(entrada(cen));
  await romaneios.adicionarItem(r.id, { pacoteId: cen.pacote.id, quantidade: '40' });
  const d = await romaneios.detalhar(r.id);
  assert.equal(d.totais.pecas, 40);
  assert.equal(d.totais.m3Bruto, 0.9);
  assert.equal(d.linhas[0].especie.nome, 'Cumaru');
  assert.equal(d.cliente.nome, 'Cliente Teste');
  assert.equal(await saldo(), 60);
});

test('FOCO: dois romaneios abertos não baixam mais que o saldo juntos', async () => {
  const { cen, romaneios, saldo } = await montar();
  const r1 = await romaneios.criar(entrada(cen));
  const r2 = await romaneios.criar(entrada(cen));
  await romaneios.adicionarItem(r1.id, { pacoteId: cen.pacote.id, quantidade: 70 });
  await assert.rejects(() => romaneios.adicionarItem(r2.id, { pacoteId: cen.pacote.id, quantidade: 40 }), /só tem 30/);
  await romaneios.adicionarItem(r2.id, { pacoteId: cen.pacote.id, quantidade: 30 });
  assert.equal(await saldo(), 0);
});

test('o mesmo pacote não entra duas vezes no mesmo romaneio e quantidade inválida é recusada', async () => {
  const { cen, romaneios } = await montar();
  const r = await romaneios.criar(entrada(cen));
  await romaneios.adicionarItem(r.id, { pacoteId: cen.pacote.id, quantidade: 10 });
  await assert.rejects(() => romaneios.adicionarItem(r.id, { pacoteId: cen.pacote.id, quantidade: 5 }), /já está neste romaneio/);
  const r2 = await romaneios.criar(entrada(cen));
  for (const q of [0, 2.5, NaN, '']) {
    await assert.rejects(() => romaneios.adicionarItem(r2.id, { pacoteId: cen.pacote.id, quantidade: q }), ErroDeRegra);
  }
  await assert.rejects(() => romaneios.adicionarItem(r2.id, { pacoteId: 'nada', quantidade: 1 }), /Escolha um pacote/);
});

test('remover item devolve o saldo e permite incluir o pacote de novo', async () => {
  const { cen, romaneios, saldo } = await montar();
  const r = await romaneios.criar(entrada(cen));
  const item = await romaneios.adicionarItem(r.id, { pacoteId: cen.pacote.id, quantidade: 40 });
  await romaneios.removerItem(item.id);
  assert.equal(await saldo(), 100);
  await romaneios.adicionarItem(r.id, { pacoteId: cen.pacote.id, quantidade: 100 });
  assert.equal(await saldo(), 0);
});

test('finalizar exige item, trava alterações e reabrir libera', async () => {
  const { cen, romaneios } = await montar();
  const r = await romaneios.criar(entrada(cen));
  await assert.rejects(() => romaneios.finalizar(r.id), /ao menos um pacote/);
  const item = await romaneios.adicionarItem(r.id, { pacoteId: cen.pacote.id, quantidade: 10 });
  const f = await romaneios.finalizar(r.id, '2026-10-14');
  assert.equal(f.status, 'finalizado');
  assert.equal(f.dtFinalizacao, '2026-10-14');
  await assert.rejects(() => romaneios.adicionarItem(r.id, { pacoteId: cen.pacote.id, quantidade: 1 }), /finalizado/);
  await assert.rejects(() => romaneios.removerItem(item.id), /finalizado/);
  await assert.rejects(() => romaneios.atualizar(r.id, entrada(cen)), /finalizado/);
  const reaberto = await romaneios.reabrir(r.id);
  assert.equal(reaberto.status, 'aberto');
  assert.equal(reaberto.dtFinalizacao, '');
  await romaneios.removerItem(item.id);
});

test('atualizar romaneio aberto troca os dados', async () => {
  const { cen, romaneios } = await montar();
  const r = await romaneios.criar(entrada(cen));
  const novo = await romaneios.atualizar(r.id, entrada(cen, { notaFiscal: ' 123 ', dof: 'D1' }));
  assert.equal(novo.notaFiscal, '123');
  assert.equal(novo.numero, 1);
});

test('FOCO: excluir romaneio aberto devolve o saldo e some das listas; finalizado não exclui', async () => {
  const { cen, romaneios, saldo } = await montar();
  const r = await romaneios.criar(entrada(cen));
  await romaneios.adicionarItem(r.id, { pacoteId: cen.pacote.id, quantidade: 40 });
  await romaneios.excluir(r.id);
  assert.equal(await saldo(), 100);
  assert.equal((await romaneios.listarResumo()).length, 0);
  await assert.rejects(() => romaneios.detalhar(r.id), /não encontrado/);

  const r2 = await romaneios.criar(entrada(cen));
  await romaneios.adicionarItem(r2.id, { pacoteId: cen.pacote.id, quantidade: 5 });
  await romaneios.finalizar(r2.id);
  await assert.rejects(() => romaneios.excluir(r2.id), /finalizado/);
});

test('listarResumo traz cliente e totais, do número maior para o menor', async () => {
  const { cen, romaneios } = await montar();
  const a = await romaneios.criar(entrada(cen));
  await romaneios.criar(entrada(cen));
  await romaneios.adicionarItem(a.id, { pacoteId: cen.pacote.id, quantidade: 40 });
  const resumo = await romaneios.listarResumo();
  assert.deepEqual(resumo.map((x) => x.romaneio.numero), [2, 1]);
  assert.equal(resumo[1].cliente.nome, 'Cliente Teste');
  assert.equal(resumo[1].totais.pecas, 40);
});
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rodar: `node --test test/romaneios.test.js`
Esperado: FALHA com `Cannot find module`.

- [ ] **Passo 3: Implementar**

`js/servicos/romaneios.js`:

```js
import { validarRomaneio, validarBaixa, totaisRomaneio } from '../regras/romaneio.js';
import { saldoPacote } from '../regras/pacote.js';
import { volumeBrutoPacote, volumeComercialPacote } from '../regras/medidas.js';
import { normalizarPlaca } from '../regras/cadastros.js';
import { hojeISO } from '../regras/formato.js';
import { ErroDeRegra, exigir } from './erro.js';

const texto = (v) => String(v ?? '').trim();
const BITOLA_VAZIA = { espessura: 0, largura: 0 };
const mapa = (lista) => new Map(lista.map((r) => [r.id, r]));

function limpar(e) {
  return {
    data: texto(e.data),
    clienteId: e.clienteId || '',
    veiculoId: e.veiculoId || '',
    placa: normalizarPlaca(e.placa),
    notaFiscal: texto(e.notaFiscal),
    dof: texto(e.dof),
    guiaFlorestal: texto(e.guiaFlorestal),
    observacao: texto(e.observacao),
  };
}

export function criarServicoRomaneios(dados) {
  async function preparar(entrada) {
    const r = limpar(entrada);
    const erros = validarRomaneio(r);
    if (r.clienteId) {
      const cliente = await dados.pessoas.obter(r.clienteId);
      if (!cliente || cliente.excluidoEm) erros.push('O cliente escolhido não existe mais.');
    }
    if (r.veiculoId) {
      const veiculo = await dados.veiculos.obter(r.veiculoId);
      if (!veiculo || veiculo.excluidoEm) erros.push('O veículo escolhido não existe mais.');
      else if (!r.placa) r.placa = veiculo.placa;
    }
    exigir(erros);
    return r;
  }

  async function carregar(id) {
    const r = await dados.romaneios.obter(id);
    if (!r || r.excluidoEm) throw new ErroDeRegra(['Romaneio não encontrado.']);
    return r;
  }

  async function carregarAberto(id) {
    const r = await carregar(id);
    if (r.status === 'finalizado') {
      throw new ErroDeRegra(['Este romaneio está finalizado. Reabra o romaneio para alterar.']);
    }
    return r;
  }

  const servico = {
    async criar(entrada) {
      const r = await preparar(entrada);
      const todos = await dados.romaneios.listar({ incluirExcluidos: true });
      const numero = Math.max(0, ...todos.map((x) => x.numero || 0)) + 1;
      return dados.romaneios.criar({ ...r, numero, status: 'aberto', dtFinalizacao: '' });
    },

    async atualizar(id, entrada) {
      await carregarAberto(id);
      return dados.romaneios.atualizar(id, await preparar(entrada));
    },

    async adicionarItem(romaneioId, { pacoteId, quantidade }) {
      await carregarAberto(romaneioId);
      const pacote = pacoteId ? await dados.pacotes.obter(pacoteId) : null;
      if (!pacote || pacote.excluidoEm) throw new ErroDeRegra(['Escolha um pacote.']);
      const itens = await dados.itens.listar();
      const jaNoRomaneio = itens.some((i) => i.romaneioId === romaneioId && i.pacoteId === pacoteId);
      exigir(validarBaixa({ pacote, saldo: saldoPacote(pacote, itens), quantidade: Number(quantidade), jaNoRomaneio }));
      return dados.itens.criar({ romaneioId, pacoteId, quantidadeBaixada: Number(quantidade) });
    },

    async removerItem(itemId) {
      const item = await dados.itens.obter(itemId);
      if (!item || item.excluidoEm) throw new ErroDeRegra(['Item não encontrado.']);
      await carregarAberto(item.romaneioId);
      return dados.itens.excluir(itemId);
    },

    async finalizar(id, hoje = hojeISO()) {
      await carregarAberto(id);
      const itens = (await dados.itens.listar()).filter((i) => i.romaneioId === id);
      if (itens.length === 0) throw new ErroDeRegra(['Inclua ao menos um pacote antes de finalizar.']);
      return dados.romaneios.atualizar(id, { status: 'finalizado', dtFinalizacao: hoje });
    },

    async reabrir(id) {
      await carregar(id);
      return dados.romaneios.atualizar(id, { status: 'aberto', dtFinalizacao: '' });
    },

    async excluir(id) {
      await carregarAberto(id);
      const itens = (await dados.itens.listar()).filter((i) => i.romaneioId === id);
      for (const item of itens) await dados.itens.excluir(item.id);
      return dados.romaneios.excluir(id);
    },

    async detalhar(id) {
      const romaneio = await carregar(id);
      const [itens, pacotes, especies, bitolas, cliente, veiculo] = await Promise.all([
        dados.itens.listar(),
        dados.pacotes.listar({ incluirExcluidos: true }),
        dados.especies.listar({ incluirExcluidos: true }),
        dados.bitolas.listar({ incluirExcluidos: true }),
        romaneio.clienteId ? dados.pessoas.obter(romaneio.clienteId) : null,
        romaneio.veiculoId ? dados.veiculos.obter(romaneio.veiculoId) : null,
      ]);
      const pacotePorId = mapa(pacotes);
      const especiePorId = mapa(especies);
      const bitolaPorId = mapa(bitolas);
      const linhas = itens
        .filter((i) => i.romaneioId === id)
        .flatMap((item) => {
          const pacote = pacotePorId.get(item.pacoteId);
          if (!pacote) return [];
          const bitola = bitolaPorId.get(pacote.bitolaId) ?? BITOLA_VAZIA;
          return [{
            item,
            pacote,
            especie: especiePorId.get(pacote.especieId) ?? null,
            bitola,
            m3Bruto: volumeBrutoPacote(pacote, bitola, item.quantidadeBaixada),
            m3Comercial: volumeComercialPacote(pacote, bitola, item.quantidadeBaixada),
          }];
        });
      const totais = totaisRomaneio(
        linhas.map((l) => ({ quantidade: l.item.quantidadeBaixada, m3Bruto: l.m3Bruto, m3Comercial: l.m3Comercial })),
      );
      return { romaneio, cliente, veiculo, linhas, totais };
    },

    async listarResumo() {
      const lista = await dados.romaneios.listar();
      const resumo = await Promise.all(
        lista.map(async (r) => {
          const d = await servico.detalhar(r.id);
          return { romaneio: d.romaneio, cliente: d.cliente, totais: d.totais };
        }),
      );
      return resumo.sort((a, b) => b.romaneio.numero - a.romaneio.numero);
    },
  };
  return servico;
}
```

`js/servicos/index.js`:

```js
import { criarServicoCadastros } from './cadastros.js';
import { criarServicoPacotes } from './pacotes.js';
import { criarServicoEstufa } from './estufa.js';
import { criarServicoRomaneios } from './romaneios.js';

export function criarServicos(dados) {
  return {
    cadastros: criarServicoCadastros(dados),
    pacotes: criarServicoPacotes(dados),
    estufa: criarServicoEstufa(dados),
    romaneios: criarServicoRomaneios(dados),
  };
}
```

- [ ] **Passo 4: Rodar o teste e ver passar**

Rodar: `npm test`
Esperado: PASSA, todos os testes das Tarefas 1 a 11.

- [ ] **Passo 5: Commit**

```bash
git add js/servicos/romaneios.js js/servicos/index.js test/romaneios.test.js
git commit -m "feat: serviço de romaneios com baixa reservando saldo"
```

### Tarefa 12: Base da interface (página, estilo, ajudantes e roteador)

**Arquivos:**
- Criar: `index.html`, `estilo.css`, `js/ui.js`, `js/app.js`

**Interfaces:**
- Consome: `abrirArmazemIndexedDB` (Tarefa 6), `criarDados` (Tarefa 5), `criarServicos` (Tarefa 11), `precisaLembrarBackup`, `lerUltimoBackup` (Tarefa 7), `ErroDeRegra` (Tarefa 8).
- Produz, em `js/ui.js` (usado por todas as telas):
  - `h(tag, atributos, ...filhos): HTMLElement` (atributos `on*` viram eventos; `class`; `value` é aplicado depois dos filhos; `false/null/undefined` são ignorados; filhos podem ser listas aninhadas)
  - `campo({ rotulo, nome, valor = '', tipo = 'text', obrigatorio = false, modo = null, lista = null }): HTMLLabelElement` (`tipo: 'checkbox'` usa `valor` como marcado; `modo` é `'decimal'` ou `'numeric'`, o teclado do celular)
  - `selecao({ rotulo, nome, opcoes: [{ valor, texto }], valor = '', vazio = null, obrigatorio = false })` (`vazio` é o texto da primeira opção sem valor)
  - `lerFormulario(form): { [nome]: string | boolean }`
  - `mostrarErros(elemento, erro | null)`, `async tentar(elementoErros, acao): Promise<boolean>` (limpa os erros, roda a ação, mostra `ErroDeRegra.erros` ou "Não consegui gravar: ..." para outros erros; devolve `true` se deu certo)
  - `tabela(colunas: [{ titulo, valor(linha), classe? }], linhas, textoVazio): HTMLElement`
  - `confirmar(texto): boolean`, `baixarArquivo(nome, texto, tipo = 'application/json')`
- Produz, em `js/app.js`: o objeto `TELAS = { nome: montar }`, onde cada `montar(contexto): Promise<Node>` recebe `contexto = { armazem, dados, servicos }`. As telas (Tarefas 13 a 18) são registradas aqui, uma linha de import e uma entrada em `TELAS` por tarefa. Rotas: `#/estoque` (padrão), `#/pacotes`, `#/estufa`, `#/romaneios`, `#/cadastros`, `#/backup`.

- [ ] **Passo 1: Criar `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Madeireiro Brazil Wood</title>
  <meta name="theme-color" content="#2e5d34">
  <link rel="icon" href="icone.svg" type="image/svg+xml">
  <link rel="stylesheet" href="estilo.css">
</head>
<body>
  <header class="topo nao-imprimir">
    <h1>Madeireiro Brazil Wood</h1>
    <nav id="menu">
      <a href="#/estoque">Estoque</a>
      <a href="#/pacotes">Pacotes</a>
      <a href="#/estufa">Estufa</a>
      <a href="#/romaneios">Romaneios</a>
      <a href="#/cadastros">Cadastros</a>
      <a href="#/backup">Backup</a>
    </nav>
  </header>
  <div id="aviso" class="nao-imprimir"></div>
  <main id="tela"><p>Carregando…</p></main>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Passo 2: Criar `icone.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="18" fill="#2e5d34"/><rect x="18" y="22" width="64" height="16" rx="3" fill="#c49454"/><rect x="18" y="42" width="64" height="16" rx="3" fill="#f4f1e8"/><rect x="18" y="62" width="64" height="16" rx="3" fill="#c49454"/></svg>
```

- [ ] **Passo 3: Criar `estilo.css`**

```css
:root {
  --verde: #2e5d34;
  --verde-claro: #e4eedf;
  --papel: #f6f3ea;
  --texto: #1f2a1f;
  --borda: #d6d0bd;
  --erro: #a4262c;
  --erro-fundo: #fbe9ea;
  --aviso-fundo: #fff4d6;
}
* { box-sizing: border-box; }
body { margin: 0; font: 16px/1.45 system-ui, "Segoe UI", sans-serif; background: var(--papel); color: var(--texto); }
.topo { background: var(--verde); color: #fff; padding: 10px 16px; }
.topo h1 { font-size: 1.15rem; margin: 0 0 8px; }
#menu { display: flex; flex-wrap: wrap; gap: 6px; }
#menu a { color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 6px; background: rgba(255, 255, 255, .14); }
#menu a.ativo { background: #fff; color: var(--verde); font-weight: 600; }
main { max-width: 1000px; margin: 0 auto; padding: 16px; }
h2 { font-size: 1.1rem; margin: 20px 0 8px; }
a { color: var(--verde); }

.formulario, .filtros {
  background: #fff; border: 1px solid var(--borda); border-radius: 8px; padding: 12px;
  display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); margin: 12px 0;
}
.formulario h2 { grid-column: 1 / -1; margin: 0; }
.formulario .erros, .formulario .acoes { grid-column: 1 / -1; }
.campo { display: flex; flex-direction: column; gap: 3px; font-size: .9rem; }
.campo input, .campo select { font: inherit; padding: 8px; border: 1px solid var(--borda); border-radius: 6px; background: #fff; width: 100%; }
.campo-marcar { flex-direction: row; align-items: center; gap: 8px; }
.campo-marcar input { width: auto; }
.acoes { display: flex; gap: 8px; flex-wrap: wrap; }

button { font: inherit; padding: 8px 14px; border: 0; border-radius: 6px; background: var(--verde); color: #fff; cursor: pointer; }
button.secundario { background: #e8e4d4; color: var(--texto); }
button.perigo { background: var(--erro); }
button.pequeno { padding: 4px 10px; font-size: .85rem; }
.abas { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }

.erros { background: var(--erro-fundo); color: var(--erro); border: 1px solid var(--erro); border-radius: 6px; padding: 8px 12px; margin: 8px 0; }
.erros:empty { display: none; }
.erros p { margin: 2px 0; }
.erro-grave { background: var(--erro-fundo); border: 1px solid var(--erro); border-radius: 8px; padding: 16px; }
.lembrete { background: var(--aviso-fundo); padding: 8px 16px; border-bottom: 1px solid var(--borda); }
.vazio { color: #666; font-style: italic; }
.totais { font-weight: 600; margin: 8px 0; }
.etiqueta { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: .8rem; background: #e8e4d4; }
.etiqueta.seco { background: #d3ead3; }
.etiqueta.em_estufa { background: #fde2b8; }
.etiqueta.aberto { background: #fde2b8; }
.etiqueta.finalizado { background: #d3ead3; }

.cartao { background: #fff; border: 1px solid var(--borda); border-radius: 8px; padding: 10px 12px; margin: 8px 0; }
.cartao form { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; margin-top: 8px; }

.rolagem { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; background: #fff; }
th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--borda); vertical-align: top; }
th { background: var(--verde-claro); font-size: .85rem; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }

@media (max-width: 640px) {
  main { padding: 12px; }
  table, thead, tbody, tr, th, td { display: block; }
  thead { position: absolute; left: -9999px; }
  tr { border: 1px solid var(--borda); border-radius: 8px; margin-bottom: 10px; padding: 6px; background: #fff; }
  td { border: 0; display: flex; justify-content: space-between; gap: 12px; text-align: right; padding: 4px 6px; }
  td::before { content: attr(data-rotulo); font-weight: 600; text-align: left; color: #555; }
}

.folha-cabecalho { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 4px 16px; margin: 8px 0; }

@media print {
  body { background: #fff; }
  .nao-imprimir, .topo, #menu { display: none !important; }
  main { padding: 0; max-width: none; }
  table { font-size: 12px; }
  .cartao, .formulario { border: 0; }
}
```

- [ ] **Passo 4: Criar `js/ui.js`**

```js
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
  const lista = erro instanceof ErroDeRegra ? erro.erros : [`Não consegui gravar: ${erro.message}`];
  elemento.append(...lista.map((t) => h('p', {}, t)));
}

export async function tentar(elementoErros, acao) {
  mostrarErros(elementoErros, null);
  try {
    await acao();
    return true;
  } catch (e) {
    mostrarErros(elementoErros, e);
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
```

- [ ] **Passo 5: Criar `js/app.js`**

```js
import { abrirArmazemIndexedDB } from './dados/indexeddb.js';
import { criarDados } from './dados/index.js';
import { criarServicos } from './servicos/index.js';
import { precisaLembrarBackup } from './dados/backup.js';
import { lerUltimoBackup } from './dados/ultimoBackup.js';
import { h } from './ui.js';

// -- telas: cada tarefa de tela acrescenta uma linha de import acima e uma entrada abaixo --
const TELAS = {
};

async function mostrarAviso(contexto) {
  const area = document.getElementById('aviso');
  area.replaceChildren();
  const pacotes = await contexto.dados.pacotes.listar();
  if (pacotes.length && precisaLembrarBackup(lerUltimoBackup(), new Date().toISOString())) {
    area.append(h('div', { class: 'lembrete' },
      'Faz tempo que você não exporta um backup dos seus dados. ',
      h('a', { href: '#/backup' }, 'Exportar agora')));
  }
}

async function desenhar(contexto) {
  const nome = location.hash.replace(/^#\//, '') || 'estoque';
  const raiz = document.getElementById('tela');
  for (const a of document.querySelectorAll('#menu a')) {
    a.classList.toggle('ativo', a.getAttribute('href') === `#/${nome}`);
  }
  const montar = TELAS[nome] ?? TELAS.estoque;
  if (!montar) {
    raiz.replaceChildren(h('p', { class: 'vazio' }, 'Esta tela ainda não foi instalada.'));
    return;
  }
  try {
    raiz.replaceChildren(await montar(contexto));
  } catch (e) {
    raiz.replaceChildren(h('div', { class: 'erros' }, h('p', {}, `Não consegui abrir esta tela: ${e.message}`)));
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
  window.addEventListener('hashchange', () => desenhar(contexto));
  await desenhar(contexto);
}

iniciar();
```

- [ ] **Passo 6: Verificar no navegador (inclui a verificação do IndexedDB da Tarefa 6)**

Iniciar o servidor em segundo plano: `npm start` (deixar rodando). Abrir `http://localhost:8081` no navegador.
Esperado: o cabeçalho verde com o menu aparece e a área principal diz "Esta tela ainda não foi instalada." Sem erros vermelhos no console.

No console do navegador, rodar:

```js
const { abrirArmazemIndexedDB } = await import('/js/dados/indexeddb.js');
const a = await abrirArmazemIndexedDB('teste-temporario');
await a.gravar('especies', { id: 'x1', nome: 'Teste' });
console.log(await a.obter('especies', 'x1'), (await a.listar('especies')).length, await a.obter('especies', 'nao-existe'));
await a.substituirTudo({ bitolas: [{ id: 'b1', espessura: 5, largura: 15 }] });
const tudo = await a.exportarTudo();
console.log(tudo.especies.length, tudo.bitolas.length);
```

Esperado: primeira linha `{id: 'x1', nome: 'Teste'} 1 null`; segunda linha `0 1`. Depois recarregar a página e rodar `indexedDB.deleteDatabase('teste-temporario')` para limpar.

- [ ] **Passo 7: Commit**

```bash
git add index.html icone.svg estilo.css js/ui.js js/app.js
git commit -m "feat: casca da página, estilo, ajudantes de tela e roteador"
```

---

### Tarefa 13: Tela de cadastros

**Arquivos:**
- Criar: `js/telas/cadastros.js`
- Modificar: `js/app.js` (registrar a tela)

**Interfaces:**
- Consome: `h, campo, selecao, lerFormulario, tentar, tabela, confirmar` (Tarefa 12); `numeroDoCampo, numeroParaCampo` (Tarefa 1); `contexto.servicos.cadastros` (Tarefa 8).
- Produz: `montarCadastros(contexto): Promise<HTMLElement>`.

- [ ] **Passo 1: Criar `js/telas/cadastros.js`**

```js
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
          h('button', { type: 'button', class: 'secundario pequeno', onclick: () => { editando = r; desenhar(); } }, 'Editar'),
          h('button', {
            type: 'button',
            class: 'perigo pequeno',
            onclick: async () => {
              if (!confirmar(`Excluir "${servico.descricao(r)}"?`)) return;
              if (await tentar(errosLista, () => servico.excluir(r.id))) await desenhar();
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
```

- [ ] **Passo 2: Registrar a tela em `js/app.js`**

Acrescentar a linha de import logo depois de `import { h } from './ui.js';`:

```js
import { montarCadastros } from './telas/cadastros.js';
```

E dentro de `const TELAS = {` acrescentar:

```js
  cadastros: montarCadastros,
```

- [ ] **Passo 3: Verificar no navegador**

Com `npm start` rodando, abrir `http://localhost:8081/#/cadastros` e conferir:

1. Aba **Espécies**: adicionar "Cumaru" com nome científico "Dipteryx odorata" → aparece na tabela. Adicionar "cumaru" de novo → mensagem vermelha "Já existe uma espécie".
2. Aba **Bitolas**: adicionar espessura `5` largura `14,5` → aparece "5 x 14,5 cm" (na coluna, `5` e `14,5`). Tentar espessura `2.5` (com ponto) → recusa com a mensagem pedindo vírgula. Nada é gravado.
3. Aba **Locais**: adicionar "Pátio 1".
4. Aba **Clientes e fornecedores**: adicionar "Cliente Teste" tipo Cliente.
5. Aba **Veículos**: adicionar placa `abc-1d23` → aparece `ABC1D23`.
6. **Editar** a espécie, mudar o apelido, **Salvar alterações** → a tabela mostra a mudança. **Excluir** um item livre → pede confirmação e some.
7. Recarregar a página: os dados continuam lá (ficaram no IndexedDB).
8. Reduzir a janela para largura de celular (cerca de 400 px): a tabela vira cartões, sem rolagem horizontal da página.

- [ ] **Passo 4: Commit**

```bash
git add js/telas/cadastros.js js/app.js
git commit -m "feat: tela de cadastros"
```

---

### Tarefa 14: Tela de pacotes

**Arquivos:**
- Criar: `js/telas/pacotes.js`
- Modificar: `js/app.js` (registrar a tela)

**Interfaces:**
- Consome: `h, campo, selecao, lerFormulario, tentar, tabela, confirmar` (Tarefa 12); `TIPOS_PACOTE, ROTULO_SECAGEM` (Tarefa 3); `formatarNumero, numeroDoCampo, numeroParaCampo` (Tarefa 1); `contexto.servicos.pacotes` e `.cadastros` (Tarefas 8 e 9); `contexto.dados`.
- Produz: `montarPacotes(contexto): Promise<HTMLElement>`.

- [ ] **Passo 1: Criar `js/telas/pacotes.js`**

```js
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
              if (await tentar(errosLista, () => servicos.pacotes.excluir(l.pacote.id))) await desenhar();
            },
          }, 'Excluir')),
      },
    ];

    raiz.replaceChildren(form, h('h2', {}, `Pacotes (${linhas.length})`), errosLista, tabela(colunas, linhas, 'Nenhum pacote cadastrado ainda.'));
  }

  await desenhar();
  return raiz;
}
```

- [ ] **Passo 2: Registrar a tela em `js/app.js`**

Acrescentar o import depois dos já existentes:

```js
import { montarPacotes } from './telas/pacotes.js';
```

E dentro de `const TELAS = {` acrescentar:

```js
  pacotes: montarPacotes,
```

- [ ] **Passo 3: Verificar no navegador**

Com `npm start` rodando e os cadastros da Tarefa 13 feitos (espécie Cumaru, bitola 5 x 14,5, local Pátio 1), abrir `http://localhost:8081/#/pacotes` e conferir:

1. Adicionar pacote MS número `100`, Cumaru, bitola 5 x 14,5, comprimento `3`, quantidade `100` → aparece na tabela com "100 de 100", `m³ em saldo` = `2,175` (0,05 × 0,145 × 3 × 100) e etiqueta "Verde".
2. Adicionar outro MS número `100` → mensagem vermelha "Já existe o pacote MS número 100". Mudar o tipo para PB e adicionar → aceita.
3. Comprimento `2.5` (com ponto) → recusa com a mensagem do comprimento. Quantidade `10,5` → recusa (inteiro). Nada é gravado.
4. Marcar "Somar o abono", preencher abono de espessura `0,5` e salvar com **Editar** → o pacote continua listado; sem erro.
5. **Editar** → o formulário sobe preenchido, com os números em vírgula; **Cancelar** limpa.
6. **Excluir** um pacote livre → confirma e some; recarregar a página mantém o que sobrou.
7. Em largura de celular (cerca de 400 px) o formulário fica em uma coluna e a tabela vira cartões.

- [ ] **Passo 4: Commit**

```bash
git add js/telas/pacotes.js js/app.js
git commit -m "feat: tela de pacotes"
```

### Tarefa 15: Tela da estufa

**Arquivos:**
- Criar: `js/telas/estufa.js`
- Modificar: `js/app.js` (registrar a tela)

**Interfaces:**
- Consome: `h, campo, selecao, lerFormulario, tentar, tabela` (Tarefa 12); `ROTULO_SECAGEM` (Tarefa 3); `formatarData, hojeISO, numeroDoCampo, numeroParaCampo` (Tarefa 1); `contexto.servicos.estufa.entrar/sair` (Tarefa 10); `contexto.servicos.pacotes.listarComResumo` (Tarefa 9); `contexto.dados.passagens`.
- Produz: `montarEstufa(contexto): Promise<HTMLElement>`.

- [ ] **Passo 1: Criar `js/telas/estufa.js`**

```js
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
    const abertas = passagens.filter((p) => !p.dtSaida);
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
      cartoes,
      h('h2', {}, 'Histórico'),
      tabela(colunas, fechadas, 'Nenhuma secagem concluída ainda.'),
    );
  }

  await desenhar();
  return raiz;
}
```

- [ ] **Passo 2: Registrar a tela em `js/app.js`**

Import:

```js
import { montarEstufa } from './telas/estufa.js';
```

Entrada em `TELAS`:

```js
  estufa: montarEstufa,
```

- [ ] **Passo 3: Verificar no navegador**

Com `npm start` rodando e pelo menos um pacote cadastrado (Tarefa 14), abrir `http://localhost:8081/#/estufa`:

1. Escolher o pacote, estufa "Estufa 1", data de hoje, umidade `22,5`, tipo "KD" → **Colocar na estufa**. Aparece um cartão em "Na estufa agora". O pacote some da lista de escolha.
2. No cartão, deixar a umidade de saída vazia e clicar **Registrar saída** → o navegador pede o preenchimento. Digitar `150` → mensagem vermelha "entre 0 e 100". Digitar uma data anterior à entrada → "A data de saída não pode ser antes da entrada".
3. Digitar umidade `12` e data de hoje → o cartão some e a linha entra em "Histórico" mostrando `22,5 → 12`.
4. Abrir a tela **Pacotes**: o pacote mostra a etiqueta "Seco". Colocar de novo na estufa e conferir que a etiqueta vira "Em estufa".
5. Digitar o nome da estufa de novo: o campo sugere "Estufa 1".

- [ ] **Passo 4: Commit**

```bash
git add js/telas/estufa.js js/app.js
git commit -m "feat: tela da estufa"
```

---

### Tarefa 16: Tela de romaneios e baixa

**Arquivos:**
- Criar: `js/telas/romaneios.js`
- Modificar: `js/app.js` (registrar a tela)

**Interfaces:**
- Consome: `h, campo, selecao, lerFormulario, tentar, tabela, confirmar` (Tarefa 12); `formatarData, formatarM3, formatarNumero, hojeISO, numeroDoCampo` (Tarefa 1); `contexto.servicos.romaneios` (Tarefa 11); `servicos.pacotes.listarComResumo`; `servicos.cadastros.bitolas.descricao`; `dados.pessoas`, `dados.veiculos`.
- Produz: `montarRomaneios(contexto): Promise<HTMLElement>`. A tela tem dois estados: a lista (com o formulário de novo romaneio) e o detalhe de um romaneio (cabeçalho, itens, totais, finalizar, reabrir, imprimir, excluir).

- [ ] **Passo 1: Criar `js/telas/romaneios.js`**

```js
import { h, campo, selecao, lerFormulario, tentar, tabela, confirmar } from '../ui.js';
import { formatarData, formatarM3, formatarNumero, hojeISO, numeroDoCampo } from '../regras/formato.js';

const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
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
    const [resumo, pessoas, veiculos] = await Promise.all([
      servicos.romaneios.listarResumo(),
      dados.pessoas.listar(),
      dados.veiculos.listar(),
    ]);
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
    const [d, linhas, pessoas, veiculos] = await Promise.all([
      servicos.romaneios.detalhar(abertoId),
      servicos.pacotes.listarComResumo(),
      dados.pessoas.listar(),
      dados.veiculos.listar(),
    ]);
    const { romaneio, cliente, totais } = d;
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
      tabela(colunas, d.linhas, 'Nenhum pacote incluído ainda.'),
      h('p', { class: 'totais' }, `${totais.pacotes} pacote(s) · ${totais.pecas} peça(s) · ${formatarM3(totais.m3Bruto)} brutos · ${formatarM3(totais.m3Comercial)} comerciais`),
    ].filter(Boolean));
  }

  await desenhar();
  return raiz;
}
```

- [ ] **Passo 2: Registrar a tela em `js/app.js`**

Import:

```js
import { montarRomaneios } from './telas/romaneios.js';
```

Entrada em `TELAS`:

```js
  romaneios: montarRomaneios,
```

- [ ] **Passo 3: Verificar no navegador**

Com `npm start` rodando, cadastros e um pacote MS `100` com 100 peças (5 x 14,5 cm, 3 m) feitos, abrir `http://localhost:8081/#/romaneios`:

1. Criar romaneio: data de hoje, cliente "Cliente Teste", placa `abc-1d23` → abre o detalhe com "Romaneio de venda nº 1", placa `ABC1D23`, situação "Aberto".
2. Em **Incluir pacote**, escolher "MS 100": o campo de quantidade se preenche com `100`. Trocar para `40` e incluir → a tabela mostra 40 peças e `0,870` m³ bruto (0,05 × 0,145 × 3 × 40); o total embaixo confere.
3. Tentar incluir o mesmo pacote de novo → ele nem aparece mais na lista de escolha. Voltar à lista, criar um segundo romaneio e tentar `70` peças do "MS 100" → mensagem "só tem 60".
4. No detalhe do primeiro: **Remover** devolve o pacote à lista; incluir de novo.
5. **Finalizar romaneio** → situação vira "Finalizado", somem os formulários de alteração e o botão Remover; aparece **Reabrir**. **Reabrir** (confirmar) → volta ao normal.
6. **Imprimir ou salvar em PDF** → abre a janela de impressão; na pré-visualização só aparecem o título, os dados, a tabela e os totais (sem menu nem botões).
7. Abrir a tela **Pacotes**: o saldo do "MS 100" reflete as baixas (por exemplo "60 de 100").
8. **Excluir romaneio** (aberto, confirmar) → volta à lista sem ele, e o saldo do pacote volta a 100.
9. Em largura de celular a tabela do detalhe vira cartões.

- [ ] **Passo 4: Commit**

```bash
git add js/telas/romaneios.js js/app.js
git commit -m "feat: tela de romaneios com baixa, finalização e impressão"
```

---

### Tarefa 17: Tela de estoque

**Arquivos:**
- Criar: `js/telas/estoque.js`
- Modificar: `js/app.js` (registrar a tela)

**Interfaces:**
- Consome: `h, campo, selecao, lerFormulario, tabela` (Tarefa 12); `filtrarEstoque, totaisEstoque` (Tarefa 4); `ROTULO_SECAGEM, TIPOS_PACOTE` (Tarefa 3); `formatarM3, formatarNumero` (Tarefa 1); `servicos.pacotes.listarComResumo`, `servicos.cadastros`.
- Produz: `montarEstoque(contexto): Promise<HTMLElement>`. É a tela inicial do app (rota padrão `#/estoque`).

- [ ] **Passo 1: Criar `js/telas/estoque.js`**

```js
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
```

- [ ] **Passo 2: Registrar a tela em `js/app.js`**

Import:

```js
import { montarEstoque } from './telas/estoque.js';
```

Entrada em `TELAS`:

```js
  estoque: montarEstoque,
```

- [ ] **Passo 3: Verificar no navegador**

Com `npm start` rodando e alguns pacotes cadastrados (de espécies, tipos e locais diferentes, com secagem e baixas variadas), abrir `http://localhost:8081/` (sem `#`):

1. Abre direto no **Estoque**, com o item do menu destacado, o total de pacotes, peças e m³ acima da tabela.
2. Mudar cada filtro (tipo, espécie, bitola, local, secagem) → a tabela e os totais atualizam na hora, sem recarregar. Voltar para "Todos" restaura.
3. Digitar parte da qualidade em "Qualidade contém" (em minúsculas) → filtra.
4. Um pacote totalmente baixado só aparece quando se marca "Mostrar pacotes sem saldo".
5. Com o banco vazio (outro navegador ou aba anônima), a tela diz "Nenhum pacote cadastrado ainda. Comece pela tela Pacotes."
6. Em largura de celular, os filtros ficam empilhados e a tabela vira cartões.

- [ ] **Passo 4: Commit**

```bash
git add js/telas/estoque.js js/app.js
git commit -m "feat: tela de estoque com filtros e totais"
```

---

### Tarefa 18: Tela de backup

**Arquivos:**
- Criar: `js/telas/backup.js`
- Modificar: `js/app.js` (registrar a tela)

**Interfaces:**
- Consome: `h, tentar, tabela, confirmar, baixarArquivo` (Tarefa 12); `exportarBackup, validarBackup, resumirImportacao, importarBackup` e `lerUltimoBackup, guardarUltimoBackup` (Tarefa 7); `ErroDeRegra, exigir` (Tarefa 8); `formatarData` (Tarefa 1); `contexto.armazem`.
- Produz: `montarBackup(contexto): Promise<HTMLElement>`. Fluxo de importação: escolher arquivo → mostrar o que vai mudar → confirmar → baixar uma cópia de segurança dos dados atuais → só então substituir.

- [ ] **Passo 1: Criar `js/telas/backup.js`**

```js
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

  async function escolherArquivo(ev) {
    previa.replaceChildren();
    const arquivo = ev.target.files[0];
    if (!arquivo) return;
    await tentar(erros, async () => {
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
            onclick: async () => {
              if (!confirmar('Substituir TODOS os dados deste aparelho pelo backup? Uma cópia dos dados atuais será baixada antes.')) return;
              const ok = await tentar(erros, async () => {
                await exportar('copia-antes-da-importacao');
                await importarBackup(armazem, backup);
              });
              if (ok) previa.replaceChildren(h('p', { class: 'totais' }, 'Backup importado com sucesso. Abra o Estoque para conferir.'));
            },
          }, 'Substituir meus dados por este backup'),
          h('button', { type: 'button', class: 'secundario', onclick: () => previa.replaceChildren() }, 'Cancelar')),
      );
    });
  }

  mostrarEstado();
  return h('section', {},
    h('h2', {}, 'Exportar backup'),
    h('p', {}, 'Baixa um arquivo com todos os seus dados. Guarde-o em lugar seguro (por exemplo, no Google Drive). É também assim que você leva os dados do computador para o celular e de volta.'),
    estado,
    h('div', { class: 'acoes' },
      h('button', {
        type: 'button',
        onclick: async () => { await tentar(erros, () => exportar('backup-madeireiro')); },
      }, 'Exportar backup agora')),
    h('h2', {}, 'Importar backup'),
    h('p', {}, 'Escolha um arquivo de backup. Antes de substituir qualquer coisa, o app mostra o que vai mudar e baixa uma cópia dos dados atuais.'),
    h('input', { type: 'file', accept: 'application/json,.json', onchange: escolherArquivo }),
    erros,
    previa,
  );
}
```

- [ ] **Passo 2: Registrar a tela em `js/app.js`**

Import:

```js
import { montarBackup } from './telas/backup.js';
```

Entrada em `TELAS`:

```js
  backup: montarBackup,
```

- [ ] **Passo 3: Verificar no navegador**

Com `npm start` rodando e dados cadastrados, abrir `http://localhost:8081/#/backup`:

1. A tela diz "Você ainda não exportou nenhum backup neste aparelho." e, nas outras telas, aparece a faixa amarela de lembrete (há pacotes e nunca houve backup).
2. **Exportar backup agora** → baixa `backup-madeireiro-AAAA-MM-DD.json`; o texto muda para "Último backup exportado em ..." e a faixa amarela some ao navegar para outra tela.
3. Escolher um arquivo que não é backup (por exemplo, um `.json` qualquer ou um `.txt`) → mensagem vermelha "O arquivo não é um backup válido" ou "não é um backup do App Madeireiro Brazil Wood". Os dados continuam intactos (conferir no Estoque).
4. Escolher o backup exportado no passo 2 → aparece a tabela "O que vai mudar" com Agora e No backup iguais.
5. Cadastrar mais um pacote, escolher de novo o backup antigo e clicar **Substituir meus dados por este backup** → confirmar. Baixa `copia-antes-da-importacao-AAAA-MM-DD.json`, aparece "Backup importado com sucesso" e, no Estoque, o pacote novo some. Importar a cópia de segurança restaura o pacote novo.

- [ ] **Passo 4: Commit**

```bash
git add js/telas/backup.js js/app.js
git commit -m "feat: tela de backup com prévia e cópia de segurança"
```

### Tarefa 19: Instalação no celular, modo offline e documentação

**Arquivos:**
- Criar: `sw.js`, `manifest.webmanifest`, `ferramentas/gerar_icones.py`, `icone-192.png`, `icone-512.png` (gerados), `README.md`
- Modificar: `index.html` (manifesto e ícone de toque), `js/app.js` (registrar o service worker)
- Teste: `test/pwa.test.js`

**Interfaces:**
- Consome: todos os arquivos de `js/` (o service worker precisa listar cada um).
- Produz: app instalável e que abre sem internet. O service worker busca na rede primeiro (sempre mostra a versão mais nova quando há conexão) e usa o cache quando está offline. Um teste garante que todo arquivo `.js` novo seja incluído em `sw.js`.

- [ ] **Passo 1: Escrever o teste que falha**

`test/pwa.test.js`:

```js
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
    const caminho = arquivo.replaceAll('\\', '/');
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
```

- [ ] **Passo 2: Rodar o teste e ver falhar**

Rodar: `node --test test/pwa.test.js`
Esperado: FALHA (`sw.js` não existe).

- [ ] **Passo 3: Criar `manifest.webmanifest`**

```json
{
  "name": "Madeireiro Brazil Wood",
  "short_name": "Madeireiro",
  "lang": "pt-BR",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#f6f3ea",
  "theme_color": "#2e5d34",
  "icons": [
    { "src": "icone-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icone-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icone.svg", "sizes": "any", "type": "image/svg+xml" }
  ]
}
```

- [ ] **Passo 4: Gerar os ícones PNG**

`ferramentas/gerar_icones.py`:

```python
import struct
import zlib


def bloco(tipo, dados):
    corpo = tipo + dados
    return struct.pack('>I', len(dados)) + corpo + struct.pack('>I', zlib.crc32(corpo) & 0xFFFFFFFF)


def png(tamanho, caminho):
    verde = (46, 93, 52)
    madeira = (196, 148, 84)
    claro = (244, 241, 232)
    tabuas = [(0.22, 0.38, madeira), (0.42, 0.58, claro), (0.62, 0.78, madeira)]

    def pixel(x, y):
        u, v = x / tamanho, y / tamanho
        for topo, base, cor in tabuas:
            if 0.18 <= u <= 0.82 and topo <= v <= base:
                return cor
        return verde

    linhas = b''.join(
        b'\x00' + bytes(canal for x in range(tamanho) for canal in pixel(x, y))
        for y in range(tamanho)
    )
    cabecalho = struct.pack('>IIBBBBB', tamanho, tamanho, 8, 2, 0, 0, 0)
    dados = (b'\x89PNG\r\n\x1a\n' + bloco(b'IHDR', cabecalho)
             + bloco(b'IDAT', zlib.compress(linhas, 9)) + bloco(b'IEND', b''))
    with open(caminho, 'wb') as arquivo:
        arquivo.write(dados)


for lado in (192, 512):
    png(lado, f'icone-{lado}.png')
    print(f'icone-{lado}.png gerado')
```

Rodar: `python -I ferramentas/gerar_icones.py`
Esperado: duas linhas "icone-192.png gerado" e "icone-512.png gerado". Abrir os dois PNG e conferir que mostram três tábuas empilhadas sobre fundo verde.

- [ ] **Passo 5: Criar `sw.js`**

```js
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
```

- [ ] **Passo 6: Ligar o manifesto e registrar o service worker**

Em `index.html`, dentro do `<head>`, depois da linha `<link rel="icon" ...>`, acrescentar:

```html
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="apple-touch-icon" href="icone-192.png">
```

Em `js/app.js`, no fim da função `iniciar()` (depois de `await desenhar(contexto);`), acrescentar:

```js
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
```

- [ ] **Passo 7: Rodar os testes e ver passar**

Rodar: `npm test`
Esperado: PASSA, inclusive os 4 testes de `pwa.test.js`.

- [ ] **Passo 8: Escrever o `README.md`**

````markdown
# App Madeireiro Brazil Wood

Controle de pacotes de madeira serrada, estufa, estoque e romaneios de venda da Brazil Wood Madeiras. Funciona no navegador do computador e do celular, inclusive sem internet. Os dados ficam guardados no próprio aparelho.

## Rodar no computador

    node servir.js      # abre em http://localhost:8081 (ou dê dois cliques em Abrir.bat)
    npm test            # testes automáticos

## Telas

- **Estoque:** pacotes com saldo, filtros e totais em peças e m³.
- **Pacotes:** cadastro de pacotes MS, PB e PF.
- **Estufa:** entrada e saída de pacotes, com umidade.
- **Romaneios:** romaneio de venda com baixa de pacotes, finalização e impressão em PDF.
- **Cadastros:** espécies, bitolas, locais, clientes e veículos.
- **Backup:** exportar e importar todos os dados.

## Seus dados

- Ficam só no aparelho em que você usa o app (computador e celular têm cópias separadas).
- Para levar os dados de um aparelho para outro, exporte o backup em um e importe no outro.
- Exporte um backup de vez em quando e guarde em lugar seguro (por exemplo, no Google Drive). O app avisa quando passa uma semana sem backup.
- Limpar os dados do navegador apaga o app. Tenha sempre um backup recente.

## Usar no celular

O celular precisa abrir o app por um endereço seguro (https). O jeito mais simples é publicar a pasta num site estático gratuito (por exemplo, GitHub Pages) e abrir o endereço no celular; no Chrome, use "Adicionar à tela inicial". Abrindo pelo endereço do computador na rede local (`http://192.168...`) o app funciona, mas não instala nem guarda cópia para uso sem internet.

## Estrutura

- `js/regras/`: cálculos e validações (funções puras, testadas).
- `js/dados/`: gravação no navegador (IndexedDB) e backup.
- `js/servicos/`: regras de negócio que combinam cadastros (pacotes, estufa, romaneios).
- `js/telas/`: uma tela por arquivo.
- `sw.js`: service worker (offline). Ao criar um arquivo `.js` novo, inclua-o na lista `ARQUIVOS` de `sw.js` (um teste avisa se esquecer) e aumente o número de `VERSAO`.

Spec e plano: `docs/superpowers/`.

## Fora da v1

Financeiro, notas fiscais, floresta, frota, código QR do pacote, vários usuários e sincronização automática entre aparelhos.
````

- [ ] **Passo 9: Verificar no navegador**

Com `npm start` rodando, abrir `http://localhost:8081`:

1. Console sem erros; em Ferramentas do desenvolvedor → Application → Service Workers aparece o `sw.js` ativado, e em Cache Storage o cache `madeireiro-brazil-wood-v1` com os arquivos.
2. Em Application → Manifest não há erros e os dois ícones aparecem.
3. Marcar "Offline" em Network (ou parar o servidor), recarregar: o app abre e mostra os dados salvos.
4. Religar o servidor, mudar o texto de qualquer tela, recarregar: a mudança aparece (rede primeiro).

- [ ] **Passo 10: Commit**

```bash
git add sw.js manifest.webmanifest ferramentas icone-192.png icone-512.png index.html js/app.js README.md test/pwa.test.js
git commit -m "feat: instalação no celular, modo offline e documentação"
```

---

### Tarefa 20: Conferência final da v1

**Arquivos:**
- Modificar: `docs/superpowers/specs/2026-10-13-app-madeireiro-brazil-wood-design.md` (se algo divergir do que foi construído)

- [ ] **Passo 1: Rodar todos os testes**

Rodar: `npm test`
Esperado: PASSA, sem falhas e sem testes ignorados. Anotar o total.

- [ ] **Passo 2: Percurso completo no navegador**

Com `npm start` rodando, num navegador sem dados (aba anônima ou apagando o armazenamento do site), fazer o fluxo inteiro do dia a dia e conferir cada passo:

1. **Cadastros:** espécie "Jatobá", bitola `5` x `15`, local "Pátio 1", cliente "Cliente Teste", veículo `abc-1d23`.
2. **Pacotes:** MS `1` com 100 peças de 3 m; PB `1` com origem "MS 1"; um terceiro com `comprimento` digitado `2.5` (ponto) é recusado.
3. **Estufa:** colocar "MS 1" na estufa, registrar a saída com umidade `12` → o Estoque mostra "Seco" no MS 1.
4. **Romaneio:** criar com o cliente, incluir 40 peças do MS 1, finalizar, imprimir/visualizar PDF, reabrir, remover o item e excluir o romaneio → o saldo do MS 1 volta a 100.
5. **Estoque:** filtros por espécie, secagem e local funcionam; totais batem com a soma da tabela.
6. **Backup:** exportar, apagar um pacote, importar o backup → o pacote volta; importar um arquivo qualquer é recusado sem mexer nos dados.
7. **Celular:** repetir a navegação com a janela em 400 px de largura (ou no celular real, se o app estiver publicado): sem rolagem horizontal da página, botões tocáveis, tabelas em cartões.

- [ ] **Passo 3: Conferir o foco da revisão**

Confirmar que cada item de "Foco da revisão" tem um teste que passa:

1. Falha ao gravar: `test/repositorio.test.js` ("FOCO: falha ao gravar...").
2. Backup corrompido: `test/backup.test.js` ("FOCO: backup corrompido...").
3. Número com ponto decimal: `test/formato.test.js`, `test/pacote.test.js`, `test/pacotes.test.js`.
4. Dois romaneios disputando o mesmo pacote: `test/romaneios.test.js` ("FOCO: dois romaneios...").
5. Excluir romaneio aberto: `test/romaneios.test.js` ("FOCO: excluir romaneio aberto...").

- [ ] **Passo 4: Conferir o spec**

Reler o spec e este plano. Se algo foi construído de forma diferente do descrito no spec, ajustar o spec para refletir o que existe (sem acrescentar funcionalidades). Se não houver divergência, não alterar nada.

- [ ] **Passo 5: Atualizar pendências e commit final**

Criar `PENDENCIAS.md` na raiz com o que ficou para a próxima rodada (lista de tipos de secagem e de qualidade; decisão de substituir ou conviver com o Madeireiro; importação de planilhas do Madeireiro; sincronização entre PC e celular; código QR do pacote; financeiro e notas fiscais), depois:

```bash
git add -A
git commit -m "docs: conferência final e pendências da v1"
```

- [ ] **Passo 6: Relatar ao Richard**

Dizer em português simples: o que ficou pronto, quantos testes passam, o que foi conferido no navegador e o que ainda depende dele (testar no celular real; decidir se publica num endereço seguro; decidir sobre o Madeireiro). Não publicar nada em nenhum site sem ele pedir.
