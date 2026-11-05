# Investimentos (dinheiro guardado) — Design

Data: 2026-11-05
Status: aguardando aprovação

## Intenção

Responder, sem cadastro novo, duas perguntas: **quanto já guardei** e **quanto estou guardando por mês**. O dinheiro guardado vem dos aportes que o usuário já lança hoje na categoria **Aportes & Poupança** (`cat_investimentos_saida`). Além disso, aporte deixa de ser despesa e passa a ser uma métrica própria.

Também entra nesta entrega uma melhoria dos gráficos, para enxergar mais à frente (até 60 meses) e ver o patrimônio acumulado.

## Por que agora

Depois da remodelação da Visão geral, "Aportes & Poupança" continua contando como despesa. Guardar dinheiro parece gastar dinheiro, e não existe nenhuma visão de acumulado. O usuário pediu uma aba e uma métrica para isso.

## Objetivos

- Aporte **não** é despesa: sai de "Despesas" e do gráfico de saídas.
- Visão geral ganha o 4º número do hero: **Guardado** (mês), com o total acumulado como apoio.
- Nova aba **Investimentos** (3ª aba).
- Gráficos com horizonte de 12/24/36/60 meses e linha de patrimônio acumulado.
- Corrigir a inferência de categoria do importador e reclassificar 24 lançamentos de internet que caíram em Aportes.

## Não-objetivos

- Rendimento, posição por ativo (CDB, Tesouro, fundo) ou valor de mercado.
- Integração com corretora.
- Transferência automática da sobra para investimento.
- Controle por conta de investimento (a aba mostra um único "cofre").

## Anti-objetivos (falha se acontecer)

- Um aporte contar ao mesmo tempo como despesa e como guardado.
- "Sobrou" deixar de fechar com os outros números.
- A métrica de guardado incluir lançamentos que não são aporte (o caso da internet).
- Um resgate inflar "Entrou" e ainda reduzir "Guardado" (contagem dupla).

## Regra do que é aporte

Um lançamento é aporte quando:

```
tx.category === 'cat_investimentos_saida' || tx.paymentMethod === 'investment'
```

- **Aporte**: `type === 'expense'` com essa regra. Soma no guardado.
- **Resgate**: `type === 'income'` com essa regra. Subtrai do guardado e **não** entra em "Entrou".
- `account.type === 'investment'` **não** é sinal, porque o campo `account` guarda a origem do pagamento (ex.: internet paga no PicPay).
- A categoria `cat_investimentos_saida` tem id estável: não existe tela de criação de categorias no app.

Helper compartilhado: `src/utils/aportes.ts` com `isAporte(tx)`, `isResgate(tx)`, `aporteNet(tx)` e `sumAportes(txs)`.

## Números

Com os lançamentos do mês selecionado:

- **Entrou** = soma das receitas **excluindo resgates**.
- **Despesas** = soma das despesas **excluindo aportes**.
- **Guardado** = aportes − resgates do mês (pode ser negativo).
- **Sobrou** = Entrou − Despesas − Guardado.

Assim os quatro números fecham: `Entrou = Despesas + Guardado + Sobrou`.

Verificação do caso com resgate — salário 1.000, resgate 200, despesas 500, aporte 300:

```
Entrou   = 1.000          (resgate fora)
Despesas =   500
Guardado =   300 − 200 = 100
Sobrou   = 1.000 − 500 − 100 = 400   (= caixa real)
```

Acumulado:

- **Total guardado** = soma de todos os aportes líquidos com data até o fim do mês selecionado + saldo inicial das contas de investimento (hoje todas zero).
- **Aportes no mês** = aportes brutos do mês; se houver resgate, aparece uma nota "− R$ X em resgates".
- **Aportes no ano** = aportes brutos do ano do mês selecionado, até aquele mês, com a mesma nota de resgates.
- **Média mensal** = aportes líquidos dos últimos 12 meses até o mês selecionado ÷ 12. Rótulo explícito: "média dos últimos 12 meses".

## Onde a mudança toca

- `MonthBalanceHero`: 4 cards (2×2 no mobile, 4 colunas no desktop) e a frase-resumo.
- `DashboardView`: `totalExpense` sem aportes; novo `monthAportes`; donut sem aportes.
- `TransactionsView`: estatísticas do filtro seguem a mesma regra (despesas sem aportes; resgates fora das receitas), com "Guardado" no resumo.
- `ProjectionChart`: série de guardado e linha de guardado acumulado.
- `FinancialProjectionView`: horizonte até 60 meses, aportes fora das despesas, card "Guardado no período".
- `Navbar`: 3ª aba.
- `App`: render da nova aba, preset do modal e estado de mês compartilhado.
- `ImportSpreadsheetModal`: casamento por palavra inteira.
- Novo `InvestmentsView` e novo `SavingsChart`.

## Abordagens consideradas

**A. Aporte como lançamento (escolhida).** Usa o que o usuário já registra, sem cadastro extra. Não mostra rendimento. Escolhida por ser a única que responde "quanto guardei" com os dados existentes.

