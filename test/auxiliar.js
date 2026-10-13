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
