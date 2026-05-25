'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import useSWR from 'swr';
import type { Currency } from './types';

const DISPLAY_CURRENCIES: Currency[] = ['GBP', 'USD', 'EUR', 'CAD', 'SGD'];

const SYMBOLS: Record<string, string> = {
  GBP: '£', USD: '$', EUR: '€', CAD: 'C$', SGD: 'S$',
};

// Fetch all rates from GBP once; SWR caches globally for the session
const RATES_URL = 'https://api.frankfurter.app/latest?from=GBP&to=USD,EUR,CAD,SGD';
const rateFetcher = (url: string) =>
  fetch(url).then((r) => r.json()).then((d) => (d?.rates ?? {}) as Record<string, number>);

interface DisplayCurrencyCtx {
  currency: Currency;
  rates: Record<string, number>;
  setCurrency: (c: Currency) => void;
  convert: (gbpAmount: number) => number;
  format: (gbpAmount: number, compact?: boolean) => string;
  symbol: string;
  loading: boolean;
  displayCurrencies: Currency[];
}

const DisplayCurrencyContext = createContext<DisplayCurrencyCtx>({
  currency: 'GBP',
  rates: {},
  setCurrency: () => {},
  convert: (v) => v,
  format: (v) => `£${Math.round(v).toLocaleString('en-GB')}`,
  symbol: '£',
  loading: false,
  displayCurrencies: DISPLAY_CURRENCIES,
});

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyRaw] = useState<Currency>('GBP');

  // SWR fetches once on mount, caches, handles errors cleanly
  const { data: rates = {}, isLoading } = useSWR(RATES_URL, rateFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 3_600_000, // 1 hour
  });

  // Restore saved preference on mount
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

  // Inline — no useCallback so closures are always fresh
  const convert = (gbpAmount: number): number => {
    if (currency === 'GBP') return gbpAmount;
    const rate = rates[currency];
    if (!rate) return gbpAmount; // rates not yet loaded
    return gbpAmount * rate;
  };

  const symbol = SYMBOLS[currency] ?? '£';

  const format = (gbpAmount: number, compact = false): string => {
    const v = convert(gbpAmount);
    const sym = symbol;
    if (compact) {
      const abs = Math.abs(v);
      const sign = v < 0 ? '−' : '';
      if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000)     return `${sign}${sym}${(abs / 1_000).toFixed(0)}k`;
      return `${sign}${sym}${Math.round(abs)}`;
    }
    return `${v < 0 ? '−' : ''}${sym}${new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(v))}`;
  };

  return (
    <DisplayCurrencyContext.Provider
      value={{
        currency,
        rates,
        setCurrency,
        convert,
        format,
        symbol,
        loading: isLoading,
        displayCurrencies: DISPLAY_CURRENCIES,
      }}
    >
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency() {
  return useContext(DisplayCurrencyContext);
}
