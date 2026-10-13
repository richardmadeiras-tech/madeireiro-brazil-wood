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
