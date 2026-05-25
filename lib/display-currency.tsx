'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import useSWR from 'swr';
import type { Currency } from './types';

export const DISPLAY_CURRENCIES: Currency[] = ['GBP', 'USD', 'EUR', 'CAD', 'SGD'];

const SYMBOLS: Record<string, string> = {
  GBP: '£', USD: '$', EUR: '€', CAD: 'C$', SGD: 'S$',
};

// Fetches through our own API route (server-side) so no CORS/network issues
const rateFetcher = (url: string) =>
  fetch(url).then((r) => r.json()) as Promise<Record<string, number>>;

interface DisplayCurrencyCtx {
  currency: Currency;
  rates: Record<string, number>; // GBP → X
  setCurrency: (c: Currency) => void;
  symbol: string;
  loading: boolean;
  displayCurrencies: Currency[];
}

const DisplayCurrencyContext = createContext<DisplayCurrencyCtx>({
  currency: 'GBP',
  rates: {},
  setCurrency: () => {},
  symbol: '£',
  loading: false,
  displayCurrencies: DISPLAY_CURRENCIES,
});

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyRaw] = useState<Currency>('GBP');

  const { data: rates = {}, isLoading } = useSWR('/api/fx-rates', rateFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 3_600_000,
  });

  // Restore preference from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('displayCurrency') as Currency | null;
      if (saved && DISPLAY_CURRENCIES.includes(saved)) setCurrencyRaw(saved);
    } catch {}
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyRaw(c);
    try { localStorage.setItem('displayCurrency', c); } catch {}
  };

  return (
    <DisplayCurrencyContext.Provider
      value={{ currency, rates, setCurrency, symbol: SYMBOLS[currency] ?? '£', loading: isLoading, displayCurrencies: DISPLAY_CURRENCIES }}
    >
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency() {
  return useContext(DisplayCurrencyContext);
}

// ── Pure conversion helpers — call these in components with context values ────

export function fxConvert(
  gbpAmount: number,
  currency: Currency,
  rates: Record<string, number>
): number {
  if (currency === 'GBP') return gbpAmount;
  const rate = rates[currency];
  return rate ? gbpAmount * rate : gbpAmount;
}

export function fxFormat(
  gbpAmount: number,
  currency: Currency,
  rates: Record<string, number>,
  compact = false
): string {
  const v = fxConvert(gbpAmount, currency, rates);
  const sym = SYMBOLS[currency] ?? '£';
  if (compact) {
    const abs = Math.abs(v);
    const sign = v < 0 ? '−' : '';
    if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)     return `${sign}${sym}${Math.round(abs / 1_000)}k`;
    return `${sign}${sym}${Math.round(abs)}`;
  }
  return `${v < 0 ? '−' : ''}${sym}${new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(v))}`;
}
