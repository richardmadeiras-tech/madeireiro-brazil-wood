# Pendências da v1

Lista para o Richard. Nada aqui impede o app de funcionar; são coisas para conferir, decidir ou fazer depois.

## Antes de usar no dia a dia

- [ ] Testar no Chrome de verdade, no PC e no celular: instalar o app, desligar a internet e ver se ele abre. Isso não deu para conferir no navegador embutido.
- [ ] No celular, conferir se o teclado aceita digitar números com vírgula e com ponto (ex.: 2,5 e 2.5) e se os valores aparecem certos.
- [ ] Exportar um backup (tela Backup) e guardar o arquivo num lugar seguro. Repetir de vez em quando.
- [ ] Publicar num endereço seguro (https) quando quiser usar no celular fora de casa. Ainda não foi publicado.

## Decisões que dependem de você

- O app novo vai substituir o Madeireiro ou conviver com ele?
- Quais valores de **qualidade** (ex.: Primeira, Segunda...) e de **tipo de secagem** (ex.: Estufa, Ao ar livre...) devem aparecer nas listas?
- Importar as planilhas do Madeireiro para dentro deste app? Só faz sentido se for substituí-lo.

## Ideias para depois

- Sincronizar PC e celular automaticamente (hoje a troca é por arquivo de backup).
- Código QR no pacote.
- Botão de desfazer para registros excluídos (hoje a exclusão some da tela mas fica guardada no backup).
- Financeiro e notas fiscais.
- Deixar a lista de romaneios mais rápida quando houver muitos.
- Tempo limite de 4 segundos para a internet no modo offline (internet fraca pode deixar o app lento ao abrir).
- Ícone próprio para Android (maskable).
- Garantir letra de pelo menos 16 px nos campos fora dos formulários, para o iPhone não dar zoom.

## Pequenos ajustes conhecidos

- Datas impossíveis (ex.: 2026-13-45) ainda são aceitas em alguns campos.
- Um pacote pode ser marcado como origem de si mesmo, e excluir um pacote não avisa se outro depende dele como origem.
- Os botões de backup e de salvar não ficam desativados durante a gravação; o app protege os dados, mas um toque duplo pode gerar mensagem de erro.
- Ao escolher outro arquivo de backup bem rápido, ou depois de um arquivo inválido, a tela pode ficar com o arquivo anterior.
- Excluir um romaneio apaga os itens e depois o romaneio; se falhar no meio, é só tentar de novo.
- Lista de nomes da estufa (sugestões) não está em ordem alfabética.
- Excluir o registro que está sendo editado deixa o formulário aberto com dados antigos.
- Ao editar um pacote cuja espécie ou bitola foi excluída, o campo volta em branco sem aviso.
- Se o campo de seleção não tiver o valor salvo, ele aparece em branco.
- Se a data do último backup estiver estragada, o aviso pode aparecer errado ou escrever "undefined".
- O app não impede apagar o banco do navegador por outra aba aberta ao mesmo tempo.
- O README fala de modo offline com mais certeza do que foi conferido (ver o primeiro item da lista de cima).
