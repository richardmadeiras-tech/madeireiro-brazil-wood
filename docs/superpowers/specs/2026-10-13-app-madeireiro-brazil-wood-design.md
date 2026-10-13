# App Madeireiro Brazil Wood: desenho da v1

Data: 2026-10-13. Estado: aguardando revisão do Richard.

## Objetivo

Um app próprio da Brazil Wood Madeiras para controlar pacotes de madeira serrada, estufa, estoque e romaneios de venda. Uso só do Richard, no PC e no celular. A relação com o app Madeireiro (de terceiros, instalado hoje) fica em aberto: pode conviver ou substituir, a decidir depois.

O app Madeireiro serviu só de referência para entender o fluxo e quais campos importam (leitura passiva dos nomes de entidades e campos). Código, visual e imagens são nossos. Nenhum dado real do banco do Madeireiro entra neste projeto.

## Fora da v1

Financeiro, notas fiscais, floresta (UPA, UCA, árvores, toras), frota, WhatsApp, IA, vários usuários e sincronização automática entre aparelhos.

## Decisões

- App web instalável (PWA), sem servidor e sem custo mensal.
- HTML, CSS e JavaScript puros, sem frameworks, no estilo do Jogo Madeireiro.
- Dados no próprio aparelho (IndexedDB). PC e celular têm cópias separadas; a troca é por arquivo de backup (exportar e importar).
- Interface em português, adaptada a tela de PC e de celular, funcionando offline.

## Telas

1. **Estoque:** lista de pacotes com filtros (espécie, bitola, qualidade, local, status, seco ou verde). Totais de peças e m³.
2. **Pacote:** cadastro e detalhe. Tipos MS (serrado), PB (beneficiado) e PF (produto final). Campos: número, número AUTEX, número de controle interno, espécie, bitola (espessura e largura), comprimento, quantidade, peso, qualidade, qtd. de amarras, abono comercial, observação, local de estoque, pacote de origem, datas de recebimento, entrada no estoque e finalização, código QR.
3. **Estufa:** entrada e saída de pacotes, com umidade de entrada e de saída e tipo de secagem. Ao sair, o pacote passa a seco.
4. **Baixa:** saída do pacote do estoque, inteira ou parcial, vinculada a um romaneio de venda.
5. **Romaneio de venda:** cliente, placa, nota fiscal, DOF, guia florestal (GF), itens (pacote e quantidade), totais em m³, relatório em PDF.
6. **Cadastros:** espécies (nome, nome científico, apelido), bitolas, locais de estoque, clientes, veículos.
7. **Backup:** exportar e importar tudo em um arquivo; importar planilhas do Madeireiro (fase posterior).

## Modelo de dados

Todo registro tem: `id`, `criadoEm`, `alteradoEm`, `excluidoEm` (exclusão lógica). Isso prepara uma sincronização futura.

- **Especie:** nome, nomeCientifico, apelido.
- **Bitola:** espessura, largura.
- **LocalEstoque:** nome.
- **Pessoa:** nome, documento, telefone, tipo (cliente, fornecedor), observação.
- **Veiculo:** placa, descrição.
- **Pacote:** tipo (MS, PB, PF), numero, numeroAutex, numeroControleInterno, especieId, bitolaId, comprimento, quantidade, peso, qualidade, qtdAmarras, abonoComprimento, abonoLargura, abonoEspessura, somarAbono, localEstoqueId, pacoteOrigemId, dtRecebimento, dtEntradaEstoque, dtFinalizacao, statusSecagem (verde, em estufa, seco), observacao, hashQr.
- **PassagemEstufa:** pacoteId, estufa (nome), dtEntrada, dtSaida, umidadeEntrada, umidadeSaida, tipoSecagem.
- **RomaneioVenda:** numero, data, clienteId, veiculoId, placa, notaFiscal, dof, guiaFlorestal, observacao, dtFinalizacao, status (aberto, finalizado).
- **ItemRomaneio:** romaneioId, pacoteId, quantidadeBaixada.

## Estrutura de código

- `dados/`: acesso ao IndexedDB, um módulo por cadastro.
- `regras/`: funções puras (m³ bruto e comercial, abono, saldo de pacote, status de secagem, totais do romaneio).
- `telas/`: cada tela, sem regra de negócio dentro.
- `servico/`: backup, PDF, service worker.

## Regras principais

- m³ do pacote = espessura × largura × comprimento × quantidade (medidas convertidas para metros). O abono, quando marcado para somar, acrescenta o percentual ou as medidas de abono ao volume comercial.
- Saldo do pacote = quantidade − soma das quantidades baixadas em romaneios.
- Não é possível baixar mais do que o saldo, nem incluir o mesmo pacote duas vezes no mesmo romaneio.
- Pacote só pode ser marcado como seco após uma passagem pela estufa com data de saída.
- Romaneio finalizado fica bloqueado para edição; reabrir exige confirmação.

## Proteção dos dados

- Toda gravação confirma o resultado. Se falhar, a tela avisa na hora; o app nunca perde dado em silêncio.
- O app lembra de exportar o backup quando passa muito tempo sem exportar.
- Importar backup mostra o que vai mudar e pede confirmação antes de substituir qualquer dado.
- Exclusão é lógica e pode ser desfeita.

## Testes

- Testes automáticos das regras (m³, abono, saldo, baixa parcial, status de secagem, totais).
- Testes de gravação, exportação e importação de backup.
- Conferência manual das telas no navegador, em tamanho de PC e de celular.

## Ordem de construção

1. Cadastros (espécie, bitola, local, pessoa, veículo).
2. Pacotes.
3. Estufa.
4. Romaneio de venda e baixa.
5. Estoque e relatórios.
6. Backup e instalação no celular.

## Pontos em aberto

- Tipos de secagem e de qualidade: lista inicial a definir com o Richard na construção.
- Decisão de substituir ou conviver com o Madeireiro, e portanto a importação de planilhas.
- Sincronização entre PC e celular: só depois da v1.
