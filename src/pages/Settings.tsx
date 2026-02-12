import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { User, Building2, CreditCard, Bell, Link2, Copy, Check, ExternalLink, Clock, Download, QrCode, Code2, MapPin, DollarSign, CheckCircle, Package, Loader2 } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from '@/hooks/useBusiness';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { useBusinessSubscription } from '@/hooks/useBusinessSubscription';
import { useReminderSettings } from '@/hooks/useReminders';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { LocationHoursSettings } from '@/components/settings/LocationHoursSettings';
import { LocationsSettings } from '@/components/settings/LocationsSettings';
import { formatCurrencySimple, getCurrencyByCode } from '@/lib/currency';

const Settings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { business, updateBusiness, refetch: refetchBusiness } = useBusiness();
  const { currencyCode, currencies } = useCurrency();
  const { plans: subscriptionPlans, isLoading: plansLoading } = useSubscriptionPlans();
  const { subscription, isLoading: subscriptionLoading, updateSubscription } = useBusinessSubscription();
  const { settings: reminderSettings, isLoading: reminderSettingsLoading, updateSettings: updateReminderSettings } = useReminderSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stripeConnectEmail, setStripeConnectEmail] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stripeConnectEmail && (user?.email || business?.email)) {
      setStripeConnectEmail(user?.email || business?.email || '');
    }
  }, [user?.email, business?.email]);

  // Handle subscription checkout redirect from Stripe
  const processedCheckoutRef = useRef<string | null>(null);
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    const sessionId = searchParams.get('session_id');

    if (checkout === 'cancelled') {
      toast.info('Checkout was cancelled');
      setSearchParams((p) => {
        p.delete('checkout');
        p.delete('session_id');
        return p;
      });
      return;
    }

    if (checkout !== 'success' || !sessionId || processedCheckoutRef.current === sessionId) return;
    processedCheckoutRef.current = sessionId;

    (async () => {
      const { data, error } = await supabase.functions.invoke('complete-subscription-checkout', {
        body: { session_id: sessionId },
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || 'Failed to complete subscription');
      } else {
        queryClient.invalidateQueries({ queryKey: ['business-subscription'] });
        queryClient.invalidateQueries({ queryKey: ['business'] });
        refetchBusiness();
        toast.success('Subscription upgraded successfully!');
      }
      setSearchParams((p) => {
        p.delete('checkout');
        p.delete('session_id');
        return p;
      });
    })();
  }, [searchParams, queryClient, setSearchParams, refetchBusiness]);
  
  // Get active tab from URL params, default to 'booking'
  const activeTab = searchParams.get('tab') || 'booking';

  const bookingUrl = business ? `${window.location.origin}/book/${business.slug}` : '';
  
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const copyBookingLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    toast.success('Booking link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQRCode = () => {
    if (!qrRef.current) return;
    
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 300, 300);
      }
      
      const link = document.createElement('a');
      link.download = `${business?.slug || 'booking'}-qr-code.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('QR code downloaded!');
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const embedCode = `<!-- Bookly Widget -->
<iframe 
  src="${bookingUrl}?embed=true" 
  style="width: 100%; min-height: 700px; border: none; border-radius: 12px;"
  title="Book an appointment with ${business?.name || 'us'}"
></iframe>`;

  const embedButtonCode = `<!-- Bookly Booking Button -->
<a 
  href="${bookingUrl}" 
  target="_blank"
  style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 8px; font-family: system-ui, sans-serif; font-weight: 600;"
>
  Book Now
