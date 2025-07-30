-- Script para criar a tabela de cartões no Supabase
-- Execute este script no SQL Editor do seu projeto Supabase

-- Criar tabela de cartões
CREATE TABLE IF NOT EXISTS public.cartoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  nome TEXT NOT NULL,
  limite DECIMAL(10,2) NOT NULL DEFAULT 0,
  dia_fechamento INTEGER NOT NULL CHECK (dia_fechamento >= 1 AND dia_fechamento <= 31),
  cor TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.cartoes ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para cartões
CREATE POLICY "Users can view their own cartoes" 
ON public.cartoes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cartoes" 
ON public.cartoes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cartoes" 
ON public.cartoes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cartoes" 
ON public.cartoes FOR DELETE 
USING (auth.uid() = user_id);

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_cartoes_user_id ON public.cartoes(user_id);
CREATE INDEX IF NOT EXISTS idx_cartoes_created_at ON public.cartoes(created_at);