import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Loader2,
  ShieldAlert,
  Eye,
  EyeOff,
  Home,
  KeyRound,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider } from '@/components/ui/sidebar';
import SuperAdminLayout from '@/layouts/SuperAdminLayout';

export default function SuperAdmin() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn } = useAuth();
  const { isSuperAdmin, checkingAdmin } = useSuperAdmin();

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const [isRecovery, setIsRecovery] = useState(() => {
    if (typeof window === 'undefined') return false;
    const h = window.location.hash;
    if (!h) return false;
    const params = new URLSearchParams(h.slice(1));
    return params.get('type') === 'recovery';
  });
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [settingResetPassword, setSettingResetPassword] = useState(false);

  useEffect(() => {
    if (!checkingAdmin && !isSuperAdmin && user) {
      navigate('/dashboard');
    }
  }, [checkingAdmin, isSuperAdmin, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    setIsLoggingIn(true);
    const { error } = await signIn(email, password);
    setIsLoggingIn(false);
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Login successful!');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Password updated. Use your new password next time you sign in.');
    setChangePasswordOpen(false);
    setNewPassword('');
    setConfirmPassword('');
  };

  const resetRedirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/super-admin` : '';

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail?.trim()) {
      toast.error('Enter your email address');
      return;
    }
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: resetRedirectUrl,
    });
    setSendingReset(false);
    if (error) {
      const msg = error.message.toLowerCase().includes('rate limit')
        ? 'Too many emails sent. Please wait an hour and try again.'
        : error.message;
      toast.error(msg);
      return;
    }
    setResetLinkSent(true);
  };

  const handleSetPasswordFromRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetNewPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSettingResetPassword(true);
    const { error } = await supabase.auth.updateUser({ password: resetNewPassword });
    setSettingResetPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Password updated. You can now sign in with your new password.');
    setIsRecovery(false);
    setResetNewPassword('');
    setResetConfirmPassword('');
    window.history.replaceState(null, '', window.location.pathname);
  };

  // Login form
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="glass-card max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-xl bg-primary flex items-center justify-center glow">
                <ShieldAlert className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-display">Super Admin Login</CardTitle>
            <CardDescription>Enter your credentials to access the admin dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoggingIn}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoggingIn}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoggingIn}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="text-muted-foreground text-sm"
                  onClick={() => setForgotPasswordOpen(true)}
                  disabled={isLoggingIn}
                >
                  Forgot password?
                </Button>
              </div>
            </form>
            <div className="mt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={forgotPasswordOpen} onOpenChange={(open) => { if (!open) { setResetLinkSent(false); setResetEmail(''); } setForgotPasswordOpen(open); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
              <DialogDescription>
                {resetLinkSent ? "If the email doesn't arrive, add the URL below in Supabase and check spam." : "Enter your Super Admin email. We'll send you a link to set a new password."}
              </DialogDescription>
            </DialogHeader>
            {resetLinkSent ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="font-medium mb-1">Add this in Supabase:</p>
                  <p className="text-muted-foreground mb-2">Dashboard → Authentication → URL Configuration → Redirect URLs</p>
                  <code className="block break-all text-xs bg-background px-2 py-1.5 rounded border">{resetRedirectUrl}</code>
                </div>
                <DialogFooter>
                  <Button onClick={() => setForgotPasswordOpen(false)}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input id="reset-email" type="email" placeholder="admin@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} disabled={sendingReset} autoComplete="email" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setForgotPasswordOpen(false)} disabled={sendingReset}>Cancel</Button>
                  <Button type="submit" disabled={sendingReset}>{sendingReset && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Send reset link</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="glass-card max-w-md">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-display font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You don't have super admin privileges.</p>
            <div className="space-y-2">
              <Button asChild className="w-full"><Link to="/dashboard">Go to Dashboard</Link></Button>
              <Button variant="outline" onClick={() => navigate('/auth')} className="w-full">Sign Out & Login as Admin</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="glass-card max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-xl bg-primary flex items-center justify-center glow">
                <KeyRound className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-display">Set new password</CardTitle>
            <CardDescription>You opened the reset link. Choose a new password for your Super Admin account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetPasswordFromRecovery} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recovery-new-password">New password</Label>
                <Input id="recovery-new-password" type="password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} placeholder="••••••••" minLength={6} disabled={settingResetPassword} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recovery-confirm-password">Confirm password</Label>
                <Input id="recovery-confirm-password" type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} placeholder="••••••••" minLength={6} disabled={settingResetPassword} />
              </div>
              <Button type="submit" className="w-full" disabled={settingResetPassword}>
                {settingResetPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Set password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SidebarProvider>
        <SuperAdminLayout onChangePasswordClick={() => setChangePasswordOpen(true)} />
      </SidebarProvider>

      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Enter a new password. You'll use it the next time you sign in to Super Admin.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Input id="new-password" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" minLength={6} disabled={changingPassword} className="pr-10" />
                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowNewPassword(!showNewPassword)}>
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">At least 6 characters</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" minLength={6} disabled={changingPassword} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setChangePasswordOpen(false)} disabled={changingPassword}>Cancel</Button>
              <Button type="submit" disabled={changingPassword}>{changingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Update password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
