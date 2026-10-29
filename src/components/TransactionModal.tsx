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
    <div className="ui-modal-overlay" onClick={onClose}>
      <div className="ui-modal max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="ui-modal-header">
          <span className="ui-icon ui-icon-accent !w-9 !h-9">
            {initialData ? <Pencil className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="ui-modal-title">{initialData ? 'Editar lançamento' : 'Novo lançamento'}</h2>
            <p className="ui-modal-sub">À vista, parcelado no cartão ou conta fixa</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 -mt-1 -mr-1 rounded-[var(--r-control)] text-[var(--text-4)] hover:text-[var(--text-1)] hover:bg-[var(--surface-3)] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="ui-modal-body space-y-4">
          {/* 1. Tipo do lançamento */}
          <div className="ui-segmented w-full">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`ui-seg-item flex-1 !py-2 ${type === 'expense' ? 'ui-seg-item-active' : ''}`}
            >
              Despesa (saída)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`ui-seg-item flex-1 !py-2 ${type === 'income' ? 'ui-seg-item-active' : ''}`}
            >
              Receita (entrada)
            </button>
          </div>

          {/* 2. Modern Entry Mode (À vista vs Cartão Parcelado vs Fixo Recorrente) */}
          {!initialData && (
            <div>
              <label className="ui-label">Formato</label>
              <div className="grid grid-cols-3 gap-1.5 items-stretch">
                <button
                  type="button"
                  onClick={() => handleEntryModeChange('single')}
                  className={`relative p-2.5 rounded-[var(--r-panel)] border text-left flex flex-col gap-1 transition-colors ${
                    entryMode === 'single'
                      ? 'border-[color-mix(in_srgb,var(--accent-text)_45%,transparent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-1)] bg-[var(--surface-2)] hover:border-[var(--border-2)]'
                  }`}
                >
                  {entryMode === 'single' && (
                    <Check className="absolute top-1.5 right-1.5 w-3 h-3 text-[var(--accent-text)]" />
                  )}
                  <div
                    className={`flex items-center gap-1.5 font-bold text-[11px] ${
                      entryMode === 'single' ? 'text-[var(--accent-text)]' : 'text-[var(--text-2)]'
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
                  className={`relative p-2.5 rounded-[var(--r-panel)] border text-left flex flex-col gap-1 transition-colors ${
                    type === 'income' ? 'opacity-40 cursor-not-allowed' : ''
                  } ${
                    entryMode === 'installment'
                      ? 'border-[color-mix(in_srgb,var(--accent-text)_45%,transparent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-1)] bg-[var(--surface-2)] hover:border-[var(--border-2)]'
                  }`}
                >
                  {entryMode === 'installment' && (
                    <Check className="absolute top-1.5 right-1.5 w-3 h-3 text-[var(--accent-text)]" />
                  )}
                  <div
                    className={`flex items-center gap-1.5 font-bold text-[11px] ${
                      entryMode === 'installment' ? 'text-[var(--accent-text)]' : 'text-[var(--text-2)]'
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
                  className={`relative p-2.5 rounded-[var(--r-panel)] border text-left flex flex-col gap-1 transition-colors ${
                    entryMode === 'recurrent'
                      ? 'border-[color-mix(in_srgb,var(--accent-text)_45%,transparent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-1)] bg-[var(--surface-2)] hover:border-[var(--border-2)]'
                  }`}
                >
                  {entryMode === 'recurrent' && (
                    <Check className="absolute top-1.5 right-1.5 w-3 h-3 text-[var(--accent-text)]" />
                  )}
                  <div
                    className={`flex items-center gap-1.5 font-bold text-[11px] ${
                      entryMode === 'recurrent' ? 'text-[var(--accent-text)]' : 'text-[var(--text-2)]'
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
            <label className="ui-label">Descrição</label>
            <input
              type="text"
              placeholder="Ex: Supermercado, aluguel, salário..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`ui-input ${errors.description ? '!border-[var(--danger-text)]' : ''}`}
              autoFocus
            />
            {errors.description && (
              <span className="text-[11px] text-[var(--danger-text)] mt-1 block">{errors.description}</span>
            )}
          </div>

          {/* 4. Amount Section (With Installment modes if applicable) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="ui-label !mb-0">
                {entryMode === 'installment'
                  ? installmentMode === 'total'
                    ? 'Valor Total da Compra (R$)'
                    : 'Valor de Cada Parcela (R$)'
                  : 'Valor (R$)'}
              </label>

              {entryMode === 'installment' && (
                <div className="ui-segmented">
                  <button
                    type="button"
                    onClick={() => setInstallmentMode('total')}
                    className={`ui-seg-item ${installmentMode === 'total' ? 'ui-seg-item-active' : ''}`}
                  >
                    Digitar total
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstallmentMode('per_installment')}
                    className={`ui-seg-item ${installmentMode === 'per_installment' ? 'ui-seg-item-active' : ''}`}
                  >
                    Digitar parcela
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-4)]">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className={`ui-input !pl-10 !text-lg !font-bold tabular-nums ${errors.amount ? '!border-[var(--danger-text)]' : ''}`}
              />
            </div>
            {errors.amount && (
              <span className="text-[11px] text-[var(--danger-text)] block">{errors.amount}</span>
            )}
          </div>

          {/* 5. Special Mode: Cartão em Vezes Details */}
          {entryMode === 'installment' && (
            <div className="ui-tile p-3 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-[var(--text-2)]">
                    Em quantas vezes deseja parcelar?
                  </span>
                  <span className="text-[11px] font-bold text-[var(--text-1)] tabular-nums">
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
                      className={`ui-seg-item !border ${
                        totalInstallments === num
                          ? 'ui-seg-item-active !border-[color-mix(in_srgb,var(--accent-text)_40%,transparent)]'
                          : '!border-[var(--border-1)]'
                      }`}
                    >
                      {num}x
                    </button>
                  ))}
                </div>

                {/* Custom installment input */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--text-3)]">Ou digite o número exato:</span>
                  <input
                    type="number"
                    min="2"
                    max="72"
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(parseInt(e.target.value) || 2)}
                    className="ui-input !w-16 !px-2 !py-1 text-center font-bold tabular-nums"
                  />
                  <span className="text-[11px] text-[var(--text-3)]">vezes</span>
                </div>
              </div>

              {/* Installment Summary Banner */}
              {parsedRawAmount > 0 && (
                <div className="ui-tile !bg-[var(--surface-1)] p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[var(--text-2)] font-medium gap-2">
                    <span>Resumo do parcelamento:</span>
                    <strong className="text-sm font-bold text-[var(--text-1)] tabular-nums">
                      {totalInstallments}x de {formatCurrency(calculatedInstallmentAmount)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[var(--text-3)] text-[11px] tabular-nums">
                    <span>Total da compra:</span>
                    <span className="text-[var(--text-2)]">{formatCurrency(calculatedTotalPurchase)}</span>
                  </div>
                  <div className="text-[11px] text-[var(--text-3)] pt-1 border-t border-[var(--border-1)]">
                    1ª parcela em <strong className="text-[var(--text-2)]">{firstMonthLabel}</strong> e a última em{' '}
                    <strong className="text-[var(--text-2)]">{lastInstallmentLabel}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. Special Mode: Recorrente (Fixo todo mês) Details */}
          {entryMode === 'recurrent' && (
            <div className="ui-tile p-3 space-y-2.5">
              <span className="text-[11px] font-semibold text-[var(--text-2)] block">
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
                    className={`ui-seg-item !border !py-1.5 ${
                      recurrentMonths === item.val
                        ? 'ui-seg-item-active !border-[color-mix(in_srgb,var(--accent-text)_40%,transparent)]'
                        : '!border-[var(--border-1)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {parsedRawAmount > 0 && (
                <div className="ui-tile !bg-[var(--surface-1)] p-2.5 text-xs space-y-1 tabular-nums">
                  <div className="text-[var(--text-3)] text-[11px]">
                    Serão gerados <strong className="text-[var(--text-1)]">{recurrentMonths} lançamentos mensais</strong> de{' '}
                    <strong className="text-[var(--text-1)]">{formatCurrency(parsedRawAmount)}</strong>
                  </div>
                  <div className="text-[11px] text-[var(--text-4)]">
                    De <strong className="text-[var(--text-2)]">{firstMonthLabel}</strong> até{' '}
                    <strong className="text-[var(--text-2)]">{lastRecurrentLabel}</strong>.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. Category Selector */}
          <div>
            <label className="ui-label">Categoria</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {filteredCategories.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 min-h-[40px] px-2 py-1.5 rounded-[var(--r-control)] border text-left text-[11px] leading-tight transition-colors ${
                      isSelected
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] border-[color-mix(in_srgb,var(--accent-text)_45%,transparent)] font-semibold'
                        : 'bg-[var(--surface-2)] text-[var(--text-2)] border-[var(--border-1)] hover:border-[var(--border-2)]'
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
              <span className="text-[11px] text-[var(--danger-text)] mt-1 block">{errors.category}</span>
            )}
          </div>

          {/* 8. Account & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="ui-label">
                {entryMode === 'installment' ? 'Cartão de crédito' : 'Conta / cartão'}
              </label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="ui-input"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.type === 'credit' ? '💳 ' : '🏦 '}
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="ui-label">Forma de pagamento</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="ui-input"
              >
                <option value="credit">Cartão de crédito</option>
                <option value="pix">Pix</option>
                <option value="debit">Cartão de débito</option>
                <option value="cash">Dinheiro em espécie</option>
                <option value="transfer">Transferência / TED</option>
                <option value="investment">Investimento</option>
              </select>
            </div>
          </div>

          {/* 9. Date & Paid Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="ui-label">
                {entryMode === 'installment' ? 'Data da 1ª parcela' : 'Data do lançamento'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="ui-input tabular-nums"
              />
            </div>

            <div className="pt-4 sm:pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-[var(--text-2)]">
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="w-4 h-4 accent-[var(--accent-text)]"
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
            <label className="ui-label">Observações (opcional)</label>
            <input
              type="text"
              placeholder="Ex: garantia de 1 ano, loja física, código de rastreio..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="ui-input"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="ui-modal-footer">
          <button type="button" onClick={onClose} className="ui-btn ui-btn-ghost">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} className="ui-btn ui-btn-primary flex-1">
            <Check className="w-4 h-4" />
            <span>
              {initialData
                ? 'Salvar alterações'
                : entryMode === 'installment'
                ? `Gerar ${totalInstallments} parcelas`
                : entryMode === 'recurrent'
                ? `Projetar ${recurrentMonths} meses`
                : 'Adicionar lançamento'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
