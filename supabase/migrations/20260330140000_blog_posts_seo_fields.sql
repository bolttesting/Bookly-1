-- Optional SEO overrides for blog posts (super admin). Falls back to title / excerpt in the app when null.
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT;

COMMENT ON COLUMN public.blog_posts.meta_title IS 'Override for <title> and og:title; defaults to title';
COMMENT ON COLUMN public.blog_posts.meta_description IS 'Override for meta description and og:description; defaults to excerpt';
