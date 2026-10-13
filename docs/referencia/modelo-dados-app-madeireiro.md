# Modelo de dados do app Madeireiro (entidades principais)

Fonte: esquemas Isar embutidos no banco local (cópia de `default.isar`). Só estrutura (nomes e tipos de campos), sem nenhum registro. Todas as entidades também têm campos de controle: id, createDate/createUser, dtLastUpdate, exclusionDate, needSync (sincronização) e version.

## Pacote
`abonoComprimentoM` (Double), `abonoEspessuraComercialCm` (Double), `abonoLarguraComercialCm` (Double), `abonoPorcentagemMetrosCubicos` (Double), `baixaParcial` (Bool), `comprimento` (Double), `descricaoRemessa` (String), `dtEntradaLocalEstoque` (Long), `dtFinalizacao` (Long), `dtRecebimento` (Long), `espessura` (Double), `hashQRCode` (String), `idEscritorioDestino` (String), `idPacoteOrigem` (String), `largura` (Double), `naoConstarEstoque` (Bool), `nomeEscritorioOrigem` (String), `numRomVendaRomDescricao` (String), `numero` (String), `numeroAutex` (String), `numeroControleInterno` (String), `numeroOrigem` (String), `observacao` (String), `peso` (Double), `pesoForaVeriacao` (Bool), `qtdAmarra` (Long), `qualidade` (String), `secoEstufa` (Bool), `somarAbono` (Bool), `statusCache` (Int), `statusSecagem` (Int), `todasPecasConsumidas` (Bool), `userResponsavelFinalizacao` (String)

## PacotePB
`abonoComprimentoM` (Double), `abonoEspessuraComercialCm` (Double), `abonoLarguraComercialCm` (Double), `comprimento` (Double), `descricaoRemessa` (String), `dtEntradaLocalEstoque` (Long), `dtFinalizacao` (Long), `dtRecebimento` (Long), `espessura` (Double), `hashQRCode` (String), `idEscritorioDestino` (String), `idPacoteOrigem` (String), `largura` (Double), `medidaAltura` (Double), `medidaComprimento` (Double), `medidaLargura` (Double), `nomeEscritorioOrigem` (String), `numRomVendaRomDescricao` (String), `numero` (String), `numeroAutex` (String), `numeroControleInterno` (String), `numeroOrigem` (String), `observacao` (String), `peso` (Double), `pesoForaVeriacao` (Bool), `qtdAmarra` (Long), `qualidade` (String), `quantidade` (Long), `somarAbono` (Bool), `statusCache` (Int), `statusSecagem` (Int), `todasPecasConsumidas` (Bool), `userResponsavelFinalizacao` (String), `valorCompraM2` (Double)

## PacotePF
`dtEntradaLocalEstoque` (Long), `dtFinalizacao` (Long), `hashQRCode` (String), `medidaAltura` (Double), `medidaComprimento` (Double), `medidaLargura` (Double), `numero` (String), `numeroControleInterno` (String), `peso` (Double), `pesoForaVeriacao` (Bool), `statusSecagem` (Int), `userResponsavelFinalizacao` (String)

## Peca
`bitolaCache` (String), `compAbPed` (Double), `comprimento` (Double), `comprimentoComercial` (Double), `dtBaixa` (Long), `dtLancamento` (Long), `emEstoqueCache` (Bool), `espAbPed` (Double), `espessura` (Double), `espessuraComercial` (Double), `idDepositoCompraItem` (String), `larAbPed` (Double), `largura` (Double), `larguraComercial` (Double), `metroCubicoBrutoCache` (Double), `metroCubicoComercialCache` (Double), `metroCubicoLiquidoCache` (Double), `metroQuadradoBrutoCache` (Double), `metroQuadradoLiquidoCache` (Double), `tipoMadeira` (String)

## PecaPB
`bitolaCache` (String), `compAbPed` (Double), `comprimento` (Double), `comprimentoComercial` (Double), `dtBaixa` (Long), `dtLancamento` (Long), `emEstoqueCache` (Bool), `espAbPed` (Double), `espessura` (Double), `espessuraComercial` (Double), `idDepositoCompraItem` (String), `larAbPed` (Double), `largura` (Double), `larguraComercial` (Double), `metroCubicoBrutoCache` (Double), `metroCubicoComercialCache` (Double), `metroCubicoLiquidoCache` (Double), `metroQuadradoBrutoCache` (Double), `metroQuadradoLiquidoCache` (Double), `quantidade` (Long)

## Estufa
`nome` (String)

## EstufaPacote
`dtEntrada` (Long), `dtSaida` (Long), `kd` (String), `umidadeEntrada` (Double), `umidadeSaida` (Double)

## ControleSecagem
`dtEntrada` (Long), `dtSaida` (Long), `espessura` (Double), `largura` (Double)

## ControleSecagemItem
`dtInicial` (Long), `tbs` (Double), `tbu` (Double), `totalHoras` (Long)

## FaseControleSecagem
`descricao` (String)

## Especie
`apelido` (String), `diametroMinimo` (Double), `nomeCientifico` (String), `numero` (String), `tipo` (Int)

## Bitola
`espessura` (Double), `largura` (Double)

## Pedido
`comBitolas` (Bool), `descricao` (String), `dtFinalizacao` (Long), `dtPrevisaoEntrega` (Long), `formaPagamento` (Int), `informacoesAdicionais` (String), `medida` (Int), `nomeEscritorioOrigem` (String), `numero` (String), `observacao` (String), `tipo` (Int), `userResponsavelFinalizacao` (String), `volumeTotal` (Double)