**B. Carteira de ativos com saldo e rendimento.** Mais completa, mas exige cadastro e atualização manual de cada ativo, e o usuário pediu "só dinheiro guardado".

**C. Híbrida.** Aportes automáticos + saldo manual por ativo. Fica para depois; A já cria a base.

## UX

Ordem das abas: **Visão geral | Transações | Investimentos**.

### Visão geral

Hero com 4 cards: Entrou, Despesas, Guardado, Sobrou. O card Guardado mostra o valor do mês e, embaixo, "R$ X acumulado". Se o mês tiver resgate maior que aporte, mostra "Resgatado" em vez de "Guardado".

Frase-resumo: "Em novembro entraram X, saíram Y, foram guardados Z e sobraram W."

### Aba Investimentos

1. Cabeçalho com mês (anterior/próximo/atual) e dois botões: **Novo aporte** (primário) e **Novo resgate** (secundário).
2. Quatro cards: Total guardado, Aportes no mês, Aportes no ano, Média mensal.
3. Gráfico de evolução do total guardado (linha/área) com seletor 12/24/36/60 meses.
4. Lista de movimentos agrupada por mês, incluindo aportes (positivo) e resgates (negativo), com editar e excluir, paginada em 40.
5. Estado vazio: explicação curta + botão "Registrar primeiro aporte".

Os dois botões abrem o `TransactionModal` com preset:

- **Novo aporte**: despesa, categoria Aportes, método Investimento.
- **Novo resgate**: receita, categoria Aportes, método Investimento.

O modal ganha um preset que preenche o formulário sem entrar em modo edição.

### Gráficos

- **Evolução mês a mês** (Visão geral): mantém as barras de entradas/saídas (sem aportes, sem resgates) e ganha uma linha de **guardado acumulado**. Seletor de horizonte 12/24/36/60. Tooltip mostra entrou, saiu, guardou e acumulado.
- **Gráfico da aba Investimentos** (`SavingsChart`): histórico do guardado acumulado, terminando no mês selecionado. A janela mostra os últimos N meses, mas a série é calculada desde o primeiro aporte, então o último ponto é igual ao card "Total guardado".
- **Simulação de longo prazo**: opções de 6/12/24/36/60 meses, aportes recorrentes fora de "Despesas projetadas", badge "Aporte" na linha e card "Guardado no período".

## Correção do importador

- Casar palavra inteira, não pedaço de texto. "Internet" não pode casar com "inter".
- Ordenar palavras-chave da mais longa para a mais curta e usar limites de palavra.
- Internet: usar a primeira categoria existente entre `cat_assinaturas`, `cat_ip` e `cat_moradia`. Hoje o banco do usuário só tem `cat_assinaturas` (cujo nome inclui "Internet, Streaming"), então é para lá que os 24 lançamentos vão.
- Reclassificar os 24 lançamentos "Internet Pg *nio Fibra" de `cat_investimentos_saida` para `cat_assinaturas`.
- Resultado esperado: R$ 2.280 saem de Aportes; aportes reais ficam em R$ 0 até o usuário lançar.

## Casos de borda

- Mês só com aporte: Despesas R$ 0, Guardado > 0, Sobrou = Entrou − Guardado.
- Resgate no mês: Guardado pode ficar negativo; hero usa o rótulo "Resgatado"; resgate fora de "Entrou".
- Aporte recorrente: já é materializado em lançamentos mensais; entra normalmente.
- Modo visitante: mesma regra, dados do `localStorage`.
- CSV com grupo "Investimento"/"Aportes": continua indo para a categoria certa.
- Múltiplas contas de investimento: somadas em um único cofre na v1.

## Testes e verificação

- `tsc --noEmit` e `npm run build`.
- Cenários manuais no modo visitante: mês sem aporte, mês com aporte, mês com resgate, estado vazio, horizonte de 60 meses.
- Conferir que `Entrou = Despesas + Guardado + Sobrou` em meses com dados.
- Conferir no banco que nenhum lançamento de internet ficou em Aportes.

## Decisões tomadas pelo construtor

- Entrou e todas as receitas excluem resgates, para o caixa fechar.
- A linha acumulada dos gráficos é o **guardado acumulado**, não o caixa acumulado.
- `SavingsChart` é histórico (termina no mês selecionado) e carrega o histórico anterior à janela para o último ponto bater com o card.
- A lista da aba mostra todos os meses, agrupada, com aportes e resgates; o mês do cabeçalho afeta cards e gráfico.
- "Aportes no mês/ano" são brutos, com nota de resgates; "Total guardado" e "Média mensal" são líquidos.
- Resgates ganham botão próprio e aparecem como linha negativa na lista.
- Internet vai para `cat_assinaturas` quando for a única categoria de internet existente.

## Decisões deixadas para o construtor

- Visual exato do gráfico (barras + linha), usando os tokens de cor existentes.
- Textos do estado vazio.
- Estrutura interna do seletor de horizonte.