</a>`;

  const copyEmbedCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setEmbedCopied(true);
    toast.success('Embed code copied!');
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in w-full px-2 sm:px-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Manage your account and business settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
        <div className="glass-card p-2 w-full overflow-x-auto">
          <TabsList className="bg-transparent gap-1 min-w-max">
            <TabsTrigger value="booking" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm whitespace-nowrap">
              <Link2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Booking</span>
              <span className="sm:hidden">Book</span>
            </TabsTrigger>
            <TabsTrigger value="hours" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm whitespace-nowrap">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Hours
            </TabsTrigger>
            <TabsTrigger value="locations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm whitespace-nowrap">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Locations</span>
              <span className="sm:hidden">Loc</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm whitespace-nowrap">
              <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="business" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm whitespace-nowrap">
              <Building2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Business</span>
              <span className="sm:hidden">Biz</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm whitespace-nowrap">
              <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Notif</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm whitespace-nowrap">
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Payments</span>
              <span className="sm:hidden">Pay</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="booking" className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
          <div className="glass-card p-4 sm:p-6 overflow-hidden">
            <h2 className="text-lg font-semibold mb-4">Public Booking Page</h2>
            <p className="text-muted-foreground mb-4">
              Share this link with your customers so they can book appointments online.
            </p>
            <div className="flex gap-2 items-center">
              <div className="flex-1 min-w-0 overflow-hidden">
                <Input 
                  value={bookingUrl} 
                  readOnly 
                  className="bg-secondary font-mono text-sm w-full"
                />
              </div>
              <Button variant="outline" size="icon" className="shrink-0" onClick={copyBookingLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" className="shrink-0" asChild>
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Booking QR Code</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Print or share this QR code so customers can quickly access your booking page.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <div 
                ref={qrRef}
                className="bg-white p-4 rounded-lg shadow-md"
              >
                <QRCodeSVG 
                  value={bookingUrl || 'https://example.com'} 
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="space-y-3 text-center sm:text-left">
                <div>
                  <p className="font-medium">Scan to book</p>
                  <p className="text-sm text-muted-foreground">
                    Customers can scan this code with their phone camera to open your booking page.
                  </p>
                </div>
                <Button onClick={downloadQRCode} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download QR Code
                </Button>
              </div>
            </div>
          </div>

          {/* Embed Widget Section */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Code2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Embed on Your Website</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Add your booking system to any website by copying and pasting this code.
            </p>
            
            <div className="space-y-6">
              {/* Full Widget Embed */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-medium">Full Booking Widget</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyEmbedCode(embedCode)}
                    className="gap-2"
                  >
                    {embedCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Embeds the complete booking form directly on your page.
                </p>
                <pre className="bg-secondary p-4 rounded-lg overflow-x-auto text-xs font-mono">
                  <code>{embedCode}</code>
                </pre>
              </div>

              <Separator />

              {/* Button Only Embed */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-medium">Book Now Button</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyEmbedCode(embedButtonCode)}
                    className="gap-2"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  A simple button that opens your booking page in a new tab.
                </p>
                <pre className="bg-secondary p-4 rounded-lg overflow-x-auto text-xs font-mono">
                  <code>{embedButtonCode}</code>
                </pre>
              </div>

              {/* Preview */}
              <div>
                <Label className="font-medium mb-2 block">Button Preview</Label>
                <div className="bg-secondary/50 p-4 rounded-lg">
                  <a 
                    href={bookingUrl} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  >
                    Book Now
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4">Booking Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Online Booking</p>
                  <p className="text-sm text-muted-foreground">Allow customers to book online</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Require Deposit</p>
                  <p className="text-sm text-muted-foreground">Collect deposit for bookings</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Allow Cancellations</p>
                  <p className="text-sm text-muted-foreground">Let customers cancel their bookings</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-confirm Bookings</p>
                  <p className="text-sm text-muted-foreground">Automatically confirm new bookings</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="reschedule-deadline" className="font-medium">Reschedule Deadline</Label>
                    <p className="text-sm text-muted-foreground">
                      Minimum hours before appointment that reschedule requests are allowed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    id="reschedule-deadline"
                    type="number"
                    min="0"
                    max="168"
                    value={business?.reschedule_deadline_hours ?? 24}
                    onChange={async (e) => {
                      const value = parseInt(e.target.value) || 0;
                      if (value >= 0 && value <= 168) {
                        try {
                          await updateBusiness({ reschedule_deadline_hours: value });
                          // Invalidate my-appointments query to refresh the deadline in customer dashboard
                          queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
                          toast.success('Reschedule deadline updated successfully!');
                        } catch (error) {
                          toast.error('Failed to update reschedule deadline');
                          console.error(error);
                        }
                      }
                    }}
                    className="w-24 bg-secondary"
                  />
                  <span className="text-sm text-muted-foreground">hours before appointment</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {business?.reschedule_deadline_hours === 0 
                    ? 'Reschedule requests allowed anytime before appointment'
                    : business?.reschedule_deadline_hours === 24
                    ? 'Customers must request reschedule at least 24 hours before their appointment'
                    : `Customers must request reschedule at least ${business?.reschedule_deadline_hours} hours before their appointment`}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hours">
          <LocationHoursSettings />
        </TabsContent>

        <TabsContent value="locations">
          <LocationsSettings />
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input 
                  id="firstName" 
                  defaultValue={user?.user_metadata?.first_name || ''} 
                  className="bg-secondary" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  defaultValue={user?.user_metadata?.last_name || ''} 
                  className="bg-secondary" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  defaultValue={user?.email || ''} 
                  className="bg-secondary" 
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="+1 (555) 123-4567" className="bg-secondary" />
              </div>
            </div>
            <div className="mt-6">
              <Button className="animated-gradient text-primary-foreground">
                Save Changes
              </Button>
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4">Security</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Session Timeout</p>
                  <p className="text-sm text-muted-foreground">Automatically log out after inactivity</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4">Business Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input 
                  id="businessName" 
                  defaultValue={business?.name || ''} 
                  className="bg-secondary" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessLogo">Logo URL</Label>
                <Input 
                  id="businessLogo" 
                  type="url"
                  placeholder="https://example.com/logo.png"
                  defaultValue={business?.logo_url || ''} 
                  className="bg-secondary" 
                />
                <p className="text-xs text-muted-foreground">
                  Your logo will appear in the booking widget. Use a direct image URL.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input 
                  id="industry" 
                  defaultValue={business?.industry || ''} 
                  className="bg-secondary" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessEmail">Business Email</Label>
                <Input 
                  id="businessEmail" 
                  defaultValue={business?.email || ''} 
                  className="bg-secondary" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessPhone">Business Phone</Label>
                <Input 
                  id="businessPhone" 
                  defaultValue={business?.phone || ''} 
                  className="bg-secondary" 
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input 
                  id="address" 
                  defaultValue={business?.address || ''} 
                  className="bg-secondary" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input 
                  id="city" 
                  defaultValue={business?.city || ''} 
                  className="bg-secondary" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input 
                  id="timezone" 
                  defaultValue={business?.timezone || 'America/New_York'} 
                  className="bg-secondary" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  defaultValue={business?.currency || 'USD'}
                  onValueChange={async (value) => {
                    try {
                      setIsSaving(true);
                      await updateBusiness({ currency: value });
                      toast.success('Currency updated successfully!');
                    } catch (error) {
                      toast.error('Failed to update currency');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.symbol} {curr.name} ({curr.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This currency will be used throughout your booking system
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Button 
                className="animated-gradient text-primary-foreground"
                disabled={isSaving}
                onClick={async () => {
                  const name = (document.getElementById('businessName') as HTMLInputElement)?.value;
                  const logoUrl = (document.getElementById('businessLogo') as HTMLInputElement)?.value?.trim() || null;
                  const industry = (document.getElementById('industry') as HTMLInputElement)?.value;
                  const email = (document.getElementById('businessEmail') as HTMLInputElement)?.value;
                  const phone = (document.getElementById('businessPhone') as HTMLInputElement)?.value;
                  const address = (document.getElementById('address') as HTMLInputElement)?.value;
                  const city = (document.getElementById('city') as HTMLInputElement)?.value;
                  const timezone = (document.getElementById('timezone') as HTMLInputElement)?.value;

                  try {
                    setIsSaving(true);
                    await updateBusiness({
                      name,
                      logo_url: logoUrl,
                      industry: industry || null,
                      email: email || null,
                      phone: phone || null,
                      address: address || null,
                      city: city || null,
                      timezone: timezone || null,
                    });
                    toast.success('Business details updated successfully!');
                  } catch (error) {
                    toast.error('Failed to update business details');
                  } finally {
                    setIsSaving(false);
                  }
                }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          {/* Appointment Reminders */}
          <div className="glass-card p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Appointment Reminders</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Automatically send reminders to customers before their appointments
            </p>

            {reminderSettingsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : reminderSettings ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-secondary/50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">Email Reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Send email reminders to customers before appointments
                    </p>
                  </div>
                  <Switch
                    checked={reminderSettings.enable_email_reminders}
                    onCheckedChange={async (checked) => {
                      await updateReminderSettings.mutateAsync({ enable_email_reminders: checked });
                    }}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-secondary/50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">SMS Reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Send SMS reminders (requires SMS provider setup)
                    </p>
                  </div>
                  <Switch
                    checked={reminderSettings.enable_sms_reminders}
                    onCheckedChange={async (checked) => {
                      await updateReminderSettings.mutateAsync({ enable_sms_reminders: checked });
                    }}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Reminder Times (hours before appointment)</Label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 6, 12, 24, 48].map((hours) => {
                      const isSelected = reminderSettings.reminder_hours_before?.includes(hours);
                      return (
                        <Button
                          key={hours}
                          type="button"
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={async () => {
                            const current = reminderSettings.reminder_hours_before || [];
                            const updated = isSelected
                              ? current.filter((h) => h !== hours)
                              : [...current, hours].sort((a, b) => a - b);
                            await updateReminderSettings.mutateAsync({ reminder_hours_before: updated });
                          }}
                        >
                          {hours}h
                        </Button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selected: {reminderSettings.reminder_hours_before?.join(', ') || 'None'} hours before
                  </p>
                </div>

                <Separator />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-secondary/50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">Send Confirmation on Booking</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically send confirmation email when appointment is booked
                    </p>
                  </div>
                  <Switch
                    checked={reminderSettings.send_reminder_on_booking}
                    onCheckedChange={async (checked) => {
                      await updateReminderSettings.mutateAsync({ send_reminder_on_booking: checked });
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Failed to load reminder settings
              </div>
            )}
          </div>

          {/* Email Notifications */}
          <div className="glass-card p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Email Notifications</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Configure which emails to send to customers automatically
            </p>

            {reminderSettingsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : reminderSettings ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-secondary/50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">Booking Confirmation</p>
                    <p className="text-sm text-muted-foreground">
                      Send confirmation email when customer books an appointment
                    </p>
                  </div>
                  <Switch
                    checked={reminderSettings.send_booking_confirmation ?? true}
                    onCheckedChange={async (checked) => {
                      await updateReminderSettings.mutateAsync({ send_booking_confirmation: checked });
                    }}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-secondary/50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">Cancellation Email</p>
                    <p className="text-sm text-muted-foreground">
                      Send email when an appointment is cancelled
                    </p>
                  </div>
                  <Switch
                    checked={reminderSettings.send_cancellation_email ?? true}
                    onCheckedChange={async (checked) => {
                      await updateReminderSettings.mutateAsync({ send_cancellation_email: checked });
                    }}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-secondary/50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">Reschedule Email</p>
                    <p className="text-sm text-muted-foreground">
                      Send email when an appointment is rescheduled
                    </p>
                  </div>
                  <Switch
                    checked={reminderSettings.send_reschedule_email ?? true}
                    onCheckedChange={async (checked) => {
                      await updateReminderSettings.mutateAsync({ send_reschedule_email: checked });
                    }}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-secondary/50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">Welcome Email</p>
                    <p className="text-sm text-muted-foreground">
                      Send welcome email to new customers on their first booking
                    </p>
                  </div>
                  <Switch
                    checked={reminderSettings.send_welcome_email ?? false}
                    onCheckedChange={async (checked) => {
                      await updateReminderSettings.mutateAsync({ send_welcome_email: checked });
                    }}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-secondary/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">Follow-up Email</p>
                      <p className="text-sm text-muted-foreground">
                        Send follow-up email after appointment completion
                      </p>
                    </div>
                    <Switch
                      checked={reminderSettings.send_followup_email ?? false}
                      onCheckedChange={async (checked) => {
                        await updateReminderSettings.mutateAsync({ send_followup_email: checked });
                      }}
                    />
                  </div>

                  {reminderSettings.send_followup_email && (
                    <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                      <Label>Send follow-up after (days)</Label>
                      <Select
                        value={String(reminderSettings.followup_days_after ?? 1)}
                        onValueChange={async (value) => {
                          await updateReminderSettings.mutateAsync({ followup_days_after: parseInt(value) });
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 day</SelectItem>
                          <SelectItem value="2">2 days</SelectItem>
                          <SelectItem value="3">3 days</SelectItem>
                          <SelectItem value="7">1 week</SelectItem>
                          <SelectItem value="14">2 weeks</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Follow-up email will be sent {reminderSettings.followup_days_after ?? 1} day(s) after appointment
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Failed to load email notification settings
              </div>
            )}
          </div>

          {/* Business Notifications */}
          <div className="glass-card p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">Business Notifications</h2>
            <p className="text-sm text-muted-foreground mb-6">
              In-app notifications (bell icon) and email preferences
            </p>
            {reminderSettingsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : reminderSettings ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New Bookings</p>
                    <p className="text-sm text-muted-foreground">Get notified when customers book (in-app)</p>
                  </div>
                  <Switch
                    checked={reminderSettings.notify_new_bookings ?? true}
                    onCheckedChange={async (checked) => {
                      await updateReminderSettings.mutateAsync({ notify_new_bookings: checked });
                    }}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Cancellations</p>
                    <p className="text-sm text-muted-foreground">Get notified when customers cancel (in-app)</p>
                  </div>
                  <Switch
                    checked={reminderSettings.notify_cancellations ?? true}
                    onCheckedChange={async (checked) => {
                      await updateReminderSettings.mutateAsync({ notify_cancellations: checked });
                    }}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Daily Summary</p>
                    <p className="text-sm text-muted-foreground">Receive daily booking summary via email</p>
                  </div>
                  <Switch
                    checked={reminderSettings.notify_daily_summary ?? false}
                    onCheckedChange={async (checked) => {
                      await updateReminderSettings.mutateAsync({ notify_daily_summary: checked });
                    }}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Marketing Updates</p>
                    <p className="text-sm text-muted-foreground">Tips and feature announcements (saved for future use)</p>
                  </div>
                  <Switch
                    checked={reminderSettings.notify_marketing_updates ?? false}
                    onCheckedChange={async (checked) => {
                      await updateReminderSettings.mutateAsync({ notify_marketing_updates: checked });
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Failed to load notification settings
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Stripe Payment Integration</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Connect your Stripe account to accept payments from customers. Payments will be deposited directly to your Stripe account.
            </p>

            {business?.stripe_connected ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2 p-4 bg-success/10 border border-success/20 rounded-lg">
                  <Check className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium text-success">Stripe Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Your Stripe account is connected and ready to accept payments
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Stripe Account ID</Label>
                  <Input value={business.stripe_account_id || ''} readOnly className="bg-secondary" />
                </div>

                <Separator />

                {/* Payment Settings - Always visible */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-semibold">Payment Settings</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure when and how customers pay for appointments. These settings apply to all services with a price.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-secondary/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">Require Payment for Bookings</p>
                      <p className="text-sm text-muted-foreground">
                        When enabled, customers must pay for appointments with a price. Requires Stripe connection.
                      </p>
                    </div>
                    <Switch
                      checked={business.require_payment || false}
                      disabled={!business?.stripe_connected}
                      onCheckedChange={async (checked) => {
                        try {
                          await updateBusiness({ require_payment: checked });
                          toast.success(checked ? 'Payment required enabled' : 'Payment requirement disabled');
                        } catch (error) {
                          toast.error('Failed to update payment settings');
                        }
                      }}
                    />
                  </div>
                  
                  {!business?.stripe_connected && (
                    <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Note:</strong> You need to connect Stripe above to enable payment requirements.
                      </p>
                    </div>
                  )}

                  {business.require_payment && business?.stripe_connected && (
                    <>
                      <div className="space-y-2 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <Label htmlFor="paymentTiming">Payment Timing</Label>
                        <Select
                          value={business.payment_timing || 'advance'}
                          onValueChange={async (value: 'advance' | 'on_spot' | 'partial') => {
                            try {
                              await updateBusiness({ payment_timing: value });
                              toast.success('Payment timing updated');
                            } catch (error) {
                              toast.error('Failed to update payment timing');
                            }
                          }}
                        >
                          <SelectTrigger id="paymentTiming" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="advance">
                              <div className="flex flex-col">
                                <span className="font-medium">100% Advance Payment</span>
                                <span className="text-xs text-muted-foreground">Customer pays when booking</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="on_spot">
                              <div className="flex flex-col">
                                <span className="font-medium">100% On-the-Spot</span>
                                <span className="text-xs text-muted-foreground">Customer pays at appointment time</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="partial">
                              <div className="flex flex-col">
                                <span className="font-medium">Partial Payment</span>
                                <span className="text-xs text-muted-foreground">Advance + remaining on-the-spot</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Choose when customers need to pay for their appointments
                        </p>
                      </div>

                      {business.payment_timing === 'partial' && (
                        <div className="space-y-2 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                          <Label htmlFor="partialPercentage">Advance Payment Percentage</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="partialPercentage"
                              type="number"
                              min="10"
                              max="90"
                              value={business.partial_payment_percentage || 50}
                              onChange={async (e) => {
                                const percentage = parseInt(e.target.value) || 50;
                                try {
                                  await updateBusiness({ partial_payment_percentage: percentage });
                                } catch (error) {
                                  toast.error('Failed to update partial payment percentage');
                                }
                              }}
                              className="max-w-32"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {business.partial_payment_percentage || 50}% paid in advance, {100 - (business.partial_payment_percentage || 50)}% paid on-the-spot
                          </p>
                        </div>
                      )}

                      {business.payment_timing === 'advance' && (
                        <div className="space-y-2 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                          <Label htmlFor="paymentDueHours">Payment Due Before (hours)</Label>
                          <Input
                            id="paymentDueHours"
                            type="number"
                            min="0"
                            max="168"
                            value={business.payment_due_before_hours || 24}
                            onChange={async (e) => {
                              const hours = parseInt(e.target.value) || 24;
                              try {
                                await updateBusiness({ payment_due_before_hours: hours });
                              } catch (error) {
                                toast.error('Failed to update payment due hours');
                              }
                            }}
                            className="max-w-32"
                          />
                          <p className="text-xs text-muted-foreground">
                            How many hours before the appointment payment is required (0 = immediately)
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  
                  {!business.require_payment && business?.stripe_connected && (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        💡 <strong>Tip:</strong> Enable "Require Payment for Bookings" above to configure payment timing options (advance, on-the-spot, or partial payment).
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!business?.id) return;
                    const { error } = await supabase
                      .from('businesses')
                      .update({
                        stripe_account_id: null,
                        stripe_connected: false,
                        stripe_onboarding_complete: false,
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', business.id);
                    if (error) {
                      toast.error(error.message || 'Failed to disconnect Stripe');
                      return;
                    }
                    refetchBusiness();
                    toast.success('Stripe disconnected');
                  }}
                >
                  Disconnect Stripe
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your Stripe account to start accepting payments. You'll be redirected to Stripe to complete the connection. Stripe requires a valid email for your account.
                  </p>
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="stripe-connect-email">Email for Stripe account</Label>
                    <Input
                      id="stripe-connect-email"
                      type="email"
                      placeholder="your@email.com"
                      value={stripeConnectEmail}
                      onChange={(e) => setStripeConnectEmail(e.target.value)}
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use a permanent email (Stripe rejects temp/disposable addresses). If you get "invalid email", try a different address—yours may already be linked to another Stripe account.
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      try {
                        if (!business?.id) {
                          toast.error('Business not found');
                          return;
                        }
                        const emailToUse = (stripeConnectEmail?.trim() || user?.email || business?.email || '').trim().toLowerCase();
                        if (!emailToUse || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)) {
                          toast.error('Please enter a valid email above. Use a permanent address (not temp/disposable).');
                          return;
                        }

                        // Call Supabase Edge Function for Stripe Connect
                        const { data, error: functionError } = await supabase.functions.invoke('stripe-connect', {
                          body: { business_id: business.id, email: emailToUse, user_id: user?.id },
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
                              'Cannot reach Stripe service. Deploy the Edge Function: run "supabase functions deploy stripe-connect" and add STRIPE_SECRET_KEY in Supabase Dashboard > Edge Functions > Secrets.',
                              { duration: 8000 }
                            );
                          } else if (msg.includes('not found') || msg.includes('404')) {
                            toast.info(
                              'Deploy the stripe-connect function: run "supabase functions deploy stripe-connect"',
                              { duration: 8000 }
                            );
                          } else {
                            toast.error(msg);
                          }
                          return;
                        }

                        if (data?.error) {
                          toast.error(data.error);
                          return;
                        }
                        if (data?.url) {
                          window.location.href = data.url;
                        } else {
                          toast.error(data?.error || 'No redirect URL received');
                        }
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
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="font-medium">What you'll need:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>A Stripe account (create one at stripe.com if you don't have one)</li>
                    <li>Business information for verification</li>
                    <li>Bank account details for payouts</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Subscription Plans Section */}
            <div className="glass-card p-4 sm:p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Upgrade Your Plan</h2>
                </div>
              </div>
              
              {/* Current Plan Status */}
              {subscription.plan && (
                <div className="mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                      <p className="text-lg font-semibold">{subscription.plan.name}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Appointments (this month)</p>
                        <p className="font-medium">
                          {subscription.currentAppointments}
                          {subscription.plan.max_appointments !== null && (
                            <span className="text-muted-foreground"> / {subscription.plan.max_appointments}</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Staff Members</p>
                        <p className="font-medium">
                          {subscription.currentStaff}
                          {subscription.plan.max_staff !== null && (
                            <span className="text-muted-foreground"> / {subscription.plan.max_staff}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-muted-foreground mb-6 text-sm sm:text-base">
                Choose a subscription plan that fits your business needs
              </p>

              {plansLoading || subscriptionLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : subscriptionPlans.length === 0 ? (
                <Card className="text-center py-8">
                  <CardContent>
                    <p className="text-muted-foreground">No subscription plans available</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {subscriptionPlans.map((plan) => {
                    const currency = getCurrencyByCode(plan.currency);
                    const isCurrentPlan = subscription.plan?.id === plan.id;
                    const isUpgrade = subscription.plan && plan.price > subscription.plan.price;
                    const isDowngrade = subscription.plan && plan.price < subscription.plan.price;
                    
                    return (
                      <Card
                        key={plan.id}
                        className={`glass-card ${plan.is_popular ? 'border-primary relative' : ''} ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
                      >
                        {plan.is_popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                          </div>
                        )}
                        {isCurrentPlan && (
                          <div className="absolute -top-3 right-4">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
                              Current
                            </Badge>
                          </div>
                        )}
                        <CardHeader>
                          <CardTitle>{plan.name}</CardTitle>
                          {plan.description && (
                            <CardDescription>{plan.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl sm:text-4xl font-display font-bold">
                              {currency.symbol}{plan.price}
                            </span>
                            <span className="text-sm sm:text-base text-muted-foreground">
                              /{plan.billing_period === 'month' ? 'month' : 'year'}
                            </span>
                          </div>
                          <ul className="space-y-2 text-sm">
                            {plan.features.map((feature, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                          <Button
                            className="w-full"
                            variant={plan.is_popular && !isCurrentPlan ? 'default' : 'outline'}
                            disabled={isCurrentPlan || updateSubscription.isPending}
                            onClick={() => {
                              if (isCurrentPlan) return;
                              updateSubscription.mutate(plan.id);
                            }}
                          >
                            {updateSubscription.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : isCurrentPlan ? (
                              'Current Plan'
                            ) : isUpgrade && plan.price > 0 ? (
                              'Upgrade & Pay'
                            ) : isUpgrade ? (
                              'Upgrade Now'
                            ) : isDowngrade ? (
                              'Downgrade'
                            ) : (
                              'Select Plan'
                            )}
                          </Button>
                          {plan.price > 0 && isUpgrade && !isCurrentPlan && (
                            <p className="text-xs text-muted-foreground text-center mt-2">
                              You'll be redirected to Stripe to complete payment
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;