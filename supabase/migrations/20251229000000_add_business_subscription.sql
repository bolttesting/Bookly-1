-- Add subscription_plan_id to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL;

-- Set default plan (Starter - free plan) for existing businesses
UPDATE public.businesses
SET subscription_plan_id = (
  SELECT id FROM public.subscription_plans 
  WHERE name = 'Starter' AND price = 0 
  LIMIT 1
)
WHERE subscription_plan_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_businesses_subscription_plan_id 
ON public.businesses(subscription_plan_id);

