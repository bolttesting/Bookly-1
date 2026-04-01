-- Production domain defaults (bookly.my)
ALTER TABLE public.site_settings
  ALTER COLUMN contact_email SET DEFAULT 'support@bookly.my';
