import React, { useState, useEffect } from 'react';
import { X, Check, CreditCard, Repeat, Calendar, DollarSign, Calculator, Layers, HelpCircle } from 'lucide-react';
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

  // Reset or fill form when modal opens
  useEffect(() => {
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
  }, [initialData, isOpen, categories, accounts]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-[#1d1d20] rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#101012]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {initialData ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              À vista, parcelado no cartão em vezes ou contas fixas recorrentes
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* 1. Type Selector (Despesa vs Receita) */}
          <div className="flex items-center gap-1 p-1 bg-[#1d1d20] rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                type === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Despesa (Saída)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                type === 'income'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-orange-400 hover:text-white'
              }`}
            >
              Receita (Entrada)
            </button>
          </div>

          {/* 2. Modern Entry Mode (À vista vs Cartão Parcelado vs Fixo Recorrente) */}
          {!initialData && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Formato do Lançamento
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleEntryModeChange('single')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    entryMode === 'single'
                      ? 'border-orange-500 bg-zinc-950/40 text-zinc-300 ring-1 ring-orange-500'
                      : 'border-zinc-800 bg-[#1d1d20] text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>À Vista / Único</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 leading-tight">
                    Pix, débito, boleto avulso
                  </span>
                </button>

                <button
                  type="button"
                  disabled={type === 'income'}
                  onClick={() => handleEntryModeChange('installment')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    type === 'income' ? 'opacity-40 cursor-not-allowed' : ''
                  } ${
                    entryMode === 'installment'
                      ? 'border-orange-500 bg-zinc-950/40 text-zinc-300 ring-1 ring-orange-500'
                      : 'border-zinc-800 bg-[#1d1d20] text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Cartão em Vezes</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 leading-tight">
                    Divide em 2x, 6x, 12x...
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEntryModeChange('recurrent')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    entryMode === 'recurrent'
                      ? 'border-orange-500 bg-zinc-950/40 text-zinc-300 ring-1 ring-orange-500'
                      : 'border-zinc-800 bg-[#1d1d20] text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Fixo / Recorrente</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 leading-tight">
                    Salário, aluguel, parcelas fixas
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 3. Description Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Descrição do Lançamento
            </label>
            <input
              type="text"
              placeholder="Ex: Compra Sofá, Financiamento Carro, Salário, Supermercado..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full px-3.5 py-2.5 text-sm text-white bg-[#1d1d20] border rounded-xl outline-hidden transition-all placeholder:text-zinc-500 ${
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
              <label className="text-xs font-semibold text-zinc-300">
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
                className={`w-full pl-11 pr-4 py-2.5 text-lg font-bold font-mono tabular-nums text-white bg-[#1d1d20] border rounded-xl outline-hidden transition-all ${
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
                    className="w-16 px-2 py-1 text-xs font-bold text-center text-white bg-[#1d1d20] border border-zinc-700 rounded-lg outline-hidden focus:border-orange-500"
                  />
                  <span className="text-xs text-zinc-400">vezes</span>
                </div>
              </div>

              {/* Installment Summary Banner */}
              {parsedRawAmount > 0 && (
                <div className="p-2.5 bg-[#1d1d20] border border-zinc-800/40 rounded-lg text-xs space-y-1">
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
                <div className="p-2.5 bg-[#1d1d20] border border-zinc-800/40 rounded-lg text-xs text-zinc-300 space-y-1">
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
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Categoria
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1.5 border border-zinc-800 rounded-xl bg-[#09090b]">
              {filteredCategories.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-all ${
                      isSelected
                        ? 'bg-orange-600 text-white font-medium shadow-xs'
                        : 'bg-[#1d1d20] hover:bg-zinc-800 text-zinc-200 border border-zinc-700/40'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: isSelected ? 'transparent' : `${cat.color}25`,
                        color: isSelected ? '#ffffff' : cat.color,
                      }}
                    >
                      <CategoryIcon
                        name={cat.icon}
                        color={isSelected ? '#ffffff' : cat.color}
                        className="w-3.5 h-3.5"
                      />
                    </div>
                    <span className="truncate">{cat.name}</span>
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
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                {entryMode === 'installment' ? 'Cartão de Crédito' : 'Conta / Cartão'}
              </label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full px-3 py-2 text-xs text-white border border-zinc-700 rounded-xl bg-[#1d1d20] outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
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
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs text-white border border-zinc-700 rounded-xl bg-[#1d1d20] outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
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
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                {entryMode === 'installment' ? 'Data da 1ª Parcela' : 'Data do Lançamento'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs text-white border border-zinc-700 rounded-xl bg-[#1d1d20] outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-mono"
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
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Observações (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Garantia de 1 ano, loja física, código de rastreio..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs text-white bg-[#1d1d20] border border-zinc-700 rounded-xl outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 placeholder:text-zinc-500"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-[#0d0d0f]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-orange-600 hover:bg-zinc-500 rounded-xl transition-all shadow-md shadow-orange-950 whitespace-nowrap"
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
