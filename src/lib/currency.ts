// Currency utility functions

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-EU' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', locale: 'ar-SA' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', locale: 'en-PK' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', locale: 'es-MX' },
];

export function getCurrencyByCode(code: string): Currency {
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
}

export function formatCurrency(amount: number | null | undefined, currencyCode: string = 'USD'): string {
  const currency = getCurrencyByCode(currencyCode);
  
  // For currencies without decimals (like JPY)
  const decimals = ['JPY', 'KRW'].includes(currencyCode) ? 0 : 2;
  
  // Handle null, undefined, or non-number values
  const numAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  
  // Use Intl.NumberFormat for proper formatting
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numAmount);
  } catch {
    // Fallback if locale is not supported
    return `${currency.symbol}${numAmount.toFixed(decimals)}`;
  }
}

export function formatCurrencySimple(amount: number | null | undefined, currencyCode: string = 'USD'): string {
  const currency = getCurrencyByCode(currencyCode);
  const decimals = ['JPY', 'KRW'].includes(currencyCode) ? 0 : 2;
  // Handle null, undefined, or non-number values
  const numAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `${currency.symbol}${numAmount.toFixed(decimals)}`;
}

