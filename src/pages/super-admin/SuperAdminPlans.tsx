import { useEffect, useState } from 'react';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Check, Plus, Pencil, Trash2, ExternalLink, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { CURRENCIES } from '@/lib/currency';
import { SubscriptionPlanDialog } from '@/components/subscriptions/SubscriptionPlanDialog';

export default function SuperAdminPlans() {
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
  const [stripeAdminConnected, setStripeAdminConnected] = useState<boolean | null>(null);
  const [stripeAdminMode, setStripeAdminMode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStripeAdminConnected(null);
    supabase.functions.invoke('stripe-admin-connect', { body: {} }).then(({ data, error }) => {
      if (cancelled) return;
      if (!error && data?.connected) {
        setStripeAdminConnected(true);
        setStripeAdminMode(data.mode || 'test');
      } else {
        setStripeAdminConnected(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-display font-bold truncate">Plans & Stripe</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Connect Stripe and manage subscription plans</p>
      </div>

      <Card className="glass-card overflow-hidden min-w-0 max-w-full">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
            <CreditCard className="h-5 w-5" />
            Stripe Integration & Subscriptions
          </CardTitle>
          <CardDescription>
            Connect your Stripe account to collect subscription payments from businesses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-4 sm:p-6 pt-0">
          {/* Stripe Connection Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              Stripe Account
              {stripeAdminConnected === true && (
                <Badge variant="default" className="bg-green-600 gap-1">
                  <Check className="h-3 w-3" />
                  Connected ({stripeAdminMode || 'test'} mode)
                </Badge>
              )}
              {stripeAdminConnected === false && (
                <Badge variant="secondary">Not configured</Badge>
              )}
              {stripeAdminConnected === null && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </h3>
            {stripeAdminConnected === true ? (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-3">
                <p className="text-sm text-muted-foreground">
                  Your Stripe account is connected. STRIPE_SECRET_KEY is configured and verified. You can open the Stripe dashboard to manage payments.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const mode = stripeAdminMode === 'live' ? '' : '/test';
                      window.open(`https://dashboard.stripe.com${mode}`, '_blank');
                    }}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Stripe Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStripeAdminConnected(false);
                      setStripeAdminMode(null);
                      toast.info(
                        'To fully disconnect, remove STRIPE_SECRET_KEY from Supabase Dashboard → Project Settings → Edge Functions → Secrets.',
                        { duration: 6000 }
                      );
                    }}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm text-muted-foreground mb-4">
                  Add STRIPE_SECRET_KEY to Supabase Dashboard → Project Settings → Edge Functions → Secrets. Then click below to verify and open your Stripe dashboard.
                </p>
                <Button
                  onClick={async () => {
                    try {
                      const { data, error: functionError } = await supabase.functions.invoke('stripe-admin-connect', {
                        body: {},
                      });

                      if (functionError) {
                        let msg = functionError.message || 'Unknown error';
                        if (functionError instanceof FunctionsHttpError && functionError.context) {
                          try {
                            const body = await functionError.context.json();
                            if (body?.error) msg = body.error;
                          } catch {}
                        }
                        if (msg.includes('fetch') || msg.includes('Failed to send') || msg.includes('network')) {
                          toast.error(
                            'Cannot reach Stripe service. Deploy: "supabase functions deploy stripe-admin-connect" and add STRIPE_SECRET_KEY in Supabase Dashboard > Edge Functions > Secrets.',
                            { duration: 8000 }
                          );
                        } else if (msg.includes('not found') || msg.includes('404')) {
                          toast.info('Deploy the function: supabase functions deploy stripe-admin-connect', { duration: 6000 });
                        } else {
                          toast.error(msg);
                        }
                        return;
                      }

                      if (data?.error) {
                        toast.error(data.error);
                        return;
                      }

                      if (data?.connected && data?.dashboard_url) {
                        setStripeAdminConnected(true);
                        setStripeAdminMode(data.mode || 'test');
                        toast.success(`Stripe connected (${data.mode || 'test'} mode). Opening dashboard...`);
                        window.open(data.dashboard_url, '_blank');
                      } else {
                        toast.error('Stripe verification failed');
                      }
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to verify Stripe connection.');
                    }
                  }}
                  className="gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Verify & Connect Stripe
                </Button>
              </div>
            )}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
