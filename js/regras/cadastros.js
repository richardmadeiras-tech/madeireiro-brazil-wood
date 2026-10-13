const vazio = (v) => !String(v ?? '').trim();

export const normalizarPlaca = (texto) => String(texto ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export function validarEspecie(e) {
  return vazio(e.nome) ? ['Informe o nome da espécie.'] : [];
}

export function validarBitola(b) {
  const erros = [];
  if (!(b.espessura > 0)) erros.push('A espessura deve ser um número maior que zero, em cm (use vírgula, por exemplo 2,5).');
  if (!(b.largura > 0)) erros.push('A largura deve ser um número maior que zero, em cm (use vírgula, por exemplo 14,5).');
  if (b.espessura > 100) erros.push('A espessura não pode passar de 100 cm.');
  if (b.largura > 100) erros.push('A largura não pode passar de 100 cm.');
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
