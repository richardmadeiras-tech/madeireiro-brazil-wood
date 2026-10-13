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
