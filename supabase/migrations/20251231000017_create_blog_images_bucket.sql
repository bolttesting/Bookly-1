-- Create storage bucket for blog post images
-- 5MB limit, images only
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'blog-images',
  'blog-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow super admins to upload blog images
-- Path format: blog/{uuid}.{ext}
CREATE POLICY "Super admins can upload blog images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'blog-images'
  AND public.is_super_admin(auth.uid())
  AND (storage.foldername(name))[1] = 'blog'
);

-- Allow super admins to update blog images
CREATE POLICY "Super admins can update blog images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'blog-images'
  AND public.is_super_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'blog-images'
  AND public.is_super_admin(auth.uid())
);

-- Allow super admins to delete blog images
CREATE POLICY "Super admins can delete blog images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'blog-images'
  AND public.is_super_admin(auth.uid())
);

-- Allow public read access
CREATE POLICY "Public can view blog images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'blog-images');
