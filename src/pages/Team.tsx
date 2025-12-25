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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Team Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your team members and their roles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-2">
            {currentUserRole && roleConfig[currentUserRole] && (
              <>
                {(() => {
                  const Icon = roleConfig[currentUserRole].icon;
                  return <Icon className="h-4 w-4" />;
                })()}
                Your role: {roleConfig[currentUserRole].label}
              </>
            )}
          </Badge>
          {isOwner && (
            <InviteTeamDialog onInvite={(email, role) => inviteTeamMember({ email, role })} />
          )}
        </div>
      </div>

      {/* Role explanation */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Crown className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="font-medium">Owner</p>
                <p className="text-sm text-muted-foreground">Full access including team management and billing</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Admin</p>
                <p className="text-sm text-muted-foreground">Can manage services, customers, and appointments</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <User className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="font-medium">Staff</p>
                <p className="text-sm text-muted-foreground">Can view and manage their own appointments</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => {
                const config = roleConfig[invitation.role];
                return (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-dashed border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Expires {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        {(() => {
                          const Icon = config.icon;
                          return <Icon className="h-3 w-3" />;
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
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} in your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.map((member) => {
              const config = roleConfig[member.role];
              const Icon = config.icon;
              
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(member.profile?.first_name, member.profile?.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.profile?.first_name || member.profile?.last_name
                          ? `${member.profile?.first_name || ''} ${member.profile?.last_name || ''}`.trim()
                          : 'Unknown User'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.profile?.email || 'No email'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {canChangeRole(member.role) ? (
                      <Select
                        value={member.role}
                        onValueChange={(value: AppRole) => 
                          updateRole({ userId: member.user_id, newRole: value })
                        }
                      >
                        <SelectTrigger className="w-32">
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
                      <Badge className={config.color}>
                        <Icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    )}
                    
                    {canRemoveMember(member.role) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
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
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No team members yet</p>
                {isOwner && (
                  <p className="text-sm mt-1">Click "Invite Team Member" to add your first team member</p>
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
