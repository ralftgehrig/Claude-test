'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { BarChart3, Plus, Trash2, Zap, Target, Edit2 } from 'lucide-react';
import ProjectionChart from '@/components/projections/ProjectionChart';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { runProjection } from '@/lib/calculations/projections';
import { computeNetWorth } from '@/lib/calculations/net-worth';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { ACCOUNT_CATEGORY } from '@/lib/types';
import type {
  Account, BalanceSnapshot, FamilyMember, Scenario,
  ScenarioAssumptions, ProjectionResult, AssetCategory, ProjectionEvent
} from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const EVENT_TYPE_LABELS: Record<string, string> = {
  inheritance: 'Inheritance',
  education: 'Education cost',
  property: 'Property',
  income_change: 'Income change',
  retirement: 'Retirement',
  custom: 'Custom event',
};

export default function ProjectionsPage() {
  const { data: accounts = [] } = useSWR<Account[]>('/api/accounts', fetcher);
  const { data: members = [] } = useSWR<FamilyMember[]>('/api/family-members', fetcher);
  const { data: scenarios = [] } = useSWR<Scenario[]>('/api/scenarios', fetcher);

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [editingAssumptions, setEditingAssumptions] = useState<ScenarioAssumptions | null>(null);
  const [projResult, setProjResult] = useState<ProjectionResult | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareResults, setCompareResults] = useState<{ name: string; data: ProjectionResult; color: string }[]>([]);
  const [showNewScenario, setShowNewScenario] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');

  const baseline = scenarios.find((s) => s.is_baseline);
  const selected = scenarios.find((s) => s.id === selectedScenarioId) ?? baseline ?? scenarios[0];

  // Build current portfolio
  const portfolio = useMemo(() => {
    if (!accounts.length) return null;
    const latestSnaps: Record<string, BalanceSnapshot> = {};
    for (const a of accounts) {
      if (a.latest_snapshot) latestSnaps[a.id] = a.latest_snapshot as BalanceSnapshot;
    }
    const nw = computeNetWorth(accounts, latestSnaps);
    const byCategory: Partial<Record<AssetCategory, number>> = {};
    for (const [cat, val] of Object.entries(nw.by_category) as [AssetCategory, number][]) {
      byCategory[cat] = val;
    }
    const self = members.find((m) => m.relationship === 'self');
    return {
      byCategory,
      totalGBP: nw.total_gbp,
      selfDobYear: self?.date_of_birth ? new Date(self.date_of_birth).getFullYear() : undefined,
    };
  }, [accounts, members]);

  // Run projection when scenario or portfolio changes
  useEffect(() => {
    if (!selected || !portfolio) return;
    const result = runProjection(portfolio, selected.assumptions);
    setProjResult(result);
    setEditingAssumptions(selected.assumptions);
  }, [selected, portfolio]);

  // Comparison runs
  useEffect(() => {
    if (!portfolio || !compareIds.length) {
      setCompareResults([]);
      return;
    }
    const COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
    const results = compareIds.map((id, i) => {
      const sc = scenarios.find((s) => s.id === id);
      if (!sc) return null;
      const result = runProjection(portfolio, sc.assumptions);
      return { name: sc.name, data: result, color: COLORS[i % COLORS.length] };
    }).filter(Boolean) as { name: string; data: ProjectionResult; color: string }[];
    setCompareResults(results);
  }, [compareIds, portfolio, scenarios]);

  const handleSaveAssumptions = async () => {
    if (!selected || !editingAssumptions) return;
    await fetch(`/api/scenarios/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assumptions: editingAssumptions }),
    });
    await mutate('/api/scenarios');
  };

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    const base = baseline ?? scenarios[0];
    if (!base) return;
    await fetch('/api/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newScenarioName,
        description: '',
        is_baseline: false,
        assumptions: base.assumptions,
      }),
    });
    await mutate('/api/scenarios');
    setShowNewScenario(false);
    setNewScenarioName('');
  };

  const updateReturn = (key: string, value: string) => {
    if (!editingAssumptions) return;
    setEditingAssumptions({
      ...editingAssumptions,
      returns: { ...editingAssumptions.returns, [key]: parseFloat(value) / 100 },
    });
  };

  const addEvent = () => {
    if (!editingAssumptions) return;
    const newEvent: ProjectionEvent = { year: 10, amount: 100000, label: 'New event', type: 'custom' };
    setEditingAssumptions({ ...editingAssumptions, events: [...editingAssumptions.events, newEvent] });
  };

  const updateEvent = (i: number, key: keyof ProjectionEvent, value: string | number) => {
    if (!editingAssumptions) return;
    const events = editingAssumptions.events.map((e, idx) =>
      idx === i ? { ...e, [key]: key === 'amount' || key === 'year' ? Number(value) : value } : e
    );
    setEditingAssumptions({ ...editingAssumptions, events });
  };

  const removeEvent = (i: number) => {
    if (!editingAssumptions) return;
    setEditingAssumptions({
      ...editingAssumptions,
      events: editingAssumptions.events.filter((_, idx) => idx !== i),
    });
  };

  if (!portfolio) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No portfolio data"
        description="Add accounts and update balances first to run projections."
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projections</h1>
          <p className="text-sm text-gray-500 mt-0.5">Scenario modelling for your financial future</p>
        </div>
        <button className="btn-secondary" onClick={() => setShowNewScenario(true)}>
          <Plus className="w-4 h-4" /> New scenario
        </button>
      </div>

      {/* Scenario selector */}
      <div className="flex flex-wrap gap-2">
        {scenarios.map((sc) => (
          <button
            key={sc.id}
            onClick={() => setSelectedScenarioId(sc.id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              selected?.id === sc.id
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-primary-300'
            }`}
          >
            {sc.is_baseline && '⭐ '}{sc.name}
          </button>
        ))}
      </div>

      {/* Main projection chart */}
      {projResult && selected && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-base font-semibold text-gray-900">{selected.name}</p>
              <p className="text-xs text-gray-500">
                {selected.assumptions.horizon_years}-year projection · {formatCurrency(portfolio.totalGBP)} today
                {selected.assumptions.simulation_type === 'monte_carlo' && ' · Monte Carlo'}
              </p>
            </div>
            {selected.assumptions.simulation_type === 'monte_carlo' && (
              <span className="badge badge-purple">
                <Zap className="w-3 h-3" /> Monte Carlo
              </span>
            )}
          </div>

          <ProjectionChart
            data={projResult.data}
            isMonteCarlo={selected.assumptions.simulation_type === 'monte_carlo'}
            compareData={compareResults.map((c) => ({ name: c.name, data: c.data.data, color: c.color }))}
          />

          {/* Milestones */}
          {projResult.milestones.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {projResult.milestones.map((m) => (
                <div key={m.label} className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                  <Target className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">{m.label}</span>
                  <span className="text-xs text-green-600">in {m.year} years (age {m.age})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compare scenarios */}
      <div className="card">
        <p className="text-sm font-semibold text-gray-900 mb-3">Compare scenarios</p>
        <div className="flex flex-wrap gap-2">
          {scenarios.filter((s) => s.id !== selected?.id).map((sc) => {
            const isCompared = compareIds.includes(sc.id);
            return (
              <button
                key={sc.id}
                onClick={() => setCompareIds((p) => isCompared ? p.filter((id) => id !== sc.id) : [...p, sc.id])}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isCompared
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {isCompared ? '✓ ' : '+ '}{sc.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Assumptions editor */}
      {selected && editingAssumptions && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-900">Assumptions — {selected.name}</p>
            <button className="btn-primary text-xs" onClick={handleSaveAssumptions}>
              Save changes
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Projection horizon (years)</label>
              <input
                className="input"
                type="number"
                value={editingAssumptions.horizon_years}
                onChange={(e) => setEditingAssumptions((p) => p ? { ...p, horizon_years: parseInt(e.target.value) } : p)}
              />
            </div>
            <div>
              <label className="label">Monthly net savings (GBP)</label>
              <input
                className="input"
                type="number"
                value={editingAssumptions.monthly_net_savings}
                onChange={(e) => setEditingAssumptions((p) => p ? { ...p, monthly_net_savings: parseFloat(e.target.value) } : p)}
              />
            </div>
            <div>
              <label className="label">Savings growth rate (%/year)</label>
              <input
                className="input"
                type="number"
                step="0.1"
                value={(editingAssumptions.savings_growth_rate * 100).toFixed(1)}
                onChange={(e) => setEditingAssumptions((p) => p ? { ...p, savings_growth_rate: parseFloat(e.target.value) / 100 } : p)}
              />
            </div>
            <div>
              <label className="label">Inflation rate (%/year)</label>
              <input
                className="input"
                type="number"
                step="0.1"
                value={(editingAssumptions.inflation_rate * 100).toFixed(1)}
                onChange={(e) => setEditingAssumptions((p) => p ? { ...p, inflation_rate: parseFloat(e.target.value) / 100 } : p)}
              />
            </div>
          </div>

          {/* Return rates */}
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Annual returns (%)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(editingAssumptions.returns).map(([key, val]) => (
                <div key={key}>
                  <label className="label capitalize">{key}</label>
                  <input
                    className="input"
                    type="number"
                    step="0.5"
                    value={(val * 100).toFixed(1)}
                    onChange={(e) => updateReturn(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Simulation type */}
          <div className="mt-4">
            <label className="label">Simulation type</label>
            <div className="flex gap-2">
              {(['deterministic', 'monte_carlo'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setEditingAssumptions((p) => p ? { ...p, simulation_type: type } : p)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                    editingAssumptions.simulation_type === type
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {type === 'deterministic' ? 'Deterministic' : 'Monte Carlo'}
                </button>
              ))}
            </div>
            {editingAssumptions.simulation_type === 'monte_carlo' && (
              <div className="mt-2">
                <label className="label">Simulation runs</label>
                <input
                  className="input"
                  type="number"
                  value={editingAssumptions.monte_carlo_runs ?? 500}
                  onChange={(e) => setEditingAssumptions((p) => p ? { ...p, monte_carlo_runs: parseInt(e.target.value) } : p)}
                />
              </div>
            )}
          </div>

          {/* Life events */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Life events</p>
              <button className="btn-secondary text-xs" onClick={addEvent}>
                <Plus className="w-3 h-3" /> Add event
              </button>
            </div>
            {editingAssumptions.events.length === 0 && (
              <p className="text-xs text-gray-400 py-2">No events — add inheritance, education costs, retirement etc.</p>
            )}
            {editingAssumptions.events.map((event, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-end">
                <div>
                  <label className="text-xs text-gray-500">Year</label>
                  <input className="input text-xs py-1.5" type="number" value={event.year} onChange={(e) => updateEvent(i, 'year', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Label</label>
                  <input className="input text-xs py-1.5" value={event.label} onChange={(e) => updateEvent(i, 'label', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Amount (£)</label>
                  <input className="input text-xs py-1.5" type="number" value={event.amount} onChange={(e) => updateEvent(i, 'amount', e.target.value)} placeholder="+/−" />
                </div>
                <div className="flex gap-1">
                  <select className="input text-xs py-1.5 flex-1" value={event.type} onChange={(e) => updateEvent(i, 'type', e.target.value)}>
                    {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button className="btn-danger p-1.5" onClick={() => removeEvent(i)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New scenario modal */}
      <Modal open={showNewScenario} onClose={() => setShowNewScenario(false)} title="New scenario">
        <form onSubmit={handleCreateScenario} className="space-y-4">
          <div>
            <label className="label">Scenario name</label>
            <input className="input" value={newScenarioName} onChange={(e) => setNewScenarioName(e.target.value)} placeholder="e.g. Wife returns to work" required />
          </div>
          <p className="text-xs text-gray-500">Starts as a copy of the baseline — edit assumptions afterwards.</p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowNewScenario(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1">Create scenario</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
