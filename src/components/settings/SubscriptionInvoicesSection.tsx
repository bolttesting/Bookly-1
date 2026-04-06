import { useState } from 'react';
import { usePlatformSubscriptionInvoices, type PlatformSubscriptionInvoice } from '@/hooks/usePlatformSubscriptionInvoices';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/currency';
import { downloadSubscriptionInvoicePdf } from '@/lib/subscriptionInvoicePdf';
import { ExternalLink, FileDown, FileText, Loader2 } from 'lucide-react';

type Props = {
  businessId: string | undefined;
};

function formatMonth(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

export function SubscriptionInvoicesSection({ businessId }: Props) {
  const { data: invoices = [], isLoading } = usePlatformSubscriptionInvoices(businessId);
  const [viewing, setViewing] = useState<PlatformSubscriptionInvoice | null>(null);

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Bookly subscription invoices</CardTitle>
          </div>
          <CardDescription>
            Invoices for your paid Bookly plan upgrades. Each successful Stripe checkout creates one invoice for that
            billing period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No paid subscription checkouts yet. When you upgrade to a paid plan, your invoice will appear here.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => {
                    const code = inv.currency.toUpperCase();
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{formatMonth(inv.paid_at)}</TableCell>
                        <TableCell>{inv.plan_name}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(inv.total_cents / 100, code)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setViewing(inv)}>
                              View
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => downloadSubscriptionInvoicePdf(inv)}
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              PDF
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subscription invoice</DialogTitle>
            <DialogDescription>
              Bookly platform subscription — {viewing ? formatMonth(viewing.paid_at) : ''}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p>
                  <span className="text-muted-foreground">Invoice ID</span>
                  <br />
                  <span className="font-mono text-xs break-all">{viewing.id}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Business</span>
                  <br />
                  {viewing.business_name || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Account</span>
                  <br />
                  {viewing.account_name || '—'}
                  <br />
                  {viewing.account_email || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Plan</span>
                  <br />
                  {viewing.plan_name}
                </p>
                <p>
                  <span className="text-muted-foreground">Billing period</span>
                  <br />
                  {new Date(viewing.billing_period_start).toLocaleDateString()} —{' '}
                  {new Date(viewing.billing_period_end).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(viewing.subtotal_cents / 100, viewing.currency.toUpperCase())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({viewing.tax_percent}%)</span>
                  <span>{formatCurrency(viewing.tax_amount_cents / 100, viewing.currency.toUpperCase())}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(viewing.total_cents / 100, viewing.currency.toUpperCase())}</span>
                </div>
              </div>
              {viewing.receipt_url && (
                <Button variant="outline" className="w-full gap-2" asChild>
                  <a href={viewing.receipt_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open Stripe receipt
                  </a>
                </Button>
              )}
              <Button className="w-full gap-2" onClick={() => downloadSubscriptionInvoicePdf(viewing)}>
                <FileDown className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
