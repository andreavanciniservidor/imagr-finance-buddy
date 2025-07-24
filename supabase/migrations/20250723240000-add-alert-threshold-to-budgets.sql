-- Add alert_threshold column to budgets table
ALTER TABLE public.budgets 
ADD COLUMN alert_threshold INTEGER DEFAULT 80 CHECK (alert_threshold >= 0 AND alert_threshold <= 100);

-- Update existing budgets to have default alert threshold of 80%
UPDATE public.budgets SET alert_threshold = 80 WHERE alert_threshold IS NULL;