# 📋 Template de Importação CSV — Finanflow

> **Formato recomendado:** **Flat** (uma linha = uma transação)  
> Funciona 100% com o parser inteligente do app — categorias e contas são inferidas automaticamente pela descrição.

---

## 📄 Formato Flat (Recomendado)

### Cabeçalho obrigatório
```csv
Data,Descrição,Valor,Categoria,Conta,Tipo,Método
```

### Exemplo completo
```csv
Data,Descrição,Valor,Categoria,Conta,Tipo,Método
15/09/2026,Salário Líquido Caio,5322.00,Salário,Conta Corrente Principal,Receita,PIX
15/09/2026,Salário Líquido Lúbia,4517.00,Salário,Conta Corrente Principal,Receita,PIX
10/09/2026,Aluguel,650.00,Moradia,Conta Corrente Principal,Despesa,PIX
10/09/2026,Financiamento Virtus Santander,1906.00,Veículo,Santander,Despesa,Crédito
15/09/2026,Supermercado,1200.50,Alimentação,PicPay,Despesa,Crédito
10/09/2026,Gasolina,600.00,Transporte,Conta Corrente Principal,Despesa,PIX
05/09/2026,Netshoes/Adidas,103.50,Compras,PicPay,Despesa,Crédito
20/09/2026,Netflix,53.90,Assinaturas,PicPay,Despesa,Crédito
25/09/2026,Farmácia,150.00,Saúde,Conta Corrente Principal,Despesa,PIX
30/09/2026,Uber,80.00,Lazer,Conta Corrente Principal,Despesa,PIX
```

### Colunas explicadas

| Coluna | Obrigatória? | Formato | Observações |
|--------|--------------|---------|-------------|
| **Data** | ✅ Sim | `DD/MM/AAAA` ou `AAAA-MM-DD` | Se vazio, usa hoje |
| **Descrição** | ✅ Sim | Texto livre | **Usada para inferir categoria e conta** |
| **Valor** | ✅ Sim | Número (ex: `1200.50` ou `1200,50`) | Aceita `R$`, vírgula ou ponto decimal |
| **Categoria** | Opcional | Nome da categoria do app | Se vazio, **infere pela descrição** |
| **Conta** | Opcional | Nome da conta/cartão do app | Se vazio, **infere pela descrição** |
| **Tipo** | Opcional | `Receita` ou `Despesa` | Se vazio, infere pelo valor (+/-) ou descrição |
| **Método** | Opcional | `PIX`, `Crédito`, `Débito`, `Dinheiro`, `Transferência`, `Investimento` | Padrão: `PIX` |

---

## 🤖 Como gerar com IA (prompt sugerido)

> **Copie e cole isso numa IA (ChatGPT, Claude, Gemini) junto com seus dados:**

```
Gere um CSV no formato exato abaixo para importar no app Finanflow.

CABEÇALHO OBRIGATÓRIO:
Data,Descrição,Valor,Categoria,Conta,Tipo,Método

REGRAS:
- Data: DD/MM/AAAA
- Valor: número com ponto decimal (ex: 1200.50), sem R$ nem milhar
- Categoria e Conta: podem deixar vazios (o app infere pela descrição)
- Tipo: "Receita" ou "Despesa" (pode deixar vazio)
- Método: "PIX", "Crédito", "Débito", "Dinheiro", "Transferência", "Investimento" (padrão: PIX)
- Uma linha por transação
- Separador: vírgula (CSV padrão)
- Não inclua aspas nos campos

DADOS PARA CONVERTER:
[COLE SEUS DADOS AQUI - extrato bancário, planilha, notas fiscais, etc.]
```

---

## 🔍 Palavras-chave para inferência automática

O app usa a **Descrição** para adivinhar categoria e conta. Estas palavras funcionam:

### Categorias (por palavra na descrição)

