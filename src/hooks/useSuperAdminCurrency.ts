import { useSiteSettings } from '@/hooks/useSiteSettings';
import { formatCurrencySimple } from '@/lib/currency';

/**
 * Single source for super admin currency and price formatting.
 * Use in Overview, Appointments, Customers (and Packages for default) so $ price is consistent.
 */
export function useSuperAdminCurrency() {
  const { settings } = useSiteSettings();
  const currency = settings?.default_currency ?? 'USD';
  const formatCurrency = (amount: number | null | undefined) =>
    formatCurrencySimple(amount, currency);
  return { currency, formatCurrency };
}
