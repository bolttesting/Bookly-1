import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Invitation {
  id: string;
  email: string;
  role: string;
  business_id: string;
  status: string;
  expires_at: string;
  business?: { name: string };
}

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { user, loading: authLoading } = useAuth();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    async function fetchInvitation() {
      const { data, error: err } = await supabase
        .from('team_invitations')
        .select('id, email, role, business_id, status, expires_at, businesses(name)')
        .eq('token', token)
        .maybeSingle();

      if (err) {
        setError('Failed to load invitation');
        setLoading(false);
        return;
      }
      if (!data) {
        setError('Invitation not found');
        setLoading(false);
        return;
      }
      const d = data as any;
      setInvitation({
        ...d,
        business: d.businesses ? { name: d.businesses.name } : undefined,
      } as Invitation);
      setLoading(false);
    }
    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token || !user) return;
    setAccepting(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('accept_team_invitation', {
        p_token: token,
      });
      const result = data as { success?: boolean; error?: string } | null;
      if (rpcError) {
        toast.error(rpcError.message);
        return;
      }
      if (result?.success) {
        toast.success('Invitation accepted! Welcome to the team.');
        navigate('/dashboard');
      } else {
        toast.error(result?.error || 'Failed to accept');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to accept');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid or expired invitation</h2>
            <p className="text-muted-foreground mb-4">{error || 'This invitation may have been used or has expired.'}</p>
            <Button asChild><Link to="/auth">Go to Sign In</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status !== 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invitation already accepted</h2>
            <p className="text-muted-foreground mb-4">You're already part of this team.</p>
            <Button asChild><Link to="/dashboard">Go to Dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const businessName = invitation.business?.name || 'the team';
  const isExpired = new Date(invitation.expires_at) < new Date();
  const emailMatch = user && invitation.email.toLowerCase() === (user.email || '').toLowerCase();

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invitation expired</h2>
            <p className="text-muted-foreground mb-4">This invitation has expired. Please ask for a new one.</p>
            <Button asChild><Link to="/auth">Go to Sign In</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Team Invitation</CardTitle>
          <CardDescription>
            You've been invited to join <strong>{businessName}</strong> as <strong>{invitation.role}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user ? (
            <>
              <p className="text-sm text-muted-foreground">
                Sign up or log in with <strong>{invitation.email}</strong> to accept this invitation.
              </p>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link to={`/auth?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}`}>
                    Sign up
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link to={`/auth?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}`}>
                    Log in
                  </Link>
                </Button>
              </div>
            </>
          ) : !emailMatch ? (
            <>
              <p className="text-sm text-destructive">
                You're signed in as {user.email}. Please sign in with <strong>{invitation.email}</strong> to accept this invitation.
              </p>
              <Button asChild variant="outline">
                <Link to="/auth">Switch account</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                You're signed in as {user.email}. Click below to join the team.
              </p>
              <Button onClick={handleAccept} disabled={accepting} className="w-full">
                {accepting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Accept Invitation
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
