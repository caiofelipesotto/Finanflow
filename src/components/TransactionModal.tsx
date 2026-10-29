import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  CreditCard,
  Repeat,
  Calendar,
  DollarSign,
  Calculator,
  Layers,
  HelpCircle,
  Pencil,
  PlusCircle,
} from 'lucide-react';
import { Transaction, Category, Account, TransactionType, PaymentMethod } from '../types/finance';
import { getTodayString, formatCurrency, addMonthsToDate, formatMonthShort } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

export type EntryMode = 'single' | 'installment' | 'recurrent';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    txDataOrArray: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[],
    existingId?: string
  ) => void;
  initialData?: Transaction | null;
  categories: Category[];
  accounts: Account[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories,
  accounts,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [entryMode, setEntryMode] = useState<EntryMode>('single');
  const [description, setDescription] = useState('');
  
  // Amount states
  const [amountInput, setAmountInput] = useState(''); // When in single mode or total mode
  const [installmentMode, setInstallmentMode] = useState<'total' | 'per_installment'>('total');
  const [totalInstallments, setTotalInstallments] = useState<number>(3);
  const [recurrentMonths, setRecurrentMonths] = useState<number>(12); // How many months to project
  
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit');
  const [date, setDate] = useState(getTodayString());
  const [isPaid, setIsPaid] = useState(false);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // O polling da nuvem recria as listas de categorias/contas a cada ciclo. Se o
  // efeito de reset dependesse delas, o formulário seria limpo enquanto o
  // usuário digita. Lemos sempre a versão mais recente por ref e só resetamos
  // quando o modal abre (ou muda o lançamento em edição).
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;
  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;

  // Reset or fill form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const categories = categoriesRef.current;
    const accounts = accountsRef.current;
    if (initialData) {
      setType(initialData.type);
      setDescription(initialData.description);
      setAmountInput(initialData.amount.toFixed(2));
      setCategory(initialData.category);
      setAccount(initialData.account);
      setPaymentMethod(initialData.paymentMethod);
      setDate(initialData.date);
      setIsPaid(initialData.isPaid);
      setNotes(initialData.notes || '');
      
      if (initialData.installment) {
        setEntryMode('installment');
        setTotalInstallments(initialData.installment.total);
      } else if (initialData.recurrence === 'monthly') {
        setEntryMode('recurrent');
      } else {
        setEntryMode('single');
      }
    } else {
      setType('expense');
      setEntryMode('single');
      setDescription('');
      setAmountInput('');
      setInstallmentMode('total');
      setTotalInstallments(3);
      setRecurrentMonths(12);

      // Default category
      const firstExp = categories.find((c) => c.type === 'expense' || c.type === 'both');
      setCategory(firstExp ? firstExp.id : categories[0]?.id || '');
      
      // Default account: prefer a credit card if in expense, else first account
      const firstCredit = accounts.find((a) => a.type === 'credit');
      setAccount(firstCredit ? firstCredit.id : accounts[0]?.id || '');
      setPaymentMethod('credit');
      setDate(getTodayString());
      setIsPaid(false);
      setNotes('');
    }
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  // If user switches entry mode to 'installment', auto switch account to credit card if possible
  const handleEntryModeChange = (mode: EntryMode) => {
    setEntryMode(mode);
    if (mode === 'installment') {
      setType('expense');
      setPaymentMethod('credit');
      const creditAcc = accounts.find((a) => a.type === 'credit');
      if (creditAcc) setAccount(creditAcc.id);
    }
  };

  // Adjust category if type changes
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'income' && entryMode === 'installment') {
      setEntryMode('single');
    }
    const available = categories.filter((c) => c.type === newType || c.type === 'both');
    if (!available.some((c) => c.id === category)) {
      setCategory(available[0]?.id || '');
    }
    if (newType === 'income') {
      const checkingAcc = accounts.find((a) => a.type === 'checking') || accounts[0];
      if (checkingAcc) setAccount(checkingAcc.id);
      setPaymentMethod('pix');
    }
  };

  const filteredCategories = categories.filter(
    (c) => c.type === type || c.type === 'both'
  );

  // Installment calculations
  const parsedRawAmount = parseFloat(amountInput.replace(',', '.')) || 0;
  
  let calculatedTotalPurchase = 0;
  let calculatedInstallmentAmount = 0;

  if (entryMode === 'installment') {
    if (installmentMode === 'total') {
      calculatedTotalPurchase = parsedRawAmount;
      calculatedInstallmentAmount = totalInstallments > 0 ? parsedRawAmount / totalInstallments : 0;
    } else {
      calculatedInstallmentAmount = parsedRawAmount;
      calculatedTotalPurchase = parsedRawAmount * totalInstallments;
    }
  } else {
    calculatedTotalPurchase = parsedRawAmount;
    calculatedInstallmentAmount = parsedRawAmount;
  }

  // Calculate start & end months for preview
  const firstMonthLabel = date ? formatMonthShort(parseInt(date.split('-')[0]), parseInt(date.split('-')[1]) - 1) : '';
  const lastInstallmentDate = date ? addMonthsToDate(date, totalInstallments - 1) : '';
  const lastInstallmentLabel = lastInstallmentDate ? formatMonthShort(parseInt(lastInstallmentDate.split('-')[0]), parseInt(lastInstallmentDate.split('-')[1]) - 1) : '';

  const lastRecurrentDate = date ? addMonthsToDate(date, recurrentMonths - 1) : '';
  const lastRecurrentLabel = lastRecurrentDate ? formatMonthShort(parseInt(lastRecurrentDate.split('-')[0]), parseInt(lastRecurrentDate.split('-')[1]) - 1) : '';

  const applyPreset = (presetDesc: string, presetCatId: string, presetType: TransactionType, defaultMode: EntryMode = 'single') => {
    setDescription(presetDesc);
    setType(presetType);
    setCategory(presetCatId);
    setEntryMode(defaultMode);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (parsedRawAmount <= 0) {
      newErrors.amount = 'Informe um valor válido maior que zero.';
    }

    if (!description.trim()) {
      newErrors.description = 'Informe uma descrição para o lançamento.';
    }

    if (!category) {
      newErrors.category = 'Selecione uma categoria.';
    }

    if (!account) {
      newErrors.account = 'Selecione uma conta ou cartão.';
    }

    if (entryMode === 'installment' && (totalInstallments < 2 || totalInstallments > 72)) {
      newErrors.installments = 'O número de parcelas deve ser entre 2 e 72 vezes.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // 1. EDITING an existing transaction
    if (initialData) {
      onSave(
        {
          description: description.trim(),
          amount: Math.round(parsedRawAmount * 100) / 100,
          type,
          category,
          account,
          paymentMethod,
          date,
          isPaid,
          notes: notes.trim() || undefined,
          recurrence: initialData.recurrence,
          installment: initialData.installment,
        },
        initialData.id
      );
      onClose();
      return;
    }

    // 2. CREATING NEW INSTALLMENTS (Cartão em Vezes)
    if (entryMode === 'installment') {
      const installmentGroupId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const singleInstAmount = Math.round(calculatedInstallmentAmount * 100) / 100;
      const totalAmount = Math.round(calculatedTotalPurchase * 100) / 100;

      const generatedInstallments: Omit<Transaction, 'id'>[] = [];

      for (let i = 1; i <= totalInstallments; i++) {
        const installmentDate = addMonthsToDate(date, i - 1);
        generatedInstallments.push({
          description: `${description.trim()} (${i}/${totalInstallments})`,
          amount: singleInstAmount,
          type: 'expense',
          category,
          account,
          paymentMethod: 'credit',
          date: installmentDate,
          isPaid: i === 1 ? isPaid : false,
          notes: notes.trim() || undefined,
          recurrence: 'installment',
          installment: {
            current: i,
            total: totalInstallments,
            installmentGroupId,
            totalPurchaseAmount: totalAmount,
          },
        });
      }

      onSave(generatedInstallments);
      onClose();
      return;
    }

    // 3. CREATING NEW RECURRENT (Fixa / Todo Mês)
    if (entryMode === 'recurrent') {
      const recurrenceGroupId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fixedAmount = Math.round(parsedRawAmount * 100) / 100;

      const generatedRecurrences: Omit<Transaction, 'id'>[] = [];

      for (let i = 0; i < recurrentMonths; i++) {
        const recurrentDate = addMonthsToDate(date, i);
        generatedRecurrences.push({
          description: description.trim(),
          amount: fixedAmount,
          type,
          category,
          account,
          paymentMethod,
          date: recurrentDate,
          isPaid: i === 0 ? isPaid : false,
          notes: notes.trim() || undefined,
          recurrence: 'monthly',
          recurrenceGroupId,
        });
      }

      onSave(generatedRecurrences);
      onClose();
      return;
    }

    // 4. CREATING SINGLE TRANSACTION (À Vista / Único)
    onSave({
      description: description.trim(),
      amount: Math.round(parsedRawAmount * 100) / 100,
      type,
      category,
      account,
      paymentMethod,
      date,
      isPaid,
      notes: notes.trim() || undefined,
      recurrence: 'single',
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-[#1d1d20] rounded-t-2xl sm:rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-zinc-800">
          <div className="w-9 h-9 rounded-xl bg-orange-500/12 border border-orange-500/25 text-orange-400 flex items-center justify-center shrink-0">
            {initialData ? <Pencil className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold text-white leading-tight">
              {initialData ? 'Editar lançamento' : 'Novo lançamento'}
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
              À vista, parcelado no cartão ou conta fixa
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 -mt-1 -mr-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-6">
          {/* 1. Type Selector (Despesa vs Receita) */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#141416] rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 text-[11px] font-bold rounded-lg border transition-colors whitespace-nowrap ${
                type === 'expense'
                  ? 'bg-rose-500/12 text-rose-300 border-rose-500/40'
                  : 'bg-transparent text-zinc-400 border-transparent hover:text-zinc-200'
              }`}
            >
              Despesa (saída)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 text-[11px] font-bold rounded-lg border transition-colors whitespace-nowrap ${
                type === 'income'
                  ? 'bg-emerald-500/12 text-emerald-300 border-emerald-500/40'
                  : 'bg-transparent text-zinc-400 border-transparent hover:text-zinc-200'
              }`}
            >
              Receita (entrada)
            </button>
          </div>

          {/* 2. Modern Entry Mode (À vista vs Cartão Parcelado vs Fixo Recorrente) */}
          {!initialData && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1.5">
                Formato
              </label>
              <div className="grid grid-cols-3 gap-1.5 items-stretch">
                <button
                  type="button"
                  onClick={() => handleEntryModeChange('single')}
                  className={`relative p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-colors ${
                    entryMode === 'single'
                      ? 'border-orange-500/60 bg-orange-500/10'
                      : 'border-zinc-800 bg-[#141416] hover:border-zinc-700'
                  }`}
                >
                  {entryMode === 'single' && (
                    <Check className="absolute top-1.5 right-1.5 w-3 h-3 text-orange-400" />
                  )}
                  <div
                    className={`flex items-center gap-1.5 font-bold text-[11px] ${
                      entryMode === 'single' ? 'text-orange-300' : 'text-zinc-200'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">À vista</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 leading-tight">
                    Pix, débito, boleto
                  </span>
                </button>

                <button
                  type="button"
                  disabled={type === 'income'}
                  onClick={() => handleEntryModeChange('installment')}
                  className={`relative p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-colors ${
                    type === 'income' ? 'opacity-40 cursor-not-allowed' : ''
                  } ${
                    entryMode === 'installment'
                      ? 'border-orange-500/60 bg-orange-500/10'
                      : 'border-zinc-800 bg-[#141416] hover:border-zinc-700'
                  }`}
                >
                  {entryMode === 'installment' && (
                    <Check className="absolute top-1.5 right-1.5 w-3 h-3 text-orange-400" />
                  )}
                  <div
                    className={`flex items-center gap-1.5 font-bold text-[11px] ${
                      entryMode === 'installment' ? 'text-orange-300' : 'text-zinc-200'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Parcelado</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 leading-tight">
                    2x, 6x, 12x no cartão
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEntryModeChange('recurrent')}
                  className={`relative p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-colors ${
                    entryMode === 'recurrent'
                      ? 'border-orange-500/60 bg-orange-500/10'
                      : 'border-zinc-800 bg-[#141416] hover:border-zinc-700'
                  }`}
                >
                  {entryMode === 'recurrent' && (
                    <Check className="absolute top-1.5 right-1.5 w-3 h-3 text-orange-400" />
                  )}
                  <div
                    className={`flex items-center gap-1.5 font-bold text-[11px] ${
                      entryMode === 'recurrent' ? 'text-orange-300' : 'text-zinc-200'
                    }`}
                  >
                    <Repeat className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Fixo</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 leading-tight">
                    Mensal e recorrente
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 3. Description Input */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1.5">
              Descrição
            </label>
            <input
              type="text"
              placeholder="Ex: Supermercado, aluguel, salário..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full px-3.5 py-2.5 text-sm text-white bg-[#141416] border rounded-lg outline-hidden transition-colors placeholder:text-zinc-500 ${
                errors.description
                  ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/30'
                  : 'border-zinc-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
              }`}
              autoFocus
            />
            {errors.description && (
              <span className="text-xs text-rose-400 mt-1 block">{errors.description}</span>
            )}
          </div>

          {/* 4. Amount Section (With Installment modes if applicable) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                {entryMode === 'installment'
                  ? installmentMode === 'total'
                    ? 'Valor Total da Compra (R$)'
                    : 'Valor de Cada Parcela (R$)'
                  : 'Valor (R$)'}
              </label>

              {entryMode === 'installment' && (
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setInstallmentMode('total')}
                    className={`px-2 py-0.5 rounded-md transition-colors ${
                      installmentMode === 'total'
                        ? 'bg-orange-600 text-white font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Digitar Total
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstallmentMode('per_installment')}
                    className={`px-2 py-0.5 rounded-md transition-colors ${
                      installmentMode === 'per_installment'
                        ? 'bg-orange-600 text-white font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Digitar Parcela
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500 font-mono">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className={`w-full pl-11 pr-4 py-2.5 text-lg font-bold font-mono tabular-nums text-white bg-[#141416] border rounded-lg outline-hidden transition-colors ${
                  errors.amount
                    ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/30'
                    : 'border-zinc-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                }`}
              />
            </div>
            {errors.amount && (
              <span className="text-xs text-rose-400 block">{errors.amount}</span>
            )}
          </div>

          {/* 5. Special Mode: Cartão em Vezes Details */}
          {entryMode === 'installment' && (
            <div className="p-3.5 bg-zinc-950/20 border border-zinc-800/60 rounded-xl space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-zinc-200">
                    Em quantas vezes deseja parcelar?
                  </span>
                  <span className="text-xs font-bold font-mono text-zinc-300">
                    {totalInstallments}x
                  </span>
                </div>

                {/* Quick installment buttons */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[2, 3, 4, 5, 6, 10, 12, 18, 24].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTotalInstallments(num)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                        totalInstallments === num
                          ? 'bg-orange-600 text-white border-orange-500 shadow-xs'
                          : 'bg-[#1d1d20] text-zinc-300 border-zinc-700 hover:border-neutral-600'
                      }`}
                    >
                      {num}x
                    </button>
                  ))}
                </div>

                {/* Custom installment input */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400">Ou digite o número exato:</span>
                  <input
                    type="number"
                    min="2"
                    max="72"
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(parseInt(e.target.value) || 2)}
                    className="w-16 px-2 py-1 text-xs font-bold text-center text-white bg-[#141416] border border-zinc-700 rounded-lg outline-hidden focus:border-orange-500"
                  />
                  <span className="text-xs text-zinc-400">vezes</span>
                </div>
              </div>

              {/* Installment Summary Banner */}
              {parsedRawAmount > 0 && (
                <div className="ui-panel p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between text-zinc-300 font-medium">
                    <span>Resumo do Parcelamento:</span>
                    <strong className="text-sm font-bold text-white font-mono">
                      {totalInstallments}x de {formatCurrency(calculatedInstallmentAmount)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                    <span>Total da compra:</span>
                    <span className="font-mono text-zinc-300">{formatCurrency(calculatedTotalPurchase)}</span>
                  </div>
                  <div className="text-[11px] text-zinc-300/80 pt-1 border-t border-zinc-800">
                    📅 1ª parcela em <strong>{firstMonthLabel}</strong> até a {totalInstallments}ª em <strong>{lastInstallmentLabel}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. Special Mode: Recorrente (Fixo todo mês) Details */}
          {entryMode === 'recurrent' && (
            <div className="p-3.5 bg-zinc-950/20 border border-zinc-800/60 rounded-xl space-y-2.5">
              <span className="text-xs font-semibold text-zinc-200 block">
                Por quantos meses deseja projetar este valor fixo?
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '3 meses', val: 3 },
                  { label: '6 meses', val: 6 },
                  { label: '12 meses (1 ano)', val: 12 },
                  { label: '24 meses (2 anos)', val: 24 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setRecurrentMonths(item.val)}
                    className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border text-center transition-all ${
                      recurrentMonths === item.val
                        ? 'bg-zinc-600 text-white border-orange-500 shadow-xs'
                        : 'bg-[#1d1d20] text-zinc-300 border-zinc-700 hover:border-neutral-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {parsedRawAmount > 0 && (
                <div className="ui-panel p-2.5 text-xs text-zinc-300 space-y-1">
                  <div className="text-zinc-300 text-[11px]">
                    🔄 Serão gerados <strong>{recurrentMonths} lançamentos mensais</strong> de <strong>{formatCurrency(parsedRawAmount)}</strong>
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Do mês de <strong>{firstMonthLabel}</strong> até <strong>{lastRecurrentLabel}</strong>.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. Category Selector */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1.5">
              Categoria
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {filteredCategories.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 min-h-[42px] px-2 py-1.5 rounded-lg text-left text-[11px] leading-tight transition-colors ${
                      isSelected
                        ? 'bg-orange-500/15 text-orange-200 border border-orange-500/50 font-semibold'
                        : 'bg-[#141416] text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div
                      className="cat-icon w-5 h-5 rounded flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: isSelected ? 'transparent' : `${cat.color}25`,
                        color: isSelected ? '#f97316' : cat.color,
                      }}
                    >
                      <CategoryIcon
                        name={cat.icon}
                        color={isSelected ? '#f97316' : cat.color}
                        className="w-3.5 h-3.5"
                      />
                    </div>
                    <span className="min-w-0 flex-1 break-words">{cat.name}</span>
                  </button>
                );
              })}
            </div>
            {errors.category && (
              <span className="text-xs text-rose-400 mt-1 block">{errors.category}</span>
            )}
          </div>

          {/* 8. Account & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1.5">
                {entryMode === 'installment' ? 'Cartão de Crédito' : 'Conta / Cartão'}
              </label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full px-3 py-2.5 text-xs text-white border border-zinc-700 rounded-lg bg-[#141416] outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-[#1d1d20] text-white">
                    {acc.type === 'credit' ? '💳 ' : '🏦 '}
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1.5">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2.5 text-xs text-white border border-zinc-700 rounded-lg bg-[#141416] outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="credit" className="bg-[#1d1d20] text-white">Cartão de Crédito</option>
                <option value="pix" className="bg-[#1d1d20] text-white">Pix</option>
                <option value="debit" className="bg-[#1d1d20] text-white">Cartão de Débito</option>
                <option value="cash" className="bg-[#1d1d20] text-white">Dinheiro em Espécie</option>
                <option value="transfer" className="bg-[#1d1d20] text-white">Transferência / TED</option>
                <option value="investment" className="bg-[#1d1d20] text-white">Investimento</option>
              </select>
            </div>
          </div>

          {/* 9. Date & Paid Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1.5">
                {entryMode === 'installment' ? 'Data da 1ª Parcela' : 'Data do Lançamento'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 text-xs text-white border border-zinc-700 rounded-lg bg-[#141416] outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-mono"
              />
            </div>

            <div className="pt-4 sm:pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="w-4 h-4 text-zinc-500 rounded border-zinc-700 bg-[#1d1d20] focus:ring-orange-500"
                />
                <span className="font-medium">
                  {entryMode === 'installment'
                    ? '1ª parcela já foi paga na fatura atual'
                    : type === 'expense'
                    ? 'Já foi pago'
                    : 'Já foi recebido'}
                </span>
              </label>
            </div>
          </div>

          {/* 10. Optional notes */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1.5">
              Observações (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Garantia de 1 ano, loja física, código de rastreio..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 text-xs text-white bg-[#141416] border border-zinc-700 rounded-lg outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 placeholder:text-zinc-500"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center gap-2 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-zinc-800 bg-[#141416]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:text-white bg-transparent hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-zinc-950 bg-orange-500 hover:bg-orange-400 rounded-lg transition-colors whitespace-nowrap"
          >
            <Check className="w-4 h-4" />
            <span>
              {initialData
                ? 'Salvar Alterações'
                : entryMode === 'installment'
                ? `Gerar ${totalInstallments} Parcelas`
                : entryMode === 'recurrent'
                ? `Projetar ${recurrentMonths} Meses`
                : 'Adicionar Lançamento'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
