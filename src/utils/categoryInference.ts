import { Category, TransactionType } from '../types/finance';

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  cat_salario: ['salario', 'salário', 'vencimento', 'pagamento salario'],
  cat_renda_extra: ['renda extra', 'freelance', 'free lance', 'bico', 'extra'],
  cat_rendimentos: ['rendimento', 'juros', 'dividendo', 'dividendos', 'rentabilidade'],
  cat_aluguel: ['aluguel'],
  cat_veiculo: ['ipva', 'licenciamento', 'dpvat', 'financiamento', 'virtus', 'parcela carro', 'carro'],
  cat_combustivel: ['gasolina', 'etanol', 'diesel', 'posto', 'combustivel', 'combustível', 'abastecimento'],
  cat_alimentacao: ['supermercado', 'mercado', 'padaria', 'açougue', 'hortifruti', 'ifood', 'rappi', 'uber eats', 'zé delivery', 'japa', 'restaurante', 'lanche', 'almoço', 'jantar'],
  cat_saude: ['farmacia', 'farmácia', 'drogaria', 'medico', 'médico', 'hospital', 'clinica', 'clínica', 'exame', 'plano de saude', 'plano de saúde', 'seguro saude', 'seguro saúde', 'unimed', 'amil', 'sulamerica'],
  cat_assinaturas: ['netflix', 'spotify', 'prime', 'youtube', 'google one', 'amazonprime', 'amazon prime', 'apple', 'disney', 'hbo', 'paramount', 'globoplay', 'premiere', 'telecine', 'microsoft', 'office 365', 'adobe', 'internet', 'fibra', 'banda larga', 'telecom'],
  cat_lazer: ['cinema', 'teatro', 'show', 'viagem', 'uber', '99', 'uber eats', 'airbnb', 'booking', 'hotel', 'pousada', 'passagem', 'ingresso'],
  cat_educacao: ['escola', 'faculdade', 'universidade', 'curso', 'mensalidade', 'colegio', 'colégio', 'creche', 'material escolar'],
  cat_investimentos_saida: ['investimento', 'aporte', 'cdb', 'tesouro', 'acoes', 'ações', 'fundo', 'btg', 'xp', 'rico', 'clear', 'modal', 'nubank invest'],
  cat_moradia: ['condominio', 'condomínio', 'iptu', 'agua', 'água', 'luz', 'energia', 'internet fixa', 'tv', 'telefone', 'celular', 'fixo', 'iptv', 'fibra', 'banda larga'],
  cat_compras_cartao: ['riachuelo', 'renner', 'ceara', 'ceará', 'marisa', 'loja', 'e-commerce', 'ecommerce', 'magazine', 'magalu', 'casas bahia', 'ponto frio', 'fast shop', 'americanas', 'submarino', 'shoptime'],
  cat_outros: ['outros', 'diversos', 'variados'],
};

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const tokenize = (value: string): string[] => normalize(value).split(/[^a-z0-9]+/).filter(Boolean);

const containsSequence = (haystack: string[], needle: string[]): boolean => {
  if (needle.length === 0) return false;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    if (needle.every((token, j) => haystack[i + j] === token)) return true;
  }
  return false;
};

export const inferCategoryFromDescription = (
  description: string,
  type: TransactionType,
  categories: Pick<Category, 'id' | 'type'>[]
): string | null => {
  const tokens = tokenize(description);
  if (tokens.length === 0) return null;

  const candidates = Object.entries(CATEGORY_KEYWORDS)
    .flatMap(([catId, keywords]) => keywords.map((keyword) => ({ catId, keyword })))
    .filter(({ catId }) => {
      const cat = categories.find((c) => c.id === catId);
      return Boolean(cat && (cat.type === type || cat.type === 'both'));
    })
    .sort((a, b) => b.keyword.length - a.keyword.length);

  for (const { catId, keyword } of candidates) {
    if (containsSequence(tokens, tokenize(keyword))) return catId;
  }
  return null;
};
