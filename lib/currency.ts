import type { Currency } from './types';

// Uses frankfurter.app — free ECB-based rates, no API key needed
const BASE_URL = 'https://api.frankfurter.app';

interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export async function fetchLiveRates(base: Currency = 'GBP'): Promise<Record<Currency, number>> {
  const res = await fetch(`${BASE_URL}/latest?from=${base}`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error('Failed to fetch exchange rates');
  const data: FrankfurterResponse = await res.json();
  return { ...data.rates, [base]: 1 } as Record<Currency, number>;
}

// Convert an amount in `from` currency to GBP using a rates map (rates are FROM GBP)
export function convertToGBP(
  amount: number,
  from: Currency,
  ratesFromGBP: Record<string, number>
): number {
  if (from === 'GBP') return amount;
  const rate = ratesFromGBP[from];
  if (!rate) throw new Error(`No rate for ${from}`);
  return amount / rate;
}

// Get the GBP→X rate
export function getRate(currency: Currency, ratesFromGBP: Record<string, number>): number {
  if (currency === 'GBP') return 1;
  return ratesFromGBP[currency] ?? 1;
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  CHF: 'Fr',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  INR: '₹',
  SGD: 'S$',
};

export const CURRENCY_FLAGS: Record<Currency, string> = {
  GBP: '🇬🇧',
  USD: '🇺🇸',
  EUR: '🇪🇺',
  CHF: '🇨🇭',
  JPY: '🇯🇵',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  INR: '🇮🇳',
  SGD: '🇸🇬',
};
