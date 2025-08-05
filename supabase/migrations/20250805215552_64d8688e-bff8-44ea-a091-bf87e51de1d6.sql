
-- Adicionar as colunas dia_vencimento e melhor_dia_compra à tabela cartoes
ALTER TABLE public.cartoes 
ADD COLUMN dia_vencimento INTEGER CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
ADD COLUMN melhor_dia_compra INTEGER CHECK (melhor_dia_compra >= 1 AND melhor_dia_compra <= 31),
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_cartoes_updated_at 
    BEFORE UPDATE ON public.cartoes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Adicionar coluna alert_threshold à tabela budgets se não existir
ALTER TABLE public.budgets 
ADD COLUMN IF NOT EXISTS alert_threshold INTEGER DEFAULT 80;

-- Adicionar coluna payment_method à tabela transactions se não existir  
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Adicionar coluna color à tabela categories se não existir
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';
