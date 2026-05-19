'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Plus, TrendingUp, Calendar, CheckCircle2, Clock } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import IncomeSourceForm from '@/components/income/IncomeSourceForm';
import EmptyState from '@/components/ui/EmptyState';
import { formatCurrency, formatDate, groupBy } from '@/lib/utils';
import { INCOME_TYPE_LABELS } from '@/lib/types';
import type { IncomeSource, FamilyMember, VestingEvent } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: '/month',
  quarterly: '/quarter',
  annual: '/year',
  one_off: 'one-off',
  on_vesting: 'on vesting',
};

export default function IncomePage() {
  const { data: incomeSources = [] } = useSWR<IncomeSource[]>('/api/income', fetcher);
  const { data: members = [] } = useSWR<FamilyMember[]>('/api/family-members', fetcher);
  const { data: upcomingVests = [] } = useSWR<VestingEvent[]>('/api/vesting?upcoming=true', fetcher);

  const [showAdd, setShowAdd] = useState(false);
  const [markingVest, setMarkingVest] = useState<VestingEvent | null>(null);
  const [vestActual, setVestActual] = useState({ actual_value: '', tax_withheld: '' });

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  const handleAddIncome = async (data: Record<string, unknown>) => {
    await fetch('/api/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await mutate('/api/income');
    await mutate('/api/vesting?upcoming=true');
    setShowAdd(false);
  };

  const handleMarkVested = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markingVest) return;
    const actualValue = parseFloat(vestActual.actual_value);
    const taxWithheld = vestActual.tax_withheld ? parseFloat(vestActual.tax_withheld) : 0;
    await fetch('/api/vesting', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: markingVest.id,
        is_vested: true,
        actual_value: actualValue,
        tax_withheld: taxWithheld,
        net_proceeds: actualValue - taxWithheld,
      }),
    });
    await mutate('/api/vesting?upcoming=true');
    await mutate('/api/income');
    setMarkingVest(null);
    setVestActual({ actual_value: '', tax_withheld: '' });
  };

  // Annual income totals per person
  const annualByMember: Record<string, number> = {};
  for (const src of incomeSources) {
    if (!src.is_active || !src.gross_amount) continue;
    const gbp = src.currency === 'GBP' ? src.gross_amount : src.gross_amount; // simplified
    const annual =
      src.frequency === 'monthly' ? gbp * 12
        : src.frequency === 'quarterly' ? gbp * 4
        : src.frequency === 'annual' ? gbp
        : 0;
    annualByMember[src.family_member_id] = (annualByMember[src.family_member_id] ?? 0) + annual;
  }

  // Upcoming vestings sorted by date
  const sortedVests = [...upcomingVests].sort(
    (a, b) => new Date(a.vest_date).getTime() - new Date(b.vest_date).getTime()
  );

  const totalUpcomingVestValue = sortedVests.reduce(
    (s, v) => s + (v.total_estimated_value ?? 0),
    0
  );

  const byMember = groupBy(incomeSources, (s) => s.family_member_id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Income</h1>
          <p className="text-sm text-gray-500 mt-0.5">Salaries, bonuses, RSUs and more</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Add source
        </button>
      </div>

      {/* Upcoming vesting */}
      {sortedVests.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="card-title mb-0">Upcoming vestings</p>
            {totalUpcomingVestValue > 0 && (
              <span className="badge badge-amber">
                ~{formatCurrency(totalUpcomingVestValue, 'USD', true)} est.
              </span>
            )}
          </div>
          <div className="space-y-2">
            {sortedVests.slice(0, 6).map((vest) => {
              const src = (vest as VestingEvent & { income_source?: IncomeSource }).income_source;
              const member = src ? memberMap[src.family_member_id] : null;
              const isPast = new Date(vest.vest_date) < new Date();
              return (
                <div
                  key={vest.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-amber-50 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPast ? 'bg-amber-100' : 'bg-blue-50'}`}>
                    {isPast ? (
                      <Clock className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Calendar className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{src?.name}</p>
                    <p className="text-xs text-gray-500">
                      {vest.shares.toLocaleString()} shares · {formatDate(vest.vest_date)}
                      {member && ` · ${member.name}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {vest.total_estimated_value && (
                      <p className="text-sm font-semibold text-gray-900">
                        ~{formatCurrency(vest.total_estimated_value, vest.currency)}
                      </p>
                    )}
                    <button
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium mt-0.5"
                      onClick={() => { setMarkingVest(vest); setVestActual({ actual_value: vest.total_estimated_value?.toString() ?? '', tax_withheld: '' }); }}
                    >
                      Mark vested
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Income sources by member */}
      {incomeSources.length === 0 && (
        <EmptyState
          icon={TrendingUp}
          title="No income sources yet"
          description="Add salary, bonuses, RSU grants, rental income — anything that flows to your family."
          action={
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> Add first source
            </button>
          }
        />
      )}

      {members.map((member) => {
        const sources = byMember[member.id] ?? [];
        if (!sources.length) return null;
        const annualGBP = annualByMember[member.id] ?? 0;

        return (
          <div key={member.id} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: member.color }}
                >
                  {member.name[0]}
                </div>
                <p className="text-sm font-semibold text-gray-900">{member.name}</p>
              </div>
              {annualGBP > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-400">Est. annual</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(annualGBP)}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {sources.map((src) => {
                const vestCount = src.vesting_events?.filter((v) => !v.is_vested).length ?? 0;
                return (
                  <div key={src.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100">
                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${src.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{src.name}</p>
                        <span className="badge badge-blue">
                          {INCOME_TYPE_LABELS[src.income_type]}
                        </span>
                        {vestCount > 0 && (
                          <span className="badge badge-amber">{vestCount} vests pending</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {src.employer && `${src.employer} · `}
                        {src.gross_amount
                          ? `${formatCurrency(src.gross_amount, src.currency)} ${FREQUENCY_LABELS[src.frequency ?? 'monthly']}`
                          : 'See vesting schedule'}
                        {src.start_date && ` · from ${formatDate(src.start_date, 'MMM yyyy')}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Modals */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add income source" size="lg">
        <IncomeSourceForm members={members} onSubmit={handleAddIncome} onCancel={() => setShowAdd(false)} />
      </Modal>

      <Modal open={!!markingVest} onClose={() => setMarkingVest(null)} title="Mark as vested">
        {markingVest && (
          <form onSubmit={handleMarkVested} className="space-y-4">
            <div className="bg-amber-50 rounded-xl p-3 text-sm">
              <p className="font-medium">{markingVest.shares.toLocaleString()} shares</p>
              <p className="text-gray-500">Vest date: {formatDate(markingVest.vest_date)}</p>
            </div>
            <div>
              <label className="label">Actual total value ({markingVest.currency})</label>
              <input className="input" type="number" step="0.01" value={vestActual.actual_value} onChange={(e) => setVestActual((p) => ({ ...p, actual_value: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Tax withheld ({markingVest.currency})</label>
              <input className="input" type="number" step="0.01" value={vestActual.tax_withheld} onChange={(e) => setVestActual((p) => ({ ...p, tax_withheld: e.target.value }))} placeholder="0" />
            </div>
            {vestActual.actual_value && (
              <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                Net proceeds: {formatCurrency(
                  parseFloat(vestActual.actual_value) - (parseFloat(vestActual.tax_withheld) || 0),
                  markingVest.currency
                )}
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setMarkingVest(null)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1">
                <CheckCircle2 className="w-4 h-4" /> Mark vested
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
