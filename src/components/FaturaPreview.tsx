import React, { useMemo } from 'react';
import { Calendar, Clock, CreditCard, AlertCircle, Info, TrendingUp } from 'lucide-react';
import { FaturaCalculator } from '@/lib/faturaCalculator';
import { CartaoExtended, TransactionPreview } from '@/types/cartao';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface FaturaPreviewProps {
  cartao: CartaoExtended | null;
  purchaseDate: string; // Date string in YYYY-MM-DD format
  amount: string;
  className?: string;
  isLoading?: boolean;
}

const FaturaPreview: React.FC<FaturaPreviewProps> = React.memo(({ 
  cartao, 
  purchaseDate, 
  amount,
  className = '',
  isLoading = false
}) => {
  // Memoize the parsed purchase date to avoid recalculation
  const purchaseDateObj = useMemo(() => {
    if (!purchaseDate) return null;
    const [year, month, day] = purchaseDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  }, [purchaseDate]);

  // Memoize the transaction preview calculation (expensive operation)
  const preview = useMemo(() => {
    if (!cartao || !purchaseDateObj) return null;
    try {
      return FaturaCalculator.getTransactionPreview(purchaseDateObj, cartao);
    } catch (error) {
      console.warn('Error calculating transaction preview:', error);
      return null;
    }
  }, [cartao, purchaseDateObj]);

  // Memoize formatting functions to avoid recreation on each render
  const formatCurrency = useMemo(() => {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    return (value: string) => {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return 'R$ 0,00';
      return formatter.format(numValue);
    };
  }, []);

  const formatDate = useMemo(() => {
    return (date: Date) => {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };
  }, []);

  // Memoize calculated values that depend on preview
  const calculatedValues = useMemo(() => {
    if (!preview || !purchaseDateObj) return null;

    const monthsDifference = (preview.dataLancamento.getFullYear() - purchaseDateObj.getFullYear()) * 12 + 
                             (preview.dataLancamento.getMonth() - purchaseDateObj.getMonth());
    const isSignificantDelay = monthsDifference > 1;

    const formatPeriod = () => {
      const inicio = formatDate(preview.periodoFatura.inicio);
      const fim = formatDate(preview.periodoFatura.fim);
      return `${inicio} - ${fim}`;
    };

    const getBackgroundColor = () => {
      if (preview.isLancamentoPostergado && isSignificantDelay) {
        return 'bg-orange-50 border-orange-200';
      } else if (preview.isLancamentoPostergado) {
        return 'bg-yellow-50 border-yellow-200';
      }
      return 'bg-blue-50 border-blue-200';
    };

    const getHeaderColor = () => {
      if (preview.isLancamentoPostergado && isSignificantDelay) {
        return 'text-orange-800';
      } else if (preview.isLancamentoPostergado) {
        return 'text-yellow-800';
      }
      return 'text-blue-800';
    };

    return {
      isSignificantDelay,
      formatPeriod: formatPeriod(),
      backgroundColor: getBackgroundColor(),
      headerColor: getHeaderColor()
    };
  }, [preview, purchaseDateObj, formatDate]);

  // Don't render if no cartao is selected or invalid date
  if (!cartao || !purchaseDate || !purchaseDateObj) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 ${className}`}>
        <div className="flex items-center gap-2 text-gray-600">
          <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
          <span>Calculando preview...</span>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    );
  }

  // Don't render if preview calculation failed
  if (!preview || !calculatedValues) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={`${calculatedValues.backgroundColor} rounded-lg p-4 space-y-3 ${className}`}>
        <div className={`flex items-center gap-2 ${calculatedValues.headerColor} font-medium`}>
          <CreditCard className="w-4 h-4" />
          <span>Preview do Lançamento</span>
          {preview.isLancamentoPostergado && (
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Esta compra será lançada em um período diferente do esperado</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

      <div className="space-y-2 text-sm">
        {/* Launch Date */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar className="w-4 h-4" />
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">Data de lançamento:</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Data em que a compra aparecerá na fatura do cartão</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className={`font-medium ${preview.isLancamentoPostergado ? 'text-amber-700' : 'text-blue-700'}`}>
            {formatDate(preview.dataLancamento)}
            {calculatedValues.isSignificantDelay && (
              <Tooltip>
                <TooltipTrigger>
                  <TrendingUp className="w-3 h-3 ml-1 inline text-orange-600" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Lançamento com atraso significativo (mais de 1 mês)</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Launch Month */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            <span className="w-4 h-4 flex items-center justify-center">📅</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">Mês de cobrança:</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Mês em que você receberá a fatura com esta compra</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className={`font-medium ${preview.isLancamentoPostergado ? 'text-amber-700' : 'text-blue-700'}`}>
            {preview.mesLancamento}
          </div>
        </div>

        {/* Amount */}
        {amount && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-700">
              <span className="w-4 h-4 flex items-center justify-center">💰</span>
              <span>Valor:</span>
            </div>
            <div className="font-medium text-green-600">
              {formatCurrency(amount)}
            </div>
          </div>
        )}

        {/* Days until due */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            <Clock className="w-4 h-4" />
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">Dias até vencimento:</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Quantos dias você tem para pagar a fatura após a compra</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="font-medium text-orange-600">
            {preview.diasAteVencimento} dias
          </div>
        </div>

        {/* Current billing period */}
        <div className="pt-2 border-t border-blue-200">
          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
            <span>Período da fatura atual:</span>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Período que compreende a fatura atual do cartão. Compras neste período aparecerão na próxima fatura.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="text-xs font-medium text-blue-600">
            {calculatedValues.formatPeriod}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {preview.periodoFatura.diasRestantes} dias restantes até fechamento
          </div>
        </div>

        {/* Warning for postponed launch */}
        {preview.isLancamentoPostergado && (
          <div className={`flex items-start gap-2 p-2 rounded text-xs ${
            calculatedValues.isSignificantDelay 
              ? 'bg-orange-50 border border-orange-200' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
              calculatedValues.isSignificantDelay ? 'text-orange-600' : 'text-yellow-600'
            }`} />
            <div className={calculatedValues.isSignificantDelay ? 'text-orange-800' : 'text-yellow-800'}>
              <div className="font-medium">
                {calculatedValues.isSignificantDelay ? 'Lançamento com atraso significativo' : 'Lançamento postergado'}
              </div>
              <div>
                {calculatedValues.isSignificantDelay 
                  ? 'Esta compra será lançada com mais de 1 mês de diferença da data de compra.'
                  : 'Esta compra será lançada em um mês diferente da data de compra devido ao período de fechamento do cartão.'
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
});

export default FaturaPreview;