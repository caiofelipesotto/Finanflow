import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Calendar,
  Layers,
  ChevronRight,
  RefreshCw,
  FileText,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { Transaction, Category, Account } from '../types/finance';
import {
  formatCurrency,
  getTodayString,
  addMonthsToDate,
  formatDateShort,
} from '../utils/formatters';
import { scanInvoiceLocally } from '../services/localOcrService';

interface ScanInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTransactions: (transactions: Omit<Transaction, 'id'>[]) => void;
  categories: Category[];
  accounts: Account[];
}

interface DetectedItem {
  id: string;
  description: string;
  totalAmount: number;
  installmentsCount: number;
  installmentAmount: number;
  currentInstallment: number;
  date: string;
  type: 'expense' | 'income';
  suggestedCategoryId?: string;
  paymentMethod: 'credit' | 'debit' | 'pix' | 'transfer';
  selectedAccountId: string;
  selectedCategoryId: string;
}

export function ScanInvoiceModal({
  isOpen,
  onClose,
  onSaveTransactions,
  categories,
  accounts,
}: ScanInvoiceModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [detectedSummary, setDetectedSummary] = useState<string | null>(null);
  const [detectedInstitution, setDetectedInstitution] = useState<string | null>(null);
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [scanStep, setScanStep] = useState<'upload' | 'review' | 'success'>('upload');
  const [ocrLabel, setOcrLabel] = useState<string>('Lendo a imagem');
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [scanLowConfidence, setScanLowConfidence] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset modal state when opened/closed
  useEffect(() => {
    if (!isOpen) {
      setImagePreview(null);
      setIsScanning(false);
      setScanError(null);
      setDetectedSummary(null);
      setDetectedInstitution(null);
      setItems([]);
      setScanStep('upload');
      setOcrLabel('Lendo a imagem');
      setOcrProgress(0);
      setScanLowConfidence(false);
    }
  }, [isOpen]);

  // Handle Ctrl+V paste from clipboard
  useEffect(() => {
    if (!isOpen || scanStep !== 'upload') return;

    const handlePaste = (e: ClipboardEvent) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      for (let i = 0; i < clipboardItems.length; i++) {
        if (clipboardItems[i].type.indexOf('image') !== -1) {
          const blob = clipboardItems[i].getAsFile();
          if (blob) {
            processFile(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, scanStep]);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setScanError('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    setScanError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      analyzeImage(file);
    };
    reader.onerror = () => {
      setScanError('Não foi possível ler o arquivo selecionado.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const findBestAccountMatch = (institutionText?: string | null): string => {
    if (!institutionText) {
      // Default to credit card or first account
      const creditAcc = accounts.find((a) => a.type === 'credit');
      return creditAcc ? creditAcc.id : accounts[0]?.id || 'acc_corrente';
    }

    const lower = institutionText.toLowerCase();
    const matched = accounts.find((acc) => {
      const accLower = acc.name.toLowerCase();
      if (lower.includes('riachuelo') && accLower.includes('riachuelo')) return true;
      if (lower.includes('picpay') && accLower.includes('picpay')) return true;
      if (lower.includes('santander') && accLower.includes('santander')) return true;
      if (lower.includes('nubank') && accLower.includes('nubank')) return true;
      if (lower.includes('itau') && accLower.includes('itau')) return true;
      if (lower.includes('inter') && accLower.includes('inter')) return true;
      return false;
    });

    if (matched) return matched.id;
    const creditAcc = accounts.find((a) => a.type === 'credit');
    return creditAcc ? creditAcc.id : accounts[0]?.id || 'acc_corrente';
  };

  const findBestCategoryMatch = (suggestedCatId?: string, description?: string): string => {
    if (suggestedCatId && categories.some((c) => c.id === suggestedCatId)) {
      return suggestedCatId;
    }

    const desc = (description || '').toLowerCase();
    if (desc.includes('riachuelo') || desc.includes('renner') || desc.includes('zara') || desc.includes('roupa') || desc.includes('calcado')) {
      return 'cat_compras_cartao';
    }
    if (desc.includes('supermercado') || desc.includes('mercado') || desc.includes('assai') || desc.includes('carrefour') || desc.includes('ifood')) {
      return 'cat_alimentacao';
    }
    if (desc.includes('farmacia') || desc.includes('droga') || desc.includes('saude')) {
      return 'cat_saude';
    }
    if (desc.includes('posto') || desc.includes('gasolina') || desc.includes('combustivel') || desc.includes('uber')) {
      return 'cat_combustivel';
    }
    return 'cat_compras_cartao';
  };

  const analyzeImage = async (file: Blob) => {
    setIsScanning(true);
    setScanError(null);
    setDetectedSummary(null);
    setScanLowConfidence(false);
    setOcrProgress(0);
    setOcrLabel('Preparando a leitura');

    try {
      const result = await scanInvoiceLocally(file, (p) => {
        setOcrLabel(p.label);
        setOcrProgress(p.progress);
      });

      setDetectedSummary(result.summary || 'Dados extraídos com sucesso.');
      setDetectedInstitution(result.detectedInstitution);
      setScanLowConfidence(result.lowConfidence);

      const parsedItems: DetectedItem[] = (result.items || []).map((item: any, idx: number) => {
        const total = Number(item.totalAmount) || 0;
        const count = Math.max(1, Number(item.installmentsCount) || 1);
        const instAmount = Number(item.installmentAmount) || (count > 0 ? total / count : total);
        const currInst = Number(item.currentInstallment) || 1;
        const dateStr = item.date && item.date.length === 10 ? item.date : getTodayString();

        const accountId = findBestAccountMatch(result.detectedInstitution || item.description);
        const categoryId = findBestCategoryMatch(item.suggestedCategoryId, item.description);

        return {
          id: `detected_${Date.now()}_${idx}`,
          description: item.description || 'Compra Detectada',
          totalAmount: total,
          installmentsCount: count,
          installmentAmount: instAmount,
          currentInstallment: currInst,
          date: dateStr,
          type: item.type === 'income' ? 'income' : 'expense',
          suggestedCategoryId: item.suggestedCategoryId,
          paymentMethod: (item.paymentMethod as any) || (count > 1 ? 'credit' : 'debit'),
          selectedAccountId: accountId,
          selectedCategoryId: categoryId,
        };
      });

      if (parsedItems.length === 0) {
        // OCR local não encontrou valores utilizáveis — volta para a tela de envio
        setScanError(result.summary);
        return;
      }

      setItems(parsedItems);
      setScanStep('review');
    } catch (err: any) {
      console.error('Erro na leitura local da fatura:', err);
      setScanError(
        err?.message || 'Não foi possível ler a imagem. Tente outra foto ou insira os dados manualmente.'
      );
    } finally {
      setIsScanning(false);
      setOcrProgress(0);
      setOcrLabel('Lendo a imagem');
    }
  };

  // Quick test demo buttons
  const handleLoadDemo = (type: 'riachuelo' | 'picpay' | 'santander') => {
    setIsScanning(true);
    setScanError(null);

    setTimeout(() => {
      let demoSummary = '';
      let demoInst = '';
      let demoItems: DetectedItem[] = [];

      if (type === 'riachuelo') {
        demoInst = 'Riachuelo';
        demoSummary =
          'Detectada compra no Cartão Riachuelo no valor total de R$ 449,50 parcelada em 5x de R$ 89,90.';
        demoItems = [
          {
            id: `demo_${Date.now()}_1`,
            description: 'Riachuelo - Compras Vestuário',
            totalAmount: 449.5,
            installmentsCount: 5,
            installmentAmount: 89.9,
            currentInstallment: 1,
            date: getTodayString(),
            type: 'expense',
            paymentMethod: 'credit',
            selectedAccountId: findBestAccountMatch('Riachuelo'),
            selectedCategoryId: 'cat_compras_cartao',
          },
        ];
      } else if (type === 'santander') {
        demoInst = 'Santander';
        demoSummary =
          'Detectada fatura Santander com compra parcelada em 10x de R$ 125,00 (Total R$ 1.250,00).';
        demoItems = [
          {
            id: `demo_${Date.now()}_2`,
            description: 'Notebook / Eletrônicos (Santander)',
            totalAmount: 1250.0,
            installmentsCount: 10,
            installmentAmount: 125.0,
            currentInstallment: 1,
            date: getTodayString(),
            type: 'expense',
            paymentMethod: 'credit',
            selectedAccountId: findBestAccountMatch('Santander'),
            selectedCategoryId: 'cat_compras_cartao',
          },
        ];
      } else {
        demoInst = 'PicPay';
        demoSummary =
          'Detectada fatura PicPay com 2 lançamentos: Supermercado e Compra parcelada em 3x de R$ 75,00.';
        demoItems = [
          {
            id: `demo_${Date.now()}_3`,
            description: 'Supermercado Atacadão (PicPay)',
            totalAmount: 312.4,
            installmentsCount: 1,
            installmentAmount: 312.4,
            currentInstallment: 1,
            date: getTodayString(),
            type: 'expense',
            paymentMethod: 'credit',
            selectedAccountId: findBestAccountMatch('PicPay'),
            selectedCategoryId: 'cat_alimentacao',
          },
          {
            id: `demo_${Date.now()}_4`,
            description: 'Tênis Esportivo (PicPay 3x)',
            totalAmount: 225.0,
            installmentsCount: 3,
            installmentAmount: 75.0,
            currentInstallment: 1,
            date: getTodayString(),
            type: 'expense',
            paymentMethod: 'credit',
            selectedAccountId: findBestAccountMatch('PicPay'),
            selectedCategoryId: 'cat_compras_cartao',
          },
        ];
      }

      setDetectedInstitution(demoInst);
      setDetectedSummary(demoSummary);
      setItems(demoItems);
      setIsScanning(false);
      setScanStep('review');
    }, 900);
  };

  const handleUpdateItem = (id: string, updates: Partial<DetectedItem>) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, ...updates };

        // Recalculate installment amount if total or count changed
        if (updates.totalAmount !== undefined || updates.installmentsCount !== undefined) {
          const count = updated.installmentsCount > 0 ? updated.installmentsCount : 1;
          updated.installmentAmount = updated.totalAmount / count;
        } else if (updates.installmentAmount !== undefined) {
          const count = updated.installmentsCount > 0 ? updated.installmentsCount : 1;
          updated.totalAmount = updated.installmentAmount * count;
        }

        return updated;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleConfirmAndSave = () => {
    if (items.length === 0) return;

    const generatedTransactions: Omit<Transaction, 'id'>[] = [];

    items.forEach((item) => {
      const isInstallment = item.installmentsCount > 1;
      const totalAmount = item.totalAmount;
      const count = item.installmentsCount;
      const instAmount = item.installmentAmount;
      const groupId = isInstallment
        ? `inst_grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        : undefined;

      if (isInstallment) {
        // Generate monthly installments starting from item.date
        for (let i = 0; i < count; i++) {
          const installmentDate = addMonthsToDate(item.date, i);
          const currentNumber = i + 1;

          generatedTransactions.push({
            description: `${item.description} (${currentNumber}/${count})`,
            amount: Number(instAmount.toFixed(2)),
            type: item.type,
            category: item.selectedCategoryId,
            account: item.selectedAccountId,
            date: installmentDate,
            paymentMethod: item.paymentMethod,
            isPaid: i === 0 ? false : false, // Unpaid by default for user review
            recurrence: 'installment',
            installment: {
              current: currentNumber,
              total: count,
              installmentGroupId: groupId,
              totalPurchaseAmount: totalAmount,
            },
            notes: `Importado via Leitor de Fatura OCR local (${count}x de ${formatCurrency(instAmount)})`,
          });
        }
      } else {
        // Single transaction
        generatedTransactions.push({
          description: item.description,
          amount: Number(totalAmount.toFixed(2)),
          type: item.type,
          category: item.selectedCategoryId,
          account: item.selectedAccountId,
          date: item.date,
          paymentMethod: item.paymentMethod,
          isPaid: false,
          recurrence: 'single',            notes: 'Importado via Leitor de Fatura (OCR local)',
        });
      }
    });

    onSaveTransactions(generatedTransactions);
    setScanStep('success');

    setTimeout(() => {
      onClose();
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      {/* my-auto em vez de my-8: com conteúdo mais alto que a tela, margens
          automáticas alinham ao topo (cima acessível ao rolar); quando cabe,
          centraliza igual antes. items-center puro cortava o topo no celular. */}
      <div className="bg-[#17171a] border border-zinc-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-[#101012]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Escanear Fatura & Comprovantes
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  <Cpu className="w-3 h-3 text-zinc-400" />
                  OCR Local
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Envie foto ou print de apps (Riachuelo, PicPay, Santander, Nubank) e calcule
                parcelas automaticamente. A leitura acontece no seu aparelho — a imagem não sai
                do celular.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content based on step */}
        <div className="p-6">
          {scanStep === 'upload' && (
            <div className="space-y-6">
              {/* Drag & drop upload area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-700 hover:border-orange-500/70 bg-[#09090b]/70 hover:bg-zinc-950/10 transition-all duration-200 rounded-2xl p-8 text-center cursor-pointer flex flex-col items-center justify-center group relative overflow-hidden"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 group-hover:bg-orange-600/20 text-zinc-400 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-200 border border-zinc-700/60 group-hover:border-orange-500/40">
                  <Upload className="w-8 h-8" />
                </div>

                <h3 className="text-sm font-semibold text-white mb-1">
                  Clique para tirar foto ou selecionar imagem do print
                </h3>
                <p className="text-xs text-zinc-400 max-w-md">
                  Suporta screenshots do app da Riachuelo, PicPay, Santander, faturas de cartão ou comprovantes de compras.
                </p>

                <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-500 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-700/50">
                  <span>Dica: Você também pode colar com</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-700 text-zinc-300 rounded font-mono text-[10px]">
                    Ctrl + V
                  </kbd>
                </div>
              </div>

              {/* Scanning loading state */}
              {isScanning && (
                <div className="bg-zinc-950/40 border border-orange-500/30 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-orange-500/20 border-t-orange-400 animate-spin" />
                    <Cpu className="w-5 h-5 text-zinc-400 absolute inset-0 m-auto" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{ocrLabel}...</h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      Detectando loja, número de parcelas, valores mensais e vencimentos — tudo
                      localmente, sem enviar a imagem para lugar nenhum.
                    </p>
                  </div>
                  <div className="w-full max-w-sm">
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-zinc-500 transition-all duration-300"
                        style={{ width: `${Math.max(6, Math.round(ocrProgress * 100))}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-500">
                      {ocrProgress > 0
                        ? `${Math.round(ocrProgress * 100)}%`
                        : 'Na 1ª vez baixa ~4 MB e fica salvo no navegador'}
                    </div>
                  </div>
                </div>
              )}

              {/* Error feedback */}
              {scanError && (
                <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 flex items-start gap-3 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-semibold">Falha ao escanear imagem</strong>
                    <span>{scanError}</span>
                  </div>
                </div>
              )}

              {/* Demo test buttons */}
              <div className="pt-2 border-t border-neutral-800/80">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Quer testar sem imagem? Clique em um exemplo pré-configurado:
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleLoadDemo('riachuelo')}
                    className="flex flex-col items-start p-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 hover:border-pink-500/50 text-left transition-all"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-semibold text-pink-400">Print Riachuelo</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-mono">
                        5x parcelas
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-300 font-medium">R$ 449,50 (5x R$ 89,90)</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">Calcula os próximos 5 meses</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadDemo('santander')}
                    className="flex flex-col items-start p-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 hover:border-red-500/50 text-left transition-all"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-semibold text-red-400">Print Santander</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono">
                        10x parcelas
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-300 font-medium">R$ 1.250,00 (10x R$ 125)</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">Calcula os próximos 10 meses</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadDemo('picpay')}
                    className="flex flex-col items-start p-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 hover:border-orange-500/50 text-left transition-all"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-semibold text-zinc-400">Print PicPay</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono">
                        Multi-itens
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-300 font-medium">Mercado + Compra 3x</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">Lê faturas completas</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {scanStep === 'review' && (
            <div className="space-y-6">
              {/* Summary box */}
              {detectedSummary && (
                <div className="bg-zinc-950/30 border border-orange-500/30 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Leitura Concluída com Sucesso
                      </h4>
                      {detectedInstitution && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                          {detectedInstitution}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      {detectedSummary}
                    </p>
                  </div>
                </div>
              )}

              {scanLowConfidence && (
                <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 flex items-start gap-3 text-amber-200 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <strong className="block font-semibold text-amber-300">
                      Leitura com baixa confiança
                    </strong>
                    <span>
                      Confira com atenção os valores, parcelas e datas antes de confirmar.
                    </span>
                  </div>
                </div>
              )}

              {/* Items detected review cards */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Lançamentos Identificados ({items.length})
                  </h3>
                  <span className="text-xs text-zinc-500">
                    Revise os dados antes de adicionar
                  </span>
                </div>

                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-[#09090b] border border-neutral-800 rounded-xl p-4 space-y-4 relative"
                  >
                    {/* Header of the item card */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-zinc-800 text-xs font-mono font-bold flex items-center justify-center text-zinc-400">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { description: e.target.value })
                          }
                          placeholder="Descrição da despesa"
                          className="bg-zinc-800/60 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-sm font-medium text-white focus:outline-none focus:border-orange-500 flex-1"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                        title="Remover este item"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Numeric inputs: total, installments count, installment value */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Total Amount */}
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                          Valor Total da Compra
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-zinc-500 font-bold">
                            R$
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.totalAmount || ''}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                totalAmount: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full bg-zinc-800/60 border border-zinc-700/80 rounded-lg pl-9 pr-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>

                      {/* Installments count */}
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                          Quantidade de Parcelas
                        </label>
                        <div className="relative">
                          <select
                            value={item.installmentsCount}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                installmentsCount: parseInt(e.target.value, 10) || 1,
                              })
                            }
                            className="w-full bg-zinc-800/60 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-orange-500"
                          >
                            <option value={1}>1x (À vista)</option>
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36, 48].map((n) => (
                              <option key={n} value={n}>
                                {n}x parcelas
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Per-installment amount */}
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                          Valor da Parcela Mensal
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-zinc-500 font-bold">
                            R$
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.installmentAmount ? item.installmentAmount.toFixed(2) : ''}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                installmentAmount: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full bg-zinc-800/60 border border-zinc-700/80 rounded-lg pl-9 pr-3 py-1.5 text-sm font-semibold text-zinc-400 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Secondary row: Date, Account, Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zinc-500" />
                          Data 1ª Parcela / Compra
                        </label>
                        <input
                          type="date"
                          value={item.date}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { date: e.target.value })
                          }
                          className="w-full bg-zinc-800/60 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1 flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-zinc-500" />
                          Cartão / Conta
                        </label>
                        <select
                          value={item.selectedAccountId}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { selectedAccountId: e.target.value })
                          }
                          className="w-full bg-zinc-800/60 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-zinc-500" />
                          Categoria
                        </label>
                        <select
                          value={item.selectedCategoryId}
                          onChange={(e) =>
                            handleUpdateItem(item.id, { selectedCategoryId: e.target.value })
                          }
                          className="w-full bg-zinc-800/60 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                        >
                          {categories
                            .filter(
                              (c) =>
                                c.type ===
                                  (item.type === 'income' ? 'income' : 'expense') ||
                                c.type === 'both',
                            )
                            .map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    {/* Visual Months Breakdown Preview for installments */}
                    {item.installmentsCount > 1 && (
                      <div className="bg-[#1d1d20] rounded-lg p-3 border border-zinc-800/60">
                        <div className="text-[11px] font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Projeção dos Meses ({item.installmentsCount} parcelas de {formatCurrency(item.installmentAmount)}):
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.from({ length: Math.min(12, item.installmentsCount) }).map(
                            (_, mIdx) => {
                              const pDate = addMonthsToDate(item.date, mIdx);
                              const pMonthStr = formatDateShort(pDate);
                              return (
                                <span
                                  key={mIdx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-zinc-800/90 text-zinc-300 border border-zinc-700/60 font-mono"
                                >
                                  <span className="text-zinc-400 font-bold">{mIdx + 1}ª</span>
                                  <span>{pMonthStr}:</span>
                                  <span className="text-zinc-400">
                                    {formatCurrency(item.installmentAmount)}
                                  </span>
                                </span>
                              );
                            }
                          )}
                          {item.installmentsCount > 12 && (
                            <span className="text-[10px] text-zinc-500 self-center">
                              + {item.installmentsCount - 12} meses subsequentes
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {scanStep === 'success' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/40 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-white">Lançamentos Adicionados!</h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                Todas as parcelas e meses foram calculados e adicionados com sucesso ao seu painel.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-neutral-800 bg-[#101012] flex items-center justify-between">
          {scanStep === 'upload' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                Imagem lida no seu aparelho — nada é enviado
              </div>
            </>
          ) : scanStep === 'review' ? (
            <>
              <button
                type="button"
                onClick={() => setScanStep('upload')}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Escanear Outro
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndSave}
                  disabled={items.length === 0}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-orange-600 hover:from-orange-500 hover:to-orange-500 rounded-xl shadow-lg shadow-orange-900/30 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar e Criar {items.reduce((acc, it) => acc + it.installmentsCount, 0)} Lançamentos
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
