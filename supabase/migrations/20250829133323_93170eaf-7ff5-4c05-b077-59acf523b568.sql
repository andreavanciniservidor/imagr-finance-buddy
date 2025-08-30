-- Fix critical security vulnerability: Update accounts table RLS policies
-- Remove overly permissive policies that allow all users to see all accounts
DROP POLICY IF EXISTS "Accounts are viewable by everyone" ON public.accounts;
DROP POLICY IF EXISTS "Accounts are insertable by everyone" ON public.accounts;

-- Create secure RLS policies for accounts table
-- Users can only view their own accounts
CREATE POLICY "Users can view their own accounts" 
ON public.accounts 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can only create accounts for themselves
CREATE POLICY "Users can create their own accounts" 
ON public.accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own accounts
CREATE POLICY "Users can update their own accounts" 
ON public.accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can only delete their own accounts
CREATE POLICY "Users can delete their own accounts" 
ON public.accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Ensure accounts table has user_id column for proper RLS
-- (Check if column exists and add if needed)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.accounts ADD COLUMN user_id UUID REFERENCES auth.users(id) NOT NULL;
  END IF;
END $$;