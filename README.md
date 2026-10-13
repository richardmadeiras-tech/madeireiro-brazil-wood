# App Madeireiro Brazil Wood

Controle de pacotes de madeira serrada, estufa, estoque e romaneios de venda da Brazil Wood Madeiras. Funciona no navegador do computador e do celular, inclusive sem internet (depois de abrir o app uma vez por um endereço seguro: https ou localhost). Os dados ficam guardados no próprio aparelho.

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

O celular precisa abrir o app por um endereço seguro (https). O jeito mais simples é publicar a pasta num site estático gratuito (por exemplo, GitHub Pages) e abrir o endereço no celular; no Chrome, use "Adicionar à tela inicial". No iPhone: use "Adicionar à Tela de Início". O Safari pode apagar os dados de sites não instalados depois de alguns dias sem uso, então exporte backups com frequência. Quando sai uma versão nova, ela pode demorar a aparecer em conexão ruim; recarregar a página resolve. Abrindo pelo endereço do computador na rede local (`http://192.168...`) o app funciona, mas não instala nem guarda cópia para uso sem internet.

## Estrutura

- `js/regras/`: cálculos e validações (funções puras, testadas).
- `js/dados/`: gravação no navegador (IndexedDB) e backup.
- `js/servicos/`: regras de negócio que combinam cadastros (pacotes, estufa, romaneios).
- `js/telas/`: uma tela por arquivo.
- `sw.js`: service worker (offline). Ao criar um arquivo `.js` novo, inclua-o na lista `ARQUIVOS` de `sw.js` (um teste avisa se esquecer) e aumente o número de `VERSAO`.

Para refazer os ícones: `python ferramentas/gerar_icones.py` (grava `icone-192.png` e `icone-512.png` na pasta do projeto).

Spec e plano: `docs/superpowers/`.

## Fora da v1

Financeiro, notas fiscais, floresta, frota, código QR do pacote, vários usuários e sincronização automática entre aparelhos.