| Categoria ID | Palavras-chave | Exemplos de descrição |
|--------------|----------------|----------------------|
| `cat_salario` | salario, salário, vencimento | "Salário Líquido Caio", "Vencimento Setembro" |
| `cat_renda_extra` | renda extra, freelance, bico | "Freelance Design", "Renda extra outubro" |
| `cat_rendimentos` | rendimento, juros, dividendo | "Dividendos PETR4", "Juros CDB" |
| `cat_aluguel` | aluguel | "Aluguel apto", "Aluguel setembro" |
| `cat_veiculo` | ipva, licenciamento, dpvat, financiamento, virtus, carro | "IPVA 2027", "Financiamento Virtus", "Parcela carro" |
| `cat_combustivel` | gasolina, etanol, diesel, posto, combustivel, abastecimento | "Posto Shell", "Gasolina comum", "Abastecimento" |
| `cat_alimentacao` | supermercado, mercado, padaria, açougue, ifood, rappi, uber eats, restaurante, lanche, almoço, jantar | "Supermercado Dia", "iFood jantar", "Padaria pão" |
| `cat_saude` | farmacia, farmácia, drogaria, medico, médico, hospital, clinica, exame, plano de saude, unimed, amil | "Farmácia São Paulo", "Consulta médico", "Unimed" |
| `cat_assinaturas` | netflix, spotify, prime, youtube, google one, amazonprime, apple, disney, hbo, paramount, globoplay, premiere, microsoft, office 365, adobe | "Netflix", "Spotify Premium", "YouTube Premium", "Microsoft 365" |
| `cat_lazer` | cinema, teatro, show, viagem, uber, 99, airbnb, booking, hotel, pousada, passagem, ingresso | "Cinema Kinoplex", "Uber aeroporto", "Booking hotel" |
| `cat_educacao` | escola, faculdade, universidade, curso, mensalidade, colégio, creche, material escolar | "Mensalidade escola", "Curso inglês", "Material escolar" |
| `cat_investimentos_saida` | investimento, aporte, cdb, tesouro, acoes, ações, fundo, btg, xp, rico, clear, modal | "Aporte CDB", "Compra PETR4", "Tesouro Direto" |
| `cat_moradia` | condominio, condomínio, iptu, agua, água, luz, energia, internet fixa, tv, telefone, celular, fixo, iptv, fibra, banda larga | "Condomínio", "Conta de luz", "Internet fibra", "IPTU" |
| `cat_compras_cartao` | riachuelo, renner, ceara, ceará, marisa, loja, e-commerce, magazine, magalu, casas bahia, ponto frio, fast shop, americanas | "Riachuelo e-commerce", "Magazine Luiza", "Casas Bahia" |
| `cat_outros` | outros, diversos, variados | (fallback) |

### Contas/Cartões (por palavra na descrição)

| Conta ID | Palavras-chave | Exemplos |
|----------|----------------|----------|
| `acc_picpay` | picpay, claro flex, amazonprime, google one, youtube, netflix, amazon br, netshoes, dermo ervas, paypal, lojafastop, shopee, mercado pago, internet pg, fibra, banda larga | "PicPay Claro Flex", "Amazon Prime", "Internet PG Fibra" |
| `acc_santander` | santander, jim.com, panvel | "Santander financiamento", "Jim.com air club" |
| `acc_riachuelo` | riachuelo | "Riachuelo e-commerce 1" |
| `acc_mercado_livre` | mercado livre, mercadolivre, compra diversa, secadora | "Mercado Livre compra", "Secadora de roupas" |
| `acc_itau` | itau, itáu, fatura itau | "Fatura Itaú", "Itaú Unibanco" |
| `acc_shopee` | shopee | "Shopee cuecas" |
| `acc_nubank` | nubank, nu bank, roxinho | "Nubank fatura" |
| `acc_inter` | inter, banco inter | "Inter investimento" |
| `acc_corrente` | (fallback padrão) | Qualquer descrição sem match |

---

## 📊 Formato Projeção (Suportado, mas menos recomendado)

O app também aceita planilhas no formato "linhas = lançamentos, colunas = meses":

