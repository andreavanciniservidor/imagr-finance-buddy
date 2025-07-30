-- Script para verificar e corrigir transações com descrições vazias
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Verificar a estrutura da tabela transactions
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar transações com descrições vazias ou nulas
SELECT id, description, amount, type, date, created_at
FROM public.transactions 
WHERE description IS NULL OR description = '' OR TRIM(description) = ''
ORDER BY created_at DESC
LIMIT 10;

-- 3. Contar quantas transações têm descrições vazias
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN description IS NULL OR description = '' OR TRIM(description) = '' THEN 1 END) as empty_descriptions,
  COUNT(CASE WHEN description IS NOT NULL AND description != '' AND TRIM(description) != '' THEN 1 END) as valid_descriptions
FROM public.transactions;

-- 4. Atualizar transações com descrições vazias para ter uma descrição padrão baseada na categoria
UPDATE public.transactions 
SET description = COALESCE(
  (SELECT name FROM public.categories WHERE id = transactions.category_id),
  CASE 
    WHEN type = 'income' THEN 'Receita'
    WHEN type = 'expense' THEN 'Despesa'
    ELSE 'Transação'
  END
)
WHERE description IS NULL OR description = '' OR TRIM(description) = '';

-- 5. Verificar se as atualizações funcionaram
SELECT id, description, amount, type, date
FROM public.transactions 
ORDER BY created_at DESC
LIMIT 10;