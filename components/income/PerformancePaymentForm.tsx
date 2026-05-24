'use client';

import { useState } from 'react';
import { todayISO } from '@/lib/utils';
import type { IncomeSource, Currency } from '@/lib/types';
import { CURRENCIES } from '@/lib/types';

interface PerformancePaymentFormProps {
  source: IncomeSource;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export default function PerformancePaymentForm({ source, onSubmit, onCancel }: PerformancePaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    payment_date: todayISO(),
    target_amount: '',
    actual_amount: '',
    currency: source.currency as Currency,
    notes: '',
  });

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        income_source_id: source.id,
        payment_date: form.payment_date,
        target_amount: form.target_amount ? parseFloat(form.target_amount) : null,
        actual_amount: parseFloat(form.actual_amount),
        currency: form.currency,
        notes: form.notes || null,
      });
    } finally {
      setLoading(false);
    }
  };

  const pct =
    form.target_amount && form.actual_amount
      ? ((parseFloat(form.actual_amount) / parseFloat(form.target_amount)) * 100).toFixed(0)
      : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-3 text-sm">
        <p className="font-medium text-gray-900">{source.name}</p>
        <p className="text-gray-500">{source.employer} · Record actual payment vs target</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Payment date</label>
          <input className="input" type="date" value={form.payment_date} onChange={(e) => set('payment_date', e.target.value)} required />
        </div>
        <div>
          <label className="label">Currency</label>
          <select className="input" value={form.currency} onChange={(e) => set('currency', e.target.value as Currency)}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Target / maximum ({form.currency})</label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={form.target_amount}
            onChange={(e) => set('target_amount', e.target.value)}
            placeholder="What you could have earned"
          />
        </div>
        <div>
          <label className="label">Actual received ({form.currency})</label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={form.actual_amount}
            onChange={(e) => set('actual_amount', e.target.value)}
            placeholder="What you actually got"
            required
          />
        </div>
      </div>

      {pct !== null && (
        <div
          className={`rounded-xl px-3 py-2 text-sm font-medium ${
            parseInt(pct) >= 100
              ? 'bg-green-50 text-green-700'
              : parseInt(pct) >= 75
              ? 'bg-amber-50 text-amber-700'
              : 'bg-red-50 text-red-600'
          }`}
        >
          You received {pct}% of target
        </div>
      )}

      <div>
        <label className="label">Notes</label>
        <input
          className="input"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="e.g. Q4 2024 performance bonus"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Saving…' : 'Record payment'}
        </button>
      </div>
    </form>
  );
}