## PedidoItem
`comCW` (Bool), `descricao` (String), `statusSecagem` (Int), `volume` (Double)

## RomaneioMadeiraSerrada
`descricao` (String), `dtFinalizacao` (Long), `dtGeracaoCustodia` (Long), `dtNotaFiscal` (Long), `ehCompra` (Bool), `emPes` (Bool), `espessuraEmPolegada` (Bool), `larguraEmPolegada` (Bool), `nomeEscritorioOrigem` (String), `numeroGf` (Long), `numeroNotaFiscal` (Long), `tipoOperacao` (Int), `tipoRomaneio` (Int), `transformacao` (Bool), `userResponsavelFinalizacao` (String), `valor` (Double)

## RomaneioProdutoBeneficiado
`data` (Long), `descricao` (String), `dtConcluido` (Long), `dtFinalizacao` (Long), `dtGeracaoCustodia` (Long), `ehAmarrado` (Bool), `emPes` (Bool), `espessuraEmPolegada` (Bool), `larguraEmPolegada` (Bool), `nomeEscritorioOrigem` (String), `numero` (Long), `pacoteProdutoBeneficiado` (String), `tipoRomaneioProdutoBeneficiado` (Int), `transformacao` (Bool), `userResponsavelFinalizacao` (String)

## RomaneioVenda
`abonoComprimentoM` (Double), `abonoEspessuraCm` (Double), `abonoLarguraCm` (Double), `agruparProdutoPorClasse` (Bool), `agruparProdutoPorComprimento` (Bool), `agruparProdutoPorEspecie` (Bool), `agruparProdutoPorEspessura` (Bool), `agruparProdutoPorLargura` (Bool), `agruparProdutoPorQualidade` (Bool), `agruparProdutoPorTipoProduto` (Bool), `data` (Long), `dof` (String), `dtDofGf` (Long), `dtFinalizacao` (Long), `dtNotaFiscal` (Long), `dtProdutoCriado` (Long), `dtValidadeDofGf` (Long), `hashQRCode` (String), `notaFiscal` (String), `numero` (Long), `numeroContrato` (String), `numeroGf` (String), `numeroInformeCarga` (Long), `observacao` (String), `placaVeiculo` (String), `porcentagemAbonoMetroCubico` (Double), `produtoCertificado` (Bool), `somarAbono` (Bool), `tipoRomaneioVenda` (Int), `unidadeMedida` (Int), `userResponsavelFinalizacao` (String), `utilizarAgrupadorDinamico` (Bool), `valorTotalVenda` (Double)

## RomaneioVendaPedido


## RomaneioVendaChecagem
`data` (Long)

## ProdutoPronto
`brilho` (Double), `brilhoFinal` (Double), `data` (Long), `dataFinalizacao` (Long)

## LocalEstoque
`nome` (String), `tipoLocalEstoque` (Int)

## Inventario
`data` (Long), `descricao` (String), `faixa` (String), `tipoCalculo` (Int)

## Pessoa
`celular` (String), `cnpj` (String), `codPais` (String), `contato` (String), `cpf` (String), `dtNascimento` (Long), `email` (String), `hashCodee` (String), `idEstrangeiro` (String), `inativo` (Bool), `inscricaoEstadual` (String), `isenta` (Bool), `nome` (String), `nomeFantasia` (String), `nomePais` (String), `numLpco` (String), `observacao` (String), `porcentagemRepresentante` (Double), `telefone` (String), `tipoList` (StringList), `type` (String), `vendaDebitadaVendedor` (Bool)

## Veiculo
`capacidadeKg` (Double), `descricao` (String), `inativo` (Bool), `placa` (String), `rntrc` (String), `taraKg` (Double), `tipoCarroceria` (Int), `tipoProprietario` (Int), `tipoRodado` (Int), `tipoVeiculo` (Int)

## Transportadora


## Tora
`comprimentoComercial` (Double), `comprimentoFlorestal` (Double), `dc1` (Double), `dc2` (Double), `desabilitarEdicao` (Bool), `df1` (Double), `df2` (Double), `df3` (Double), `df4` (Double), `diametroComercial` (Double), `dof` (String), `dtArrasto` (Long), `dtBaixada` (Long), `dtDescarte` (Long), `dtEntradaEstoque` (Long), `dtEntradaLocalEstoque` (Long), `dtGeracaoSinaflor` (Long), `dtRecepcaoRomaneioVenda` (Long), `dtRepique` (Long), `dtSaidaEstoque` (Long), `dtrecepcao` (Long), `ehTorete` (Bool), `ehVelha` (Bool), `hashQRCode` (String), `latitudeRecepcao` (Double), `latitudeRepique` (Double), `longitudeRecepcao` (Double), `longitudeRepique` (Double), `metrosCubicosCheio` (Double), `metrosCubicosComercial` (Double), `metrosCubicosFlorestal` (Double), `nomeEscritorioDestino` (String), `numeroAntigo` (String), `numeroArvore` (String), `oco1` (Double), `oco2` (Double), `origem` (String), `patioCorteRaso` (String), `plaqueta` (String), `plaquetaIntCache` (Long), `plaquetaSubstitutaQrcode` (String), `preco` (Double), `precoComercial` (Double), `precoTotal` (Double), `precoTotalComercial` (Double), `qrCode` (String), `responsavelBaixa` (String), `responsavelRecepcao` (String), `seccao` (String), `statusCache` (Int), `tipoCaracteristicaTora` (Int), `tipoDestinacaoTora` (Int), `valorMetroCubicoComercial` (Double), `valorMetroCubicoFlorestal` (Double)

## Serraria
`nome` (String)
