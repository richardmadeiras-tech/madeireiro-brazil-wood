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

    async function conferirBitolaVendida(id, nova) {
      const atual = await repo.obter(id);
      if (!atual || (atual.espessura === nova.espessura && atual.largura === nova.largura)) return;
      const ativos = new Set(
        (await dados.pacotes.listar()).filter((p) => p.bitolaId === id).map((p) => p.id),
      );
      const vendida = (await dados.itens.listar()).some((i) => ativos.has(i.pacoteId));
      if (vendida) {
        throw new ErroDeRegra(['Não dá para alterar: esta bitola já foi vendida em romaneios. Cadastre uma bitola nova.']);
      }
    }

    servicos[tipo] = {
      rotulo: def.rotulo,
      descricao: def.descricao,
      listar: () => repo.listar(),
      criar: async (entrada) => repo.criar(await preparar(entrada, null)),
      atualizar: async (id, entrada) => {
        const limpo = await preparar(entrada, id);
        if (tipo === 'bitolas') await conferirBitolaVendida(id, limpo);
        return repo.atualizar(id, limpo);
      },
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
