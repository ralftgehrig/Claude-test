'use client';

import { useState } from 'react';
import { todayISO } from '@/lib/utils';
import type { Account } from '@/lib/types';

interface BalanceUpdateFormProps {
  account: Account;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export default function BalanceUpdateForm({ account, onSubmit, onCancel }: BalanceUpdateFormProps) {
  const snap = account.latest_snapshot as { balance: number; snapshot_date: string } | null;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    balance: snap?.balance?.toString() ?? '',
    snapshot_date: todayISO(),
    contribution_amount: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        account_id: account.id,
        balance: parseFloat(form.balance),
        currency: account.currency,
        snapshot_date: form.snapshot_date,
        contribution_amount: form.contribution_amount ? parseFloat(form.contribution_amount) : undefined,
        notes: form.notes || undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-3 text-sm">
        <p className="font-medium text-gray-900">{account.name}</p>
        <p className="text-gray-500">{account.provider} · {account.currency}</p>
        {snap && (
          <p className="text-gray-400 text-xs mt-1">Last: {snap.balance.toLocaleString()} on {snap.snapshot_date}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Current balance ({account.currency})</label>
          <input
            className="input"
            type="number"
            step="0.01"
            value={form.balance}
            onChange={(e) => set('balance', e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className="label">Date</label>
          <input
            className="input"
            type="date"
            value={form.snapshot_date}
            onChange={(e) => set('snapshot_date', e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="label">
          Contributions since last update ({account.currency})
          <span className="text-gray-400 font-normal ml-1">— for return tracking</span>
        </label>
        <input
          className="input"
          type="number"
          step="0.01"
          value={form.contribution_amount}
          onChange={(e) => set('contribution_amount', e.target.value)}
          placeholder="0 if no new contributions"
        />
      </div>

      <div>
        <label className="label">Notes (optional)</label>
        <input className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. Quarterly update" />
      </div>

      <div className="flex gap-2 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Saving…' : 'Update balance'}
        </button>
      </div>
    </form>
  );
}
