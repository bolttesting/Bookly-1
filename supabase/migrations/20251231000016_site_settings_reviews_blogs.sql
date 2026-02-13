-- Site settings: footer, contact (single row, editable by super admin)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  footer_copyright TEXT DEFAULT '© 2024 Bookly. All rights reserved.',
  contact_email TEXT DEFAULT 'support@bookly.com',
  contact_phone TEXT DEFAULT '+1 (234) 567-890',
  contact_address TEXT DEFAULT '123 Business Street, Suite 100, City, State 12345',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure single row
INSERT INTO public.site_settings (id) 
SELECT gen_random_uuid() 
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings LIMIT 1);

-- Reviews/testimonials for landing page
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_display_order ON public.reviews(display_order);

-- Blog posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(published);

-- RLS: only super admins can manage (we use service role from app for super admin)
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings, reviews, and published blogs (for landing page)
CREATE POLICY "Anyone can view site settings"
  ON public.site_settings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can view published blog posts"
  ON public.blog_posts FOR SELECT TO anon, authenticated 
  USING (published = true);

-- Super admins manage via is_super_admin() function
CREATE POLICY "Super admins can manage site settings"
  ON public.site_settings FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage reviews"
  ON public.reviews FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage blog posts"
  ON public.blog_posts FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
