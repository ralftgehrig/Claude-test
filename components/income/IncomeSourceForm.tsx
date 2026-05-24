'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { FamilyMember, IncomeType, IncomeFrequency, Currency, IncomeSource } from '@/lib/types';
import { INCOME_TYPE_LABELS, CURRENCIES } from '@/lib/types';

interface VestingRow {
  vest_date: string;
  shares: string;
  grant_price: string;
  estimated_value_per_share: string;
  currency: Currency;
  is_vested: boolean;
}

interface IncomeSourceFormProps {
  members: FamilyMember[];
  source?: IncomeSource; // present = edit mode
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export default function IncomeSourceForm({ members, source, onSubmit, onCancel }: IncomeSourceFormProps) {
  const isEdit = !!source;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    family_member_id: source?.family_member_id ?? members[0]?.id ?? '',
    name: source?.name ?? '',
    employer: source?.employer ?? '',
    income_type: (source?.income_type ?? 'salary') as IncomeType,
    frequency: (source?.frequency ?? 'monthly') as IncomeFrequency,
    gross_amount: source?.gross_amount?.toString() ?? '',
    currency: (source?.currency ?? 'GBP') as Currency,
    start_date: source?.start_date ?? '',
    end_date: source?.end_date ?? '',
    notes: source?.notes ?? '',
  });
  const [vestingRows, setVestingRows] = useState<VestingRow[]>(
    source?.vesting_events?.map((v) => ({
      vest_date: v.vest_date,
      shares: v.shares.toString(),
      grant_price: v.grant_price?.toString() ?? '',
      estimated_value_per_share: v.estimated_value_per_share?.toString() ?? '',
      currency: v.currency,
      is_vested: v.is_vested,
    })) ?? []
  );
  const isRSU = form.income_type === 'rsu' || form.income_type === 'espp';

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const addVestingRow = () =>
    setVestingRows((p) => [
      ...p,
      { vest_date: '', shares: '', grant_price: '', estimated_value_per_share: '', currency: 'USD', is_vested: false },
    ]);

  const updateVesting = (i: number, key: keyof VestingRow, value: string | boolean) => {
    setVestingRows((p) =>
      p.map((r, idx) => {
        if (idx !== i) return r;
        const updated = { ...r, [key]: value };
        // Auto-detect past dates and set is_vested
        if (key === 'vest_date' && typeof value === 'string' && value) {
          const isPast = new Date(value) < new Date();
          updated.is_vested = isPast;
        }
        return updated;
      })
    );
  };

  const removeVesting = (i: number) => setVestingRows((p) => p.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        gross_amount: form.gross_amount ? parseFloat(form.gross_amount) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        employer: form.employer || null,
        notes: form.notes || null,
      };

      if (isRSU && vestingRows.length > 0) {
        payload.vesting_events = vestingRows.map((r) => ({
          vest_date: r.vest_date,
          shares: parseFloat(r.shares),
          grant_price: r.grant_price ? parseFloat(r.grant_price) : null,
          estimated_value_per_share: r.estimated_value_per_share
            ? parseFloat(r.estimated_value_per_share)
            : null,
          currency: r.currency,
          is_vested: r.is_vested,
          total_estimated_value:
            r.shares && r.estimated_value_per_share
              ? parseFloat(r.shares) * parseFloat(r.estimated_value_per_share)
              : null,
        }));
      }

      await onSubmit(payload);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Family member</label>
          <select className="input" value={form.family_member_id} onChange={(e) => set('family_member_id', e.target.value)} required>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Income type</label>
          <select className="input" value={form.income_type} onChange={(e) => set('income_type', e.target.value as IncomeType)}>
            {Object.entries(INCOME_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Name / description</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Infosys RSU Grant 2024" required />
        </div>
        <div>
          <label className="label">Employer</label>
          <input className="input" value={form.employer} onChange={(e) => set('employer', e.target.value)} placeholder="e.g. Infosys" />
        </div>
      </div>

      {!isRSU && (
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="label">Gross amount</label>
            <input className="input" type="number" step="0.01" value={form.gross_amount} onChange={(e) => set('gross_amount', e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={form.currency} onChange={(e) => set('currency', e.target.value as Currency)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      )}

      {!isRSU && (
        <div>
          <label className="label">Frequency</label>
          <select className="input" value={form.frequency} onChange={(e) => set('frequency', e.target.value as IncomeFrequency)}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
            <option value="one_off">One-off</option>
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start date</label>
          <input className="input" type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
        </div>
        <div>
          <label className="label">End date</label>
          <input className="input" type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
        </div>
      </div>

      {/* RSU vesting schedule */}
      {isRSU && (
        <div className="border border-gray-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Vesting schedule</p>
            <button type="button" className="btn-secondary text-xs" onClick={addVestingRow}>
              <Plus className="w-3.5 h-3.5" /> Add vest
            </button>
          </div>

          {vestingRows.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">
              Add vesting dates for each tranche
            </p>
          )}

          {vestingRows.map((row, i) => (
            <div key={i} className="grid grid-cols-6 gap-2 items-end">
              <div className="col-span-2">
                <label className="text-xs text-gray-500">Vest date</label>
                <input
                  className="input text-xs py-1.5"
                  type="date"
                  value={row.vest_date}
                  onChange={(e) => updateVesting(i, 'vest_date', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Shares</label>
                <input
                  className="input text-xs py-1.5"
                  type="number"
                  value={row.shares}
                  onChange={(e) => updateVesting(i, 'shares', e.target.value)}
                  placeholder="100"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Est. price</label>
                <input
                  className="input text-xs py-1.5"
                  type="number"
                  step="0.01"
                  value={row.estimated_value_per_share}
                  onChange={(e) => updateVesting(i, 'estimated_value_per_share', e.target.value)}
                  placeholder="$20"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Currency</label>
                <select
                  className="input text-xs py-1.5"
                  value={row.currency}
                  onChange={(e) => updateVesting(i, 'currency', e.target.value as Currency)}
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    id={`vested-${i}`}
                    checked={row.is_vested}
                    onChange={(e) => updateVesting(i, 'is_vested', e.target.checked)}
                    className="rounded border-gray-300 w-3 h-3"
                  />
                  <label htmlFor={`vested-${i}`} className="text-xs text-gray-500">Vested?</label>
                </div>
                <button type="button" className="btn-danger p-1.5" onClick={() => removeVesting(i)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="label">Notes</label>
        <input className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any additional details" />
      </div>

      <div className="flex gap-2 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Add income source'}
        </button>
      </div>
    </form>
  );
}
