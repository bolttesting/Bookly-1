import { useState, useEffect } from 'react';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useFooterLinks } from '@/hooks/useFooterLinks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { FooterLink } from '@/hooks/useFooterLinks';

export default function SuperAdminSiteSettings() {
  const { settings, isLoading, update, isUpdating } = useSiteSettings();
  const { links: footerLinks, create: createLink, update: updateLink, delete: deleteLink, isCreating, isUpdating: isUpdatingLink } = useFooterLinks();
  const [footerCopyright, setFooterCopyright] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<FooterLink | null>(null);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkOrder, setLinkOrder] = useState(0);

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

      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Footer Menu Links</CardTitle>
              <CardDescription>
                Links shown in the footer (e.g. Sign In, Privacy, Terms, Contact). Add policy/terms pages when you create them.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingLink(null);
                setLinkLabel('');
                setLinkUrl('');
                setLinkOrder(footerLinks.length);
                setLinkDialogOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Link
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {footerLinks.length === 0 ? (
            <p className="text-muted-foreground py-4">No footer links yet. Add links for Sign In, Privacy, Terms, etc.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-20">Order</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {footerLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">{link.label}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[200px]">{link.url}</TableCell>
                    <TableCell>{link.display_order}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingLink(link);
                            setLinkLabel(link.label);
                            setLinkUrl(link.url);
                            setLinkOrder(link.display_order);
                            setLinkDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={async () => {
                            if (!confirm(`Remove "${link.label}"?`)) return;
                            try {
                              await deleteLink(link.id);
                              toast.success('Link removed');
                            } catch (e: any) {
                              toast.error(e.message);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLink ? 'Edit Footer Link' : 'Add Footer Link'}</DialogTitle>
            <DialogDescription>Link appears in the footer menu. Use /privacy, /terms etc. for future pages.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (editingLink) {
                  await updateLink({ id: editingLink.id, label: linkLabel, url: linkUrl, display_order: linkOrder });
                  toast.success('Link updated');
                } else {
                  await createLink({ label: linkLabel, url: linkUrl, display_order: linkOrder });
                  toast.success('Link added');
                }
                setLinkDialogOpen(false);
              } catch (err: any) {
                toast.error(err.message ?? 'Failed to save');
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="e.g. Privacy" required />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/privacy or #contact" required />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input type="number" min={0} value={linkOrder} onChange={(e) => setLinkOrder(parseInt(e.target.value, 10) || 0)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating || isUpdatingLink}>
                {(isCreating || isUpdatingLink) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingLink ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
