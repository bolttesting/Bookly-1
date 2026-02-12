-- Add image URLs to services (array of URLs for slideshow)
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.services.image_urls IS 'Array of image URLs for service display; multiple images show as slideshow';

-- Add image URLs to package_templates
ALTER TABLE public.package_templates
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.package_templates.image_urls IS 'Array of image URLs for package display; multiple images show as slideshow';
