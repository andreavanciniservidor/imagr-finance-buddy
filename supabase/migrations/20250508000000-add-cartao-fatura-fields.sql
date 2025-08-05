-- Migration to add new fields for improved credit card billing period calculations
-- This migration adds dia_vencimento and melhor_dia_compra fields to the cartoes table

-- Add new fields to cartoes table
ALTER TABLE public.cartoes 
ADD COLUMN IF NOT EXISTS dia_vencimento INTEGER DEFAULT NULL CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
ADD COLUMN IF NOT EXISTS melhor_dia_compra INTEGER DEFAULT NULL CHECK (melhor_dia_compra >= 1 AND melhor_dia_compra <= 31);

-- Add comments for documentation
COMMENT ON COLUMN public.cartoes.dia_vencimento IS 'Dia do mês em que a fatura vence (opcional, padrão calculado como fechamento + 10 dias)';
COMMENT ON COLUMN public.cartoes.melhor_dia_compra IS 'Dia recomendado para compras para maximizar prazo de pagamento (opcional)';

-- Update existing cartoes with calculated default values for dia_vencimento
-- This ensures backward compatibility while providing sensible defaults
UPDATE public.cartoes 
SET dia_vencimento = CASE 
  WHEN dia_fechamento + 10 <= 31 THEN dia_fechamento + 10
  ELSE (dia_fechamento + 10) - 31
END
WHERE dia_vencimento IS NULL;

-- Create indexes for the new fields to improve query performance
CREATE INDEX IF NOT EXISTS idx_cartoes_dia_vencimento ON public.cartoes(dia_vencimento);
CREATE INDEX IF NOT EXISTS idx_cartoes_melhor_dia_compra ON public.cartoes(melhor_dia_compra);

-- Add constraint to ensure vencimento is after fechamento (when both are set)
-- This constraint allows for month wrapping (e.g., fechamento 25, vencimento 5 of next month)
ALTER TABLE public.cartoes 
ADD CONSTRAINT check_vencimento_after_fechamento 
CHECK (
  dia_vencimento IS NULL OR 
  dia_fechamento IS NULL OR
  (dia_vencimento != dia_fechamento)
);