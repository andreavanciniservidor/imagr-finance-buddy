-- First, check current accounts table structure and add user_id column
ALTER TABLE public.accounts ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Since we're adding a NOT NULL column to existing table, we need to handle existing data
-- For safety, let's first make it nullable, then update existing records if any exist
-- Update existing accounts to belong to the first user (if any exist)
-- This is a temporary measure - in production you'd want to assign accounts properly
UPDATE public.accounts 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

-- Now make the column NOT NULL
ALTER TABLE public.accounts ALTER COLUMN user_id SET NOT NULL;