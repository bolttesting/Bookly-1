-- Create team_invitations table for pending invites
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  invited_by UUID NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(business_id, email)
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for team_invitations
CREATE POLICY "Users can view invitations for their business"
ON public.team_invitations
FOR SELECT TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Owners can create invitations"
ON public.team_invitations
FOR INSERT TO authenticated
WITH CHECK (has_business_access(auth.uid(), business_id));

CREATE POLICY "Owners can delete invitations"
ON public.team_invitations
FOR DELETE TO authenticated
USING (has_business_access(auth.uid(), business_id));

CREATE POLICY "Anyone can view invitation by token"
ON public.team_invitations
FOR SELECT
USING (true);