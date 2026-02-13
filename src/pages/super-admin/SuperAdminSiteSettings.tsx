import { useState, useEffect } from 'react';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminSiteSettings() {
  const { settings, isLoading, update, isUpdating } = useSiteSettings();
  const [footerCopyright, setFooterCopyright] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');

  useEffect(() => {
    if (settings) {
      setFooterCopyright(settings.footer_copyright ?? '');
      setContactEmail(settings.contact_email ?? '');
      setContactPhone(settings.contact_phone ?? '');
      setContactAddress(settings.contact_address ?? '');
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await update({
        footer_copyright: footerCopyright || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        contact_address: contactAddress || null,
      });
      toast.success('Site settings saved');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Site Settings</h1>
        <p className="text-muted-foreground">Edit footer and contact info shown on the home page</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Home Page Content</CardTitle>
          <CardDescription>
            These values appear in the footer and contact section of the landing page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="footer_copyright">Footer Copyright</Label>
              <Input
                id="footer_copyright"
                value={footerCopyright}
                onChange={(e) => setFooterCopyright(e.target.value)}
                placeholder="© 2024 Bookly. All rights reserved."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="support@bookly.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 (234) 567-890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_address">Contact Address</Label>
              <textarea
                id="contact_address"
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                placeholder="123 Business Street, Suite 100, City, State 12345"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                rows={3}
              />
            </div>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
