import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Building2, 
  Package, 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  LogOut,
  Eye,
  EyeOff,
  Home,
  CreditCard,
  Check,
  Plus,
  Pencil,
  Trash2,
  KeyRound
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
import { format } from 'date-fns';
import { formatCurrencySimple, CURRENCIES } from '@/lib/currency';
import { SubscriptionPlanDialog } from '@/components/subscriptions/SubscriptionPlanDialog';

export default function SuperAdmin() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const { 
    isSuperAdmin, 
    checkingAdmin, 
    allBusinesses, 
    allPackages, 
    allCustomers,
    allAppointments,
    stats,
    loading 
  } = useSuperAdmin();
  
  const {
    plans: subscriptionPlans,
    isLoading: plansLoading,
    createPlan,
    updatePlan,
    deletePlan,
    updateAllPlansCurrency,
  } = useSubscriptionPlans();
  
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // For SuperAdmin, use USD as default since it shows aggregated data across all businesses
  const formatCurrency = (amount: number) => formatCurrencySimple(amount, 'USD');

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
      // Not a super admin, redirect to dashboard
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
      // The component will re-render and check if user is super admin
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
        ? 'Too many emails sent. Please wait an hour and try again, or use the "Change password" script if you have access.'
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

  // Show login form if not authenticated
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
            <CardDescription>
              Enter your credentials to access the admin dashboard
            </CardDescription>
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
                    type={showPassword ? "text" : "password"}
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
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
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

        <Dialog
          open={forgotPasswordOpen}
          onOpenChange={(open) => {
            if (!open) {
              setResetLinkSent(false);
              setResetEmail('');
            }
            setForgotPasswordOpen(open);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
              <DialogDescription>
                {resetLinkSent
                  ? 'If the email doesn’t arrive, add the URL below in Supabase and check spam.'
                  : 'Enter your Super Admin email. We’ll send you a link to set a new password.'}
              </DialogDescription>
            </DialogHeader>
            {resetLinkSent ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="font-medium mb-1">Add this in Supabase:</p>
                  <p className="text-muted-foreground mb-2">
                    Dashboard → Authentication → URL Configuration → Redirect URLs
                  </p>
                  <code className="block break-all text-xs bg-background px-2 py-1.5 rounded border">
                    {resetRedirectUrl}
                  </code>
                </div>
                <p className="text-sm text-muted-foreground">
                  Check your spam folder. The link opens this app so you can set a new password.
                </p>
                <DialogFooter>
                  <Button onClick={() => setForgotPasswordOpen(false)}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    disabled={sendingReset}
                    autoComplete="email"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  The reset link will open: <span className="font-mono text-foreground">{resetRedirectUrl || '(this page)'}</span>. Add this URL in Supabase redirect list if emails don’t arrive.
                </p>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setForgotPasswordOpen(false)} disabled={sendingReset}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={sendingReset}>
                    {sendingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {sendingReset ? ' Sending...' : 'Send reset link'}
                  </Button>
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
            <p className="text-muted-foreground mb-4">
              You don't have super admin privileges.
            </p>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button variant="outline" onClick={() => navigate('/auth')} className="w-full">
                Sign Out & Login as Admin
              </Button>
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
            <CardDescription>
              You opened the reset link. Choose a new password for your Super Admin account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetPasswordFromRecovery} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recovery-new-password">New password</Label>
                <Input
                  id="recovery-new-password"
                  type="password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  disabled={settingResetPassword}
                />
                <p className="text-xs text-muted-foreground">At least 6 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="recovery-confirm-password">Confirm password</Label>
                <Input
                  id="recovery-confirm-password"
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  disabled={settingResetPassword}
                />
              </div>
              <Button type="submit" className="w-full" disabled={settingResetPassword}>
                {settingResetPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {settingResetPassword ? ' Updating...' : 'Set password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold flex items-center gap-2 sm:gap-3">
                <ShieldAlert className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
                <span className="truncate">Super Admin Dashboard</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                View all businesses, packages, and platform analytics
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChangePasswordOpen(true)}
              className="flex items-center gap-2"
            >
              <KeyRound className="h-4 w-4" />
              Change password
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await signOut();
                navigate('/auth');
              }}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change password</DialogTitle>
              <DialogDescription>
                Enter a new password. You'll use it the next time you sign in to Super Admin.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    disabled={changingPassword}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">At least 6 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  disabled={changingPassword}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setChangePasswordOpen(false)} disabled={changingPassword}>
                  Cancel
                </Button>
                <Button type="submit" disabled={changingPassword}>
                  {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {changingPassword ? ' Updating...' : 'Update password'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalBusinesses}</p>
                  <p className="text-xs text-muted-foreground">Businesses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Package className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalPackages}</p>
                  <p className="text-xs text-muted-foreground">Packages</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <TrendingUp className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activePackages}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <DollarSign className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <Users className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                  <p className="text-xs text-muted-foreground">Customers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalAppointments}</p>
                  <p className="text-xs text-muted-foreground">Appointments</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Tabs */}
        <Tabs defaultValue="businesses" className="space-y-3 sm:space-y-4">
          <div className="glass-card p-2 w-full overflow-x-auto">
            <TabsList className="inline-flex w-full min-w-max bg-transparent gap-1 text-xs sm:text-sm">
              <TabsTrigger value="businesses" className="whitespace-nowrap px-3 sm:px-4 shrink-0">
                <span className="hidden sm:inline">Businesses</span>
                <span className="sm:hidden">Biz</span>
              </TabsTrigger>
              <TabsTrigger value="packages" className="whitespace-nowrap px-3 sm:px-4 shrink-0">Packages</TabsTrigger>
              <TabsTrigger value="customers" className="whitespace-nowrap px-3 sm:px-4 shrink-0">Customers</TabsTrigger>
              <TabsTrigger value="appointments" className="whitespace-nowrap px-3 sm:px-4 shrink-0">
                <span className="hidden sm:inline">Appointments</span>
                <span className="sm:hidden">Apts</span>
              </TabsTrigger>
              <TabsTrigger value="stripe" className="whitespace-nowrap px-3 sm:px-4 shrink-0">
                <span className="hidden sm:inline">Stripe & Subscriptions</span>
                <span className="sm:hidden">Stripe</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="businesses">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>All Businesses</CardTitle>
                <CardDescription>
                  {allBusinesses.length} registered businesses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : allBusinesses.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No businesses yet</p>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Name</TableHead>
                        <TableHead className="hidden sm:table-cell min-w-[100px]">Industry</TableHead>
                        <TableHead className="hidden md:table-cell min-w-[100px]">City</TableHead>
                        <TableHead className="hidden lg:table-cell min-w-[150px]">Email</TableHead>
                        <TableHead className="min-w-[100px]">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allBusinesses.map((business) => (
                        <TableRow key={business.id}>
                          <TableCell className="font-medium truncate max-w-[150px]">{business.name}</TableCell>
                          <TableCell className="hidden sm:table-cell truncate max-w-[100px]">{business.industry || '-'}</TableCell>
                          <TableCell className="hidden md:table-cell truncate max-w-[100px]">{business.city || '-'}</TableCell>
                          <TableCell className="hidden lg:table-cell truncate max-w-[150px]">{business.email || '-'}</TableCell>
                          <TableCell className="text-xs sm:text-sm whitespace-nowrap">{format(new Date(business.created_at), 'MMM d, yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="packages">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">All Packages</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {allPackages.length} total packages sold
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-6 sm:py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : allPackages.length === 0 ? (
                  <p className="text-center py-6 sm:py-8 text-sm sm:text-base text-muted-foreground">No packages yet</p>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Package Name</TableHead>
                        <TableHead className="min-w-[80px]">Price</TableHead>
                        <TableHead className="hidden sm:table-cell min-w-[70px]">Credits</TableHead>
                        <TableHead className="hidden sm:table-cell min-w-[70px]">Used</TableHead>
                        <TableHead className="min-w-[80px]">Status</TableHead>
                        <TableHead className="hidden md:table-cell min-w-[100px]">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allPackages.map((pkg) => (
                        <TableRow key={pkg.id}>
                          <TableCell className="font-medium truncate max-w-[150px]">{pkg.name}</TableCell>
                          <TableCell className="text-xs sm:text-sm whitespace-nowrap">{formatCurrency(Number(pkg.price))}</TableCell>
                          <TableCell className="hidden sm:table-cell">{pkg.total_credits}</TableCell>
                          <TableCell className="hidden sm:table-cell">{pkg.used_credits}</TableCell>
                          <TableCell>
                            <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {pkg.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs sm:text-sm whitespace-nowrap">{format(new Date(pkg.created_at), 'MMM d, yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">All Customers</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {allCustomers.length} total customers across all businesses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-6 sm:py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : allCustomers.length === 0 ? (
                  <p className="text-center py-6 sm:py-8 text-sm sm:text-base text-muted-foreground">No customers yet</p>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Name</TableHead>
                        <TableHead className="hidden sm:table-cell min-w-[150px]">Email</TableHead>
                        <TableHead className="hidden md:table-cell min-w-[120px]">Phone</TableHead>
                        <TableHead className="min-w-[100px]">Total Spent</TableHead>
                        <TableHead className="hidden lg:table-cell min-w-[70px]">Visits</TableHead>
                        <TableHead className="min-w-[80px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium truncate max-w-[120px]">{customer.name}</TableCell>
                          <TableCell className="hidden sm:table-cell truncate max-w-[150px]">{customer.email || '-'}</TableCell>
                          <TableCell className="hidden md:table-cell truncate max-w-[120px]">{customer.phone || '-'}</TableCell>
                          <TableCell className="text-xs sm:text-sm whitespace-nowrap">{formatCurrency(Number(customer.total_spent))}</TableCell>
                          <TableCell className="hidden lg:table-cell">{customer.total_visits}</TableCell>
                          <TableCell>
                            <Badge variant={customer.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {customer.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">All Appointments</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {allAppointments.length} total appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-6 sm:py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : allAppointments.length === 0 ? (
                  <p className="text-center py-6 sm:py-8 text-sm sm:text-base text-muted-foreground">No appointments yet</p>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">Date</TableHead>
                        <TableHead className="min-w-[120px]">Time</TableHead>
                        <TableHead className="min-w-[80px]">Status</TableHead>
                        <TableHead className="min-w-[80px]">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allAppointments.slice(0, 50).map((apt) => (
                        <TableRow key={apt.id}>
                          <TableCell className="text-xs sm:text-sm whitespace-nowrap">{format(new Date(apt.start_time), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                            {format(new Date(apt.start_time), 'h:mm a')} - {format(new Date(apt.end_time), 'h:mm a')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                              {apt.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm whitespace-nowrap">{apt.price ? formatCurrency(Number(apt.price)) : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stripe">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="truncate">Stripe Integration & Subscriptions</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Connect your Stripe account to collect subscription payments from businesses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Stripe Connection Status */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Stripe Account</h3>
                  {/* TODO: Fetch super admin settings from database */}
                  <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-4">
                      Connect your Stripe account to start collecting subscription payments. You'll be redirected to Stripe to complete the connection.
                    </p>
                    <Button
                      onClick={async () => {
                        try {
                          // Create Stripe Connect account link for super admin
                          // This requires a backend API endpoint (Supabase Edge Function or your own backend)
                          // The endpoint should create a Stripe Connect account for the platform and return an onboarding URL
                          
                          toast.info(
                            'Stripe integration requires backend setup. You need to create a Supabase Edge Function or API endpoint at /api/stripe/admin/connect that handles Stripe Connect account creation for the platform.',
                            { duration: 6000 }
                          );
                          
                          // Uncomment this when you have the backend endpoint ready:
                          /*
                          const response = await fetch('/api/stripe/admin/connect', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                          });
                          
                          if (!response.ok) {
                            const error = await response.json().catch(() => ({ message: 'Failed to create Stripe connection' }));
                            throw new Error(error.message || 'Failed to create Stripe connection');
                          }
                          
                          const { url } = await response.json();
                          if (url) {
                            window.location.href = url;
                          } else {
                            throw new Error('No redirect URL received from server');
                          }
                          */
                        } catch (error: any) {
                          toast.error(error.message || 'Failed to create Stripe connection. Please check your backend setup.');
                        }
                      }}
                      className="gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      Connect Stripe Account
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Subscription Plans */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold">Subscription Plans</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Configure subscription plans that businesses can subscribe to
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setEditingPlan(null);
                        setPlanDialogOpen(true);
                      }}
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Plan
                    </Button>
                  </div>

                  {/* Currency Selector */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-secondary/30 rounded-lg border">
                    <Label className="text-sm font-medium">Update Currency for All Plans:</Label>
                    <div className="flex gap-2 flex-1">
                      <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              {currency.code} - {currency.symbol}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => updateAllPlansCurrency.mutate(selectedCurrency)}
                        disabled={updateAllPlansCurrency.isPending}
                        size="sm"
                      >
                        {updateAllPlansCurrency.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Update All'
                        )}
                      </Button>
                    </div>
                  </div>

                  {plansLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : subscriptionPlans.length === 0 ? (
                    <Card className="glass-card text-center py-12">
                      <CardContent>
                        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No subscription plans yet</p>
                        <Button
                          onClick={() => {
                            setEditingPlan(null);
                            setPlanDialogOpen(true);
                          }}
                          className="mt-4"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Plan
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {subscriptionPlans.map((plan) => {
                        const currency = CURRENCIES.find(c => c.code === plan.currency) || CURRENCIES[0];
                        return (
                          <Card
                            key={plan.id}
                            className={`glass-card ${plan.is_popular ? 'border-primary' : ''}`}
                          >
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle>{plan.name}</CardTitle>
                                  {plan.description && (
                                    <CardDescription>{plan.description}</CardDescription>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setEditingPlan(plan);
                                      setPlanDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete "${plan.name}"?`)) {
                                        deletePlan.mutate(plan.id);
                                      }
                                    }}
                                    disabled={deletePlan.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="text-2xl sm:text-3xl font-bold">
                                {currency.symbol}{plan.price}
                                <span className="text-xs sm:text-sm text-muted-foreground">
                                  /{plan.billing_period === 'month' ? 'mo' : 'yr'}
                                </span>
                              </div>
                              <ul className="space-y-2 text-sm">
                                {plan.features.map((feature, i) => (
                                  <li key={i} className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-success shrink-0" />
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                              {plan.is_popular && (
                                <Badge variant="default" className="w-full justify-center">
                                  Most Popular
                                </Badge>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                <SubscriptionPlanDialog
                  open={planDialogOpen}
                  onOpenChange={setPlanDialogOpen}
                  plan={editingPlan}
                  onSubmit={async (data) => {
                    if (editingPlan) {
                      await updatePlan.mutateAsync({ id: editingPlan.id, ...data });
                    } else {
                      await createPlan.mutateAsync(data);
                    }
                    setEditingPlan(null);
                  }}
                  isLoading={createPlan.isPending || updatePlan.isPending}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
