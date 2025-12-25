import { useBusiness } from './useBusiness';
import { formatCurrency, formatCurrencySimple, getCurrencyByCode, CURRENCIES } from '@/lib/currency';

export function useCurrency() {
  const { business } = useBusiness();
  const currencyCode = business?.currency || 'USD';
  const currency = getCurrencyByCode(currencyCode);

  const format = (amount: number | null | undefined, useSimple: boolean = false): string => {
    if (useSimple) {
      return formatCurrencySimple(amount, currencyCode);
    }
    return formatCurrency(amount, currencyCode);
  };

  return {
    currencyCode,
    currency,
    format,
    symbol: currency.symbol,
    currencies: CURRENCIES,
  };
}

