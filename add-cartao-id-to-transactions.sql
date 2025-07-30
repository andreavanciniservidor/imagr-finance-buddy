-- Script para adicionar o campo cartao_id na tabela transactions
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna cartao_id na tabela transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS cartao_id UUID REFERENCES public.cartoes(id);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_transactions_cartao_id ON public.transactions(cartao_id);

-- Comentário para documentação
COMMENT ON COLUMN public.transactions.cartao_id IS 'Referência ao cartão de crédito usado na transação (apenas para payment_method = credit_card)';