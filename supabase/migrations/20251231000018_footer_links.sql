-- Footer menu links (editable by super admin)
CREATE TABLE IF NOT EXISTS public.footer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_footer_links_display_order ON public.footer_links(display_order);

ALTER TABLE public.footer_links ENABLE ROW LEVEL SECURITY;

-- Anyone can read footer links
CREATE POLICY "Anyone can view footer links"
  ON public.footer_links FOR SELECT TO anon, authenticated USING (true);

-- Super admins can manage
CREATE POLICY "Super admins can manage footer links"
  ON public.footer_links FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Insert default links if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.footer_links LIMIT 1) THEN
    INSERT INTO public.footer_links (label, url, display_order)
    VALUES 
      ('Sign In', '/auth', 0),
      ('Privacy', '#', 1),
      ('Terms', '#', 2),
      ('Contact', '#contact', 3);
  END IF;
END $$;
