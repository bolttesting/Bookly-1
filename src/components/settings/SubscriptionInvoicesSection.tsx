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
import {
  subscriptionInvoiceDisplayId,
  subscriptionInvoiceIsPaidCheckout,
  subscriptionInvoicePaymentMethodLabel,
} from '@/lib/subscriptionInvoiceDisplay';
import { Check, ChevronDown, FileDown, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppLogo } from '@/components/brand/AppLogo';

type Props = {
  businessId: string | undefined;
};

function formatMonth(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

function formatPaidDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function SubscriptionInvoicesSection({ businessId }: Props) {
  const { data: invoices = [], isLoading } = usePlatformSubscriptionInvoices(businessId);
  const [viewing, setViewing] = useState<PlatformSubscriptionInvoice | null>(null);
  const paidCheckout = viewing ? subscriptionInvoiceIsPaidCheckout(viewing) : false;

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Bookly subscription invoices</CardTitle>
          </div>
          <CardDescription>
            Invoices for your Bookly plan (free and paid). Amounts use each plan&apos;s currency; paid upgrades also
            create a Stripe receipt when available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No subscription invoices yet. Choosing a free plan or completing a paid upgrade creates an invoice here,
              including zero totals in that plan&apos;s currency (e.g. AED 0.00 or USD 0.00).
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
        <DialogContent
          overlayClassName="bg-zinc-950"
          className={cn(
            'flex max-w-[440px] flex-col items-stretch gap-0 border-0 bg-transparent p-6 pt-16 shadow-none sm:rounded-none',
            '[&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100 [&>button]:hover:bg-white/10',
            '[&>button]:ring-offset-zinc-950',
          )}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Subscription invoice</DialogTitle>
            <DialogDescription>
              {viewing ? `Bookly platform subscription — ${formatMonth(viewing.paid_at)}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="mb-5 flex justify-center">
            <AppLogo
              iconClassName="h-9 w-9 shadow-md"
              wordmarkClassName="text-lg font-semibold tracking-tight text-white"
            />
          </div>

          {viewing && (
            <div className="w-full rounded-xl bg-white px-6 pb-8 pt-9 text-neutral-900 shadow-2xl ring-1 ring-black/5 sm:px-8">
              <div className="relative mx-auto mb-3 flex h-14 w-12 items-center justify-center">
                <FileText className="h-14 w-12 text-neutral-300" strokeWidth={1.25} />
                <span className="absolute -bottom-0.5 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
              </div>

              <p className="text-center text-sm text-neutral-500">
                {paidCheckout ? 'Invoice paid' : 'Subscription invoice'}
              </p>
              <p className="mt-1 text-center text-3xl font-semibold tracking-tight text-neutral-900 tabular-nums">
                {formatCurrency(viewing.total_cents / 100, viewing.currency.toUpperCase())}
              </p>

              <details className="group mt-3">
                <summary
                  className="flex cursor-pointer list-none items-center justify-center gap-1 text-center text-sm text-neutral-500 hover:text-neutral-700 [&::-webkit-details-marker]:hidden"
                >
                  View amount breakdown
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-4 space-y-2 border-t border-neutral-100 pt-4 text-sm">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal</span>
                    <span className="tabular-nums text-neutral-900">
                      {formatCurrency(viewing.subtotal_cents / 100, viewing.currency.toUpperCase())}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Tax ({viewing.tax_percent}%)</span>
                    <span className="tabular-nums text-neutral-900">
                      {formatCurrency(viewing.tax_amount_cents / 100, viewing.currency.toUpperCase())}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-100 pt-2 font-medium text-neutral-900">
                    <span>Total</span>
                    <span className="tabular-nums">
                      {formatCurrency(viewing.total_cents / 100, viewing.currency.toUpperCase())}
                    </span>
                  </div>
                </div>
              </details>

              <dl className="mt-6 space-y-3 text-sm">
                <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1">
                  <dt className="text-neutral-500">Invoice number</dt>
                  <dd className="text-right font-medium text-neutral-900">
                    {subscriptionInvoiceDisplayId(viewing.id)}
                  </dd>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1">
                  <dt className="text-neutral-500">Payment date</dt>
                  <dd className="text-right font-medium text-neutral-900">{formatPaidDate(viewing.paid_at)}</dd>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1">
                  <dt className="text-neutral-500">Payment method</dt>
                  <dd className="text-right font-medium text-neutral-900">
                    {subscriptionInvoicePaymentMethodLabel(viewing)}
                  </dd>
                </div>
              </dl>

              <p className="mt-5 text-xs leading-relaxed text-neutral-400">
                {viewing.plan_name}
                <span className="text-neutral-300"> · </span>
                {new Date(viewing.billing_period_start).toLocaleDateString()} —{' '}
                {new Date(viewing.billing_period_end).toLocaleDateString()}
                <br />
                {viewing.business_name}
                {viewing.account_email ? (
                  <>
                    <br />
                    {viewing.account_email}
                  </>
                ) : null}
              </p>

              {viewing.receipt_url ? (
                <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-stretch">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-neutral-900 bg-white text-neutral-900 hover:bg-neutral-50"
                    onClick={() => downloadSubscriptionInvoicePdf(viewing)}
                  >
                    Download invoice
                  </Button>
                  <Button type="button" className="flex-1 bg-neutral-900 text-white hover:bg-neutral-800" asChild>
                    <a href={viewing.receipt_url} target="_blank" rel="noopener noreferrer">
                      Download receipt
                    </a>
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  className="mt-8 w-full bg-neutral-900 text-white hover:bg-neutral-800"
                  onClick={() => downloadSubscriptionInvoicePdf(viewing)}
                >
                  Download invoice
                </Button>
              )}
            </div>
          )}

          <p className="mt-8 text-center text-xs text-white/45">
            {paidCheckout ? 'Payment processed securely with Stripe.' : 'Bookly platform subscription billing.'}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
