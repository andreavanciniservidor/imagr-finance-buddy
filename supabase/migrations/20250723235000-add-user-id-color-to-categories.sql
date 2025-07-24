-- Add user_id and color columns to categories table
ALTER TABLE public.categories 
ADD COLUMN user_id UUID REFERENCES auth.users,
ADD COLUMN color TEXT DEFAULT '#3B82F6';

-- Update RLS policies for categories to be user-specific
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Categories are insertable by everyone" ON public.categories;

-- Create new RLS policies for user-specific categories
CREATE POLICY "Users can view their own categories" ON public.categories FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can create their own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- Keep default categories (with user_id = NULL) accessible to all users
-- These will serve as system-wide default categories