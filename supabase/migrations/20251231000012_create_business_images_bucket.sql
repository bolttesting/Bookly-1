-- Create storage bucket for business images (services, packages)
-- 5MB limit, images only
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'business-images',
  'business-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow business users to upload to their business folder
-- Path format: {business_id}/{filename}
CREATE POLICY "Business users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-images'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.business_id::text = (storage.foldername(name))[1]
  )
);

-- Allow business users to update their business images
CREATE POLICY "Business users can update images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-images'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.business_id::text = (storage.foldername(name))[1]
  )
);

-- Allow business users to delete their business images
CREATE POLICY "Business users can delete images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-images'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.business_id::text = (storage.foldername(name))[1]
  )
);

-- Allow public read access (for displaying in booking widget)
CREATE POLICY "Public can view business images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'business-images');
