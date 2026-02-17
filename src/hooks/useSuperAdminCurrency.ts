import { useSiteSettings } from '@/hooks/useSiteSettings';
import { formatCurrencySimple } from '@/lib/currency';

/** Default when site setting is not set (e.g. PKR for Pakistani Rupee). Change to USD if needed. */
const DEFAULT_SUPER_ADMIN_CURRENCY = 'PKR';

/**
 * Single source for super admin currency and price formatting.
 * Use in Overview, Appointments, Customers (and Packages for default).
 */
export function useSuperAdminCurrency() {
  const { settings } = useSiteSettings();
  const currency = settings?.default_currency ?? DEFAULT_SUPER_ADMIN_CURRENCY;
  const formatCurrency = (amount: number | null | undefined) =>
    formatCurrencySimple(amount, currency);
  return { currency, formatCurrency };
}
