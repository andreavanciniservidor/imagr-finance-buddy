-- Script para corrigir a tabela categories no Supabase Cloud
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Adicionar colunas user_id e color à tabela categories
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users,
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';

-- 2. Remover políticas RLS antigas
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Categories are insertable by everyone" ON public.categories;

-- 3. Criar novas políticas RLS para categorias específicas por usuário
CREATE POLICY "Users can view their own categories and default categories" 
ON public.categories FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own categories" 
ON public.categories FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" 
ON public.categories FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" 
ON public.categories FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Atualizar categorias padrão existentes com cores
UPDATE public.categories SET color = '#10B981' WHERE name = 'Salário' AND type = 'income';
UPDATE public.categories SET color = '#3B82F6' WHERE name = 'Freelance' AND type = 'income';
UPDATE public.categories SET color = '#8B5CF6' WHERE name = 'Investimentos' AND type = 'income';
UPDATE public.categories SET color = '#6B7280' WHERE name = 'Outros' AND type = 'income';
UPDATE public.categories SET color = '#EF4444' WHERE name = 'Alimentação' AND type = 'expense';
UPDATE public.categories SET color = '#F59E0B' WHERE name = 'Transporte' AND type = 'expense';
UPDATE public.categories SET color = '#3B82F6' WHERE name = 'Moradia' AND type = 'expense';
UPDATE public.categories SET color = '#EC4899' WHERE name = 'Lazer' AND type = 'expense';
UPDATE public.categories SET color = '#10B981' WHERE name = 'Educação' AND type = 'expense';
UPDATE public.categories SET color = '#06B6D4' WHERE name = 'Saúde' AND type = 'expense';
UPDATE public.categories SET color = '#8B5CF6' WHERE name = 'Vestuário' AND type = 'expense';
UPDATE public.categories SET color = '#6B7280' WHERE name = 'Outros' AND type = 'expense';