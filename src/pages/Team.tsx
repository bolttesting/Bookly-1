import { useState } from 'react';
import { useTeam } from '@/hooks/useTeam';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Shield, ShieldCheck, User, Trash2, Crown, Mail, Clock, X } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { InviteTeamDialog } from '@/components/team/InviteTeamDialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type AppRole = Database['public']['Enums']['app_role'];

const roleConfig: Record<AppRole, { label: string; icon: typeof Shield; color: string }> = {
  owner: { label: 'Owner', icon: Crown, color: 'bg-warning text-warning-foreground' },
  admin: { label: 'Admin', icon: ShieldCheck, color: 'bg-primary text-primary-foreground' },
  staff: { label: 'Staff', icon: User, color: 'bg-secondary text-secondary-foreground' },
};

export default function Team() {
  const { 
    teamMembers, 
    invitations, 
    loading, 
    isOwner, 
    isAdmin, 
    currentUserRole, 
    updateRole, 
    removeTeamMember,
    inviteTeamMember,
    cancelInvitation,
  } = useTeam();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  };

  const canChangeRole = (memberRole: AppRole) => {
    if (!isOwner) return false;
    return memberRole !== 'owner';
  };

  const canRemoveMember = (memberRole: AppRole) => {
    if (!isOwner) return false;
    if (memberRole === 'owner') return false;
    return true;
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in w-full min-w-0 px-1 sm:px-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold truncate">Team Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your team members and their roles
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <Badge variant="outline" className="gap-2 w-fit">
            {currentUserRole && roleConfig[currentUserRole] && (
              <>
                {(() => {
                  const Icon = roleConfig[currentUserRole].icon;
                  return <Icon className="h-4 w-4 shrink-0" />;
                })()}
                <span className="truncate">Your role: {roleConfig[currentUserRole].label}</span>
              </>
            )}
          </Badge>
          {isOwner && (
            <InviteTeamDialog onInvite={(email, role) => inviteTeamMember({ email, role })} />
          )}
        </div>
      </div>

      {/* Role explanation */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-3 p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-warning/10 shrink-0">
                <Crown className="h-5 w-5 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="font-medium">Owner</p>
                <p className="text-sm text-muted-foreground">Full access including team management and billing</p>
              </div>
            </div>
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium">Admin</p>
                <p className="text-sm text-muted-foreground">Can manage services, customers, and appointments</p>
              </div>
            </div>
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-secondary shrink-0">
                <User className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-medium">Staff</p>
                <p className="text-sm text-muted-foreground">Can view and manage their own appointments</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card className="glass-card border-primary/20 overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Mail className="h-5 w-5 text-primary shrink-0" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-3">
              {invitations.map((invitation) => {
                const config = roleConfig[invitation.role];
                return (
                  <div
                    key={invitation.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg bg-muted/30 border border-dashed border-border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{invitation.email}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          Expires {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 sm:pl-2">
                      <Badge variant="outline" className="gap-1 w-fit">
                        {(() => {
                          const Icon = config.icon;
                          return <Icon className="h-3 w-3 shrink-0" />;
                        })()}
                        {config.label}
                      </Badge>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => cancelInvitation(invitation.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team members list */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Team Members</CardTitle>
          <CardDescription>
            {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} in your team
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="space-y-4">
            {teamMembers.map((member) => {
              const config = roleConfig[member.role];
              const Icon = config.icon;
              const displayName = member.profile?.first_name || member.profile?.last_name
                ? `${member.profile?.first_name || ''} ${member.profile?.last_name || ''}`.trim()
                : 'Unknown User';

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(member.profile?.first_name, member.profile?.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {displayName}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {member.profile?.email || 'No email'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 sm:pl-2 border-t border-border/50 pt-3 sm:border-0 sm:pt-0">
                    {canChangeRole(member.role) ? (
                      <Select
                        value={member.role}
                        onValueChange={(value: AppRole) =>
                          updateRole({ userId: member.user_id, newRole: value })
                        }
                      >
                        <SelectTrigger className="w-full sm:w-32 min-w-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4" />
                              Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="staff">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Staff
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={cn(config.color, 'shrink-0')}>
                        <Icon className="h-3 w-3 mr-1 shrink-0" />
                        {config.label}
                      </Badge>
                    )}

                    {canRemoveMember(member.role) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-destructive hover:text-destructive shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove {member.profile?.first_name || 'this user'} from your team.
                              They will no longer have access to your business.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeTeamMember(member.user_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}

            {teamMembers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground px-2">
                <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No team members yet</p>
                {isOwner && (
                  <p className="text-sm mt-1">Click &quot;Invite Team Member&quot; to add your first team member</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!isOwner && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Only business owners can manage team roles and remove members.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
