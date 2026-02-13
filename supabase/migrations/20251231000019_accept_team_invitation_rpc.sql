-- RPC for invitee to accept a team invitation (adds themselves to user_roles)
CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_invitation RECORD;
  v_user_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF v_user_email IS NULL OR trim(lower(v_user_email)) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'User email not found');
  END IF;

  v_user_email := lower(trim(v_user_email));

  -- Get invitation by token
  SELECT id, business_id, email, role, status, expires_at
  INTO v_invitation
  FROM public.team_invitations
  WHERE token = p_token;

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  IF v_invitation.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation already used or cancelled');
  END IF;

  IF v_invitation.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  IF lower(trim(v_invitation.email)) != v_user_email THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email does not match invitation. Please sign in with ' || v_invitation.email);
  END IF;

  -- Check if already in user_roles
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND business_id = v_invitation.business_id
  ) THEN
    UPDATE public.team_invitations SET status = 'accepted' WHERE id = v_invitation.id;
    RETURN jsonb_build_object('success', true, 'message', 'Already a team member');
  END IF;

  -- Add to user_roles
  INSERT INTO public.user_roles (user_id, business_id, role)
  VALUES (auth.uid(), v_invitation.business_id, v_invitation.role);

  -- Update invitation status
  UPDATE public.team_invitations SET status = 'accepted' WHERE id = v_invitation.id;

  RETURN jsonb_build_object('success', true, 'message', 'Invitation accepted');
END;
$$;
