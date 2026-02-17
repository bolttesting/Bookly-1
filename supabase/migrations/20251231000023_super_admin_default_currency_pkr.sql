-- Default super admin display currency to PKR (Pakistani Rupee) instead of USD
ALTER TABLE public.site_settings
  ALTER COLUMN default_currency SET DEFAULT 'PKR';

-- Update existing row so current deployments show PKR
UPDATE public.site_settings
  SET default_currency = 'PKR', updated_at = now()
  WHERE default_currency = 'USD';
