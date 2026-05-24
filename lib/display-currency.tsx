'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Currency } from './types';
import { CURRENCY_SYMBOLS } from './currency';

const DISPLAY_CURRENCIES: Currency[] = ['GBP', 'USD', 'EUR', 'CAD', 'SGD'];

interface DisplayCurrencyState {
  currency: Currency;
  rates: Record<string, number>; // rates FROM GBP (GBP → X)
  setCurrency: (c: Currency) => void;
  convert: (gbpAmount: number) => number;
  format: (gbpAmount: number, compact?: boolean) => string;
  symbol: string;
  loading: boolean;
  displayCurrencies: Currency[];
}

const DisplayCurrencyContext = createContext<DisplayCurrencyState>({
  currency: 'GBP',
  rates: {},
  setCurrency: () => {},
  convert: (v) => v,
  format: (v) => `£${v.toFixed(0)}`,
  symbol: '£',
  loading: false,
  displayCurrencies: DISPLAY_CURRENCIES,
});

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('GBP');
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currency === 'GBP') return;
    setLoading(true);
    fetch(`https://api.frankfurter.app/latest?from=GBP&to=${DISPLAY_CURRENCIES.filter((c) => c !== 'GBP').join(',')}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.rates) setRates(data.rates);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currency]);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem('displayCurrency', c); } catch {}
  }, []);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('displayCurrency') as Currency | null;
      if (saved && DISPLAY_CURRENCIES.includes(saved)) setCurrencyState(saved);
    } catch {}
  }, []);

  const convert = useCallback(
    (gbpAmount: number) => {
      if (currency === 'GBP') return gbpAmount;
      const rate = rates[currency] ?? 1;
      return gbpAmount * rate;
    },
    [currency, rates]
  );

  const symbol = CURRENCY_SYMBOLS[currency] ?? '£';

  const format = useCallback(
    (gbpAmount: number, compact = false) => {
      const converted = convert(gbpAmount);
      const sym = symbol;
      if (compact) {
        const abs = Math.abs(converted);
        const sign = converted < 0 ? '−' : '';
        if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(1)}M`;
        if (abs >= 1_000) return `${sign}${sym}${(abs / 1_000).toFixed(0)}k`;
        return `${sign}${sym}${abs.toFixed(0)}`;
      }
      const formatted = new Intl.NumberFormat('en-GB', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.abs(converted));
      return `${converted < 0 ? '−' : ''}${sym}${formatted}`;
    },
    [convert, symbol]
  );

  return (
    <DisplayCurrencyContext.Provider
      value={{ currency, rates, setCurrency, convert, format, symbol, loading, displayCurrencies: DISPLAY_CURRENCIES }}
    >
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency() {
  return useContext(DisplayCurrencyContext);
}
