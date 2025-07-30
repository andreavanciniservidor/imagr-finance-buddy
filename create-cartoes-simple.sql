-- Script simplificado para criar a tabela de cartões
-- Execute este script no SQL Editor do Supabase

-- Primeiro, remover a tabela se existir (para recriação limpa)
DROP TABLE IF EXISTS public.cartoes;

-- Criar tabela de cartões
CREATE TABLE public.cartoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  nome TEXT NOT NULL,
  limite DECIMAL(10,2) DEFAULT 0,
  dia_fechamento INTEGER NOT NULL CHECK (dia_fechamento >= 1 AND dia_fechamento <= 31),
  cor TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.cartoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own cartoes" ON public.cartoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cartoes" ON public.cartoes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cartoes" ON public.cartoes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cartoes" ON public.cartoes FOR DELETE USING (auth.uid() = user_id);

-- Índices
CREATE INDEX idx_cartoes_user_id ON public.cartoes(user_id);