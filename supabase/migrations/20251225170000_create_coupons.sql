-- Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_purchase_amount DECIMAL(10,2) DEFAULT 0,
  max_discount_amount DECIMAL(10,2),
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  applicable_to TEXT NOT NULL DEFAULT 'all' CHECK (applicable_to IN ('all', 'services', 'packages')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (business_id, code)
);

-- Create coupon_applicable_services table (for coupons that apply to specific services)
CREATE TABLE IF NOT EXISTS public.coupon_applicable_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, service_id)
);

-- Create coupon_applicable_packages table (for coupons that apply to specific packages)
CREATE TABLE IF NOT EXISTS public.coupon_applicable_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  package_template_id UUID NOT NULL REFERENCES public.package_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, package_template_id)
);

-- Create coupon_usage table (track who used which coupon)
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID,
  discount_amount DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_applicable_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_applicable_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coupons
CREATE POLICY "Users can view coupons in their business"
  ON public.coupons FOR SELECT
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can insert coupons in their business"
  ON public.coupons FOR INSERT
  WITH CHECK (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can update coupons in their business"
  ON public.coupons FOR UPDATE
  USING (public.has_business_access(auth.uid(), business_id));

CREATE POLICY "Users can delete coupons in their business"
  ON public.coupons FOR DELETE
  USING (public.has_business_access(auth.uid(), business_id));

-- Public can view active coupons (for booking page)
CREATE POLICY "Public can view active coupons"
  ON public.coupons FOR SELECT
  USING (
    status = 'active' 
    AND (valid_until IS NULL OR valid_until > now())
    AND valid_from <= now()
  );

-- RLS Policies for coupon_applicable_services
CREATE POLICY "Users can manage coupon services in their business"
  ON public.coupon_applicable_services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.coupons c
      WHERE c.id = coupon_applicable_services.coupon_id
      AND public.has_business_access(auth.uid(), c.business_id)
    )
  );

-- RLS Policies for coupon_applicable_packages
CREATE POLICY "Users can manage coupon packages in their business"
  ON public.coupon_applicable_packages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.coupons c
      WHERE c.id = coupon_applicable_packages.coupon_id
      AND public.has_business_access(auth.uid(), c.business_id)
    )
  );

-- RLS Policies for coupon_usage
CREATE POLICY "Users can view coupon usage in their business"
  ON public.coupon_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coupons c
      WHERE c.id = coupon_usage.coupon_id
      AND public.has_business_access(auth.uid(), c.business_id)
    )
  );

CREATE POLICY "Users can insert coupon usage in their business"
  ON public.coupon_usage FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coupons c
      WHERE c.id = coupon_usage.coupon_id
      AND public.has_business_access(auth.uid(), c.business_id)
    )
  );

-- Customers can view their own coupon usage
CREATE POLICY "Customers can view their own coupon usage"
  ON public.coupon_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = coupon_usage.customer_id
      AND c.user_id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_coupons_updated_at 
  BEFORE UPDATE ON public.coupons 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to validate and apply coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(
  _coupon_code TEXT,
  _business_id UUID,
  _purchase_amount DECIMAL,
  _service_id UUID DEFAULT NULL,
  _package_template_id UUID DEFAULT NULL
)
RETURNS TABLE (
  valid BOOLEAN,
  discount_amount DECIMAL,
  message TEXT,
  coupon_data JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  _coupon coupons%ROWTYPE;
  _discount DECIMAL;
  _max_discount DECIMAL;
  _final_discount DECIMAL;
BEGIN
  -- Find the coupon
  SELECT * INTO _coupon
  FROM public.coupons
  WHERE code = UPPER(TRIM(_coupon_code))
    AND business_id = _business_id;
  
  -- Check if coupon exists
  IF _coupon IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Coupon code not found'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if coupon is active
  IF _coupon.status != 'active' THEN
    RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Coupon is not active'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check validity dates
  IF _coupon.valid_from > now() THEN
    RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Coupon is not yet valid'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  IF _coupon.valid_until IS NOT NULL AND _coupon.valid_until < now() THEN
    RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Coupon has expired'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check usage limit
  IF _coupon.usage_limit IS NOT NULL AND _coupon.used_count >= _coupon.usage_limit THEN
    RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Coupon usage limit reached'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check minimum purchase amount
  IF _coupon.min_purchase_amount > 0 AND _purchase_amount < _coupon.min_purchase_amount THEN
    RETURN QUERY SELECT FALSE, 0::DECIMAL, 
      format('Minimum purchase amount is %s', _coupon.min_purchase_amount)::TEXT, 
      NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check applicability
  IF _coupon.applicable_to = 'services' AND _service_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Coupon is only valid for services'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  IF _coupon.applicable_to = 'services' AND _service_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.coupon_applicable_services
      WHERE coupon_id = _coupon.id AND service_id = _service_id
    ) THEN
      RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Coupon is not valid for this service'::TEXT, NULL::JSONB;
      RETURN;
    END IF;
  END IF;
  
  IF _coupon.applicable_to = 'packages' AND _package_template_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Coupon is only valid for packages'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  IF _coupon.applicable_to = 'packages' AND _package_template_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.coupon_applicable_packages
      WHERE coupon_id = _coupon.id AND package_template_id = _package_template_id
    ) THEN
      RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Coupon is not valid for this package'::TEXT, NULL::JSONB;
      RETURN;
    END IF;
  END IF;
  
  -- Calculate discount
  IF _coupon.discount_type = 'percentage' THEN
    _discount := (_purchase_amount * _coupon.discount_value) / 100;
  ELSE
    _discount := _coupon.discount_value;
  END IF;
  
  -- Apply max discount limit if set
  IF _coupon.max_discount_amount IS NOT NULL AND _discount > _coupon.max_discount_amount THEN
    _discount := _coupon.max_discount_amount;
  END IF;
  
  -- Ensure discount doesn't exceed purchase amount
  IF _discount > _purchase_amount THEN
    _discount := _purchase_amount;
  END IF;
  
  RETURN QUERY SELECT 
    TRUE,
    _discount,
    'Coupon applied successfully'::TEXT,
    jsonb_build_object(
      'id', _coupon.id,
      'code', _coupon.code,
      'name', _coupon.name,
      'discount_type', _coupon.discount_type,
      'discount_value', _coupon.discount_value
    );
END;
$$;

-- Function to record coupon usage
CREATE OR REPLACE FUNCTION public.record_coupon_usage(
  _coupon_id UUID,
  _customer_id UUID,
  _user_id UUID,
  _order_id UUID,
  _discount_amount DECIMAL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  _usage_id UUID;
BEGIN
  INSERT INTO public.coupon_usage (
    coupon_id,
    customer_id,
    user_id,
    order_id,
    discount_amount
  )
  VALUES (
    _coupon_id,
    _customer_id,
    _user_id,
    _order_id,
    _discount_amount
  )
  RETURNING id INTO _usage_id;
  
  -- Update coupon used count
  UPDATE public.coupons
  SET used_count = used_count + 1
  WHERE id = _coupon_id;
  
  RETURN _usage_id;
END;
$$;

