import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface TeamMember {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

interface TeamInvitation {
  id: string;
  email: string;
  role: AppRole;
  status: string;
  created_at: string;
  expires_at: string;
}

export function useTeam() {
  const { business } = useBusiness();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: teamMembers = [], isLoading: loading } = useQuery({
    queryKey: ['team', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      
      // Fetch user_roles for this business
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('business_id', business.id);

      if (rolesError) throw rolesError;

      // Fetch profiles for each user
      const userIds = roles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine roles with profiles
      const teamMembers: TeamMember[] = roles.map(role => ({
        ...role,
        profile: profiles?.find(p => p.id === role.user_id) || null
      }));

      return teamMembers;
    },
    enabled: !!business?.id,
  });

  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ['team-invitations', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      
      const { data, error } = await supabase
        .from('team_invitations')
        .select('id, email, role, status, created_at, expires_at')
        .eq('business_id', business.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TeamInvitation[];
    },
    enabled: !!business?.id,
  });

  const { data: currentUserRole } = useQuery({
    queryKey: ['currentUserRole', business?.id],
    queryFn: async () => {
      if (!business?.id) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('business_id', business.id)
        .eq('user_id', user.id)
        .single();

      if (error) return null;
      return data?.role as AppRole;
    },
    enabled: !!business?.id,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      if (!business?.id) throw new Error('No business found');

      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('business_id', business.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', business?.id] });
      toast.success('Role updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeTeamMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!business?.id) throw new Error('No business found');

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('business_id', business.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', business?.id] });
      toast.success('Team member removed');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const inviteTeamMemberMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      if (!business?.id) throw new Error('No business found');
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('team_invitations')
        .insert({
          business_id: business.id,
          email: email.toLowerCase(),
          role,
          invited_by: user.id,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('This email has already been invited');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations', business?.id] });
      toast.success('Invitation sent successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      if (!business?.id) throw new Error('No business found');

      const { error } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId)
        .eq('business_id', business.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invitations', business?.id] });
      toast.success('Invitation cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    teamMembers,
    invitations,
    loading: loading || invitationsLoading,
    currentUserRole,
    isOwner: currentUserRole === 'owner',
    isAdmin: currentUserRole === 'admin' || currentUserRole === 'owner',
    updateRole: updateRoleMutation.mutate,
    removeTeamMember: removeTeamMemberMutation.mutate,
    inviteTeamMember: inviteTeamMemberMutation.mutateAsync,
    cancelInvitation: cancelInvitationMutation.mutate,
  };
}