```csv
Categoria,Descrição,Set/26,Out/26,Nov/26,Dez/26,Jan/27
RECEITAS,Salário Caio,5322,5272,5272,5272,5272
DESPESAS FIXAS,Aluguel,650,650,650,650,650
DESPESAS FIXAS,Financiamento Santander,1906,1906,1906,1906,1906
PICPAY,Netflix,53.90,53.90,53.90,53.90,53.90
```

**Regras:**
- Primeira coluna = grupo amplo (RECEITAS, DESPESAS FIXAS, PICPAY, RIACHUELO, INVESTIMENTO, etc.) — define **Receita vs Despesa**
- Segunda coluna = descrição — define **categoria e conta específica**
- Colunas 3+ = meses no formato `MMM/AA` (ex: `Set/26`, `Jan/27`)
- Valores zerados/vazios são ignorados

---

## ⚠️ Dicas importantes

1. **Use o formato Flat sempre que possível** — é mais robusto, fácil de gerar por IA e não tem problema de vírgula decimal dentro de aspas.

2. **Não precisa preencher Categoria e Conta** — o app infere pela descrição. Se quiser forçar, use os nomes exatos das categorias/contas do app.

3. **Valores**: use ponto como decimal (`1200.50`). O app aceita vírgula (`1200,50`) e `R$ 1.200,50`, mas ponto evita ambiguidade.

4. **Limpeza**: o app ignora linhas com valor zero, células vazias ou traços (`—`).

5. **Modo de importação**:
   - **Somar às existentes** (padrão): adiciona as novas transações mantendo as atuais
   - **Substituir todas as atuais**: apaga tudo e importa só o CSV

6. **Pré-visualização**: antes de confirmar, o app mostra uma tabela com as transações detectadas, categoria e conta inferidas. Confira se está tudo certo.

---

## 🧪 Testar localmente

```bash
# No terminal do projeto Finanflow
node scripts/test-import-csv.mjs
```

Este script roda o parser exato do app contra seu CSV e mostra:
- Quantas transações serão criadas
- Distribuição por mês (receitas/despesas/saldo)
- Categoria e conta inferida para cada item
- Validações pontuais (salários, financiamentos, cartões, etc.)

---

## 📝 Exemplos práticos por origem

### Extrato bancário (copiar da tabela do app do banco)
```csv
Data,Descrição,Valor,Tipo
15/09/2026,SALARIO EMPRESA LTDA,5322.00,Receita
16/09/2026,PIX RECEBIDO LÚBIA,150.00,Receita
10/09/2026,ALUGUEL IMOBILIARIA,650.00,Despesa
12/09/2026,POSTO SHELL,200.00,Despesa
15/09/2026,SUPERMERCADO DIA,850.00,Despesa
```

### Fatura de cartão (exportar PDF → Excel → CSV)
```csv
Data,Descrição,Valor,Tipo
05/09/2026,NETFLIX.COM,53.90,Despesa
08/09/2026,UBER BRASIL,45.00,Despesa
10/09/2026,AMAZON PRIME,19.90,Despesa
15/09/2026,MERCADO LIVRE,120.00,Despesa
```

### Planilha de controle próprio
```csv
Data,Descrição,Valor,Categoria,Conta,Tipo,Método
01/09/2026,Salário,5322.00,,,
05/09/2026,Aluguel,650.00,Moradia,Conta Corrente Principal,Despesa,PIX
10/09/2026,Gasolina,200.00,Transporte,PicPay,Despesa,Crédito
```

---

## 🔗 Arquivos relacionados

- `src/components/ImportSpreadsheetModal.tsx` — componente de importação (parser + UI)
- `scripts/test-import-csv.mjs` — script de validação automatizada
- `docs/CSV_TEMPLATE.md` — este arquivo

---

> **Dúvida?** Abra o modal "Importar planilha" no app — ele mostra exemplos de ambos os formatos (Flat e Projeção) com botões de "Exemplo" prontos para copiar.