import React, { useMemo } from 'react';
import { Calendar, Clock, CreditCard, Info, AlertTriangle } from 'lucide-react';
import { CartaoExtended } from '../types/cartao';
import { FaturaCalculator } from '../lib/faturaCalculator';
import { formatDateBR } from '../lib/dateUtils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface PeriodoInfoProps {
  cartao: CartaoExtended;
  showDetails?: boolean;
  className?: string;
}

const PeriodoInfo: React.FC<PeriodoInfoProps> = React.memo(({ 
  cartao, 
  showDetails = true, 
  className = '' 
}) => {
  // Memoize expensive calculation to avoid recalculation on each render
  const calculation = useMemo(() => {
    return FaturaCalculator.getComprehensiveCalculation(cartao);
  }, [cartao.id, cartao.dia_fechamento, cartao.dia_vencimento, cartao.melhor_dia_compra]);
  
  const { periodoAtual, proximoFechamento, proximoVencimento, diasParaFechamento } = calculation;

  // Memoize urgency calculation to avoid recalculation
  const urgency = useMemo(() => {
    if (diasParaFechamento === 0) return 'urgent';
    if (diasParaFechamento <= 3) return 'warning';
    return 'normal';
  }, [diasParaFechamento]);

  return (
    <TooltipProvider>
      <div className={`space-y-3 ${className}`}>
        {/* Current Period */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar size={16} className="text-white opacity-80" />
          <div className="text-white opacity-90">
            <div className="flex items-center gap-1">
              <span className="font-medium">Período atual:</span>
              <Tooltip>
                <TooltipTrigger>
                  <Info size={12} className="text-white opacity-60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Período da fatura atual. Compras neste período aparecerão na próxima fatura.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-xs">
              {formatDateBR(periodoAtual.inicio)} - {formatDateBR(periodoAtual.fim)}
            </div>
          </div>
        </div>

        {/* Days until closing */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center">
            <Clock size={16} className="text-white opacity-80" />
            {urgency === 'urgent' && (
              <AlertTriangle size={12} className="text-red-300 ml-1" />
            )}
            {urgency === 'warning' && (
              <AlertTriangle size={12} className="text-yellow-300 ml-1" />
            )}
          </div>
          <div className="text-white opacity-90">
            <div className="flex items-center gap-1">
              <span className={`font-medium ${urgency === 'urgent' ? 'text-red-200' : urgency === 'warning' ? 'text-yellow-200' : ''}`}>
                {diasParaFechamento === 0 
                  ? 'Fecha hoje!' 
                  : diasParaFechamento === 1 
                    ? 'Fecha amanhã' 
                    : `${diasParaFechamento} dias para fechar`
                }
              </span>
              <Tooltip>
                <TooltipTrigger>
                  <Info size={12} className="text-white opacity-60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Compras após o fechamento serão lançadas para o mês seguinte.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

      {showDetails && (
        <>
          {/* Next closing date */}
          <div className="flex items-center gap-2 text-sm">
            <CreditCard size={16} className="text-white opacity-80" />
            <div className="text-white opacity-90">
              <div className="flex items-center gap-1">
                <span className="font-medium">Próximo fechamento:</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info size={12} className="text-white opacity-60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Data do próximo fechamento da fatura. Compras após esta data vão para a fatura seguinte.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-xs">
                {formatDateBR(proximoFechamento)}
              </div>
            </div>
          </div>

          {/* Next due date */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={16} className="text-white opacity-80" />
            <div className="text-white opacity-90">
              <div className="flex items-center gap-1">
                <span className="font-medium">Próximo vencimento:</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info size={12} className="text-white opacity-60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Data de vencimento da próxima fatura. Prazo limite para pagamento.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-xs">
                {formatDateBR(proximoVencimento)}
              </div>
            </div>
          </div>

          {/* Best purchase day */}
          {cartao.melhor_dia_compra && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                <span className="text-xs font-bold text-white">!</span>
              </div>
              <div className="text-white opacity-90">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Melhor dia para compras:</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info size={12} className="text-white opacity-60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Dia recomendado para fazer compras e maximizar o prazo de pagamento.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-xs">
                  Dia {cartao.melhor_dia_compra}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </TooltipProvider>
  );
});

export default PeriodoInfo;