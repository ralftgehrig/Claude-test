'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Account } from '@/lib/types';

interface HistoryRow {
  snapshot_date: string;
  balance: string;
  contribution_amount: string;
  notes: string;
}

interface HistoryEntryFormProps {
  account: Account;
  onSubmit: (rows: HistoryRow[]) => Promise<void>;
  onCancel: () => void;
}

export default function HistoryEntryForm({ account, onSubmit, onCancel }: HistoryEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<HistoryRow[]>([
    { snapshot_date: '', balance: '', contribution_amount: '', notes: '' },
  ]);

  const addRow = () =>
    setRows((p) => [...p, { snapshot_date: '', balance: '', contribution_amount: '', notes: '' }]);

  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i));

  const updateRow = (i: number, key: keyof HistoryRow, value: string) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = rows.filter((r) => r.snapshot_date && r.balance);
    if (!valid.length) return;
    setLoading(true);
    try {
      await onSubmit(valid);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-3 text-sm">
        <p className="font-medium text-gray-900">{account.name}</p>
        <p className="text-gray-500">{account.provider} · {account.currency}</p>
        <p className="text-xs text-gray-400 mt-1">Enter historic balance snapshots — oldest first or any order. Contributions = how much you added since the previous entry.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-2">Date</th>
              <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-2">Balance ({account.currency})</th>
              <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-2">Contributions</th>
              <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-2">Notes</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="pr-2 pb-2">
                  <input className="input text-xs py-1.5 w-32" type="date" value={row.snapshot_date} onChange={(e) => updateRow(i, 'snapshot_date', e.target.value)} required />
                </td>
                <td className="pr-2 pb-2">
                  <input className="input text-xs py-1.5 w-28" type="number" step="0.01" value={row.balance} onChange={(e) => updateRow(i, 'balance', e.target.value)} placeholder="0.00" required />
                </td>
                <td className="pr-2 pb-2">
                  <input className="input text-xs py-1.5 w-28" type="number" step="0.01" value={row.contribution_amount} onChange={(e) => updateRow(i, 'contribution_amount', e.target.value)} placeholder="0.00" />
                </td>
                <td className="pr-2 pb-2">
                  <input className="input text-xs py-1.5 w-28" value={row.notes} onChange={(e) => updateRow(i, 'notes', e.target.value)} placeholder="optional" />
                </td>
                <td className="pb-2">
                  {rows.length > 1 && (
                    <button type="button" className="btn-danger p-1.5" onClick={() => removeRow(i)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="btn-secondary text-xs w-full" onClick={addRow}>
        <Plus className="w-3.5 h-3.5" /> Add another date
      </button>

      <div className="flex gap-2 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Saving…' : `Save ${rows.filter(r => r.snapshot_date && r.balance).length} snapshot(s)`}
        </button>
      </div>
    </form>
  );
}
