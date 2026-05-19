'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { Lightbulb, TrendingUp, TrendingDown, Info } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { ReturnAnalysis } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function InsightsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const queryStr = new URLSearchParams({ ...(from && { from }), ...(to && { to }) }).toString();
  const { data: analyses = [], isLoading } = useSWR<ReturnAnalysis[]>(
    `/api/insights?${queryStr}`,
    fetcher
  );

  const validAnalyses = analyses.filter(
    (a) => a && a.start_balance_gbp !== undefined
  );

  const totalGrowth = validAnalyses.reduce((s, a) => s + a.total_growth_gbp, 0);
  const totalContribs = validAnalyses.reduce((s, a) => s + a.total_contributions_gbp, 0);
  const totalEndBalance = validAnalyses.reduce((s, a) => s + a.end_balance_gbp, 0);

  const chartData = validAnalyses
    .filter((a) => Math.abs(a.end_balance_gbp) > 100)
    .sort((a, b) => b.end_balance_gbp - a.end_balance_gbp)
    .map((a) => ({
      name: a.account_name.length > 18 ? a.account_name.slice(0, 16) + '…' : a.account_name,
      fullName: a.account_name,
      contributions: Math.max(0, a.total_contributions_gbp),
      growth: a.total_growth_gbp,
      annualised: a.annualised_return * 100,
    }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Investment return vs. contributions — see where your growth really comes from
        </p>
      </div>

      {/* Date range filter */}
      <div className="card">
        <p className="text-sm font-semibold text-gray-900 mb-3">Analysis period</p>
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex-1 w-full">
            <label className="label">From</label>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex-1 w-full">
            <label className="label">To</label>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex-1 w-full sm:pt-6">
            <button
              className="btn-secondary w-full"
              onClick={() => { setFrom(''); setTo(''); }}
            >
              Clear (all time)
            </button>
          </div>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-400 text-center py-8">Analysing returns…</p>
      )}

      {!isLoading && validAnalyses.length === 0 && (
        <EmptyState
          icon={Lightbulb}
          title="Not enough data yet"
          description="You need at least two balance snapshots per account and contributions recorded to calculate investment returns."
        />
      )}

      {validAnalyses.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card">
              <p className="card-title">Total end balance</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalEndBalance)}</p>
            </div>
            <div className="card">
              <p className="card-title">Investment growth</p>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${totalGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {totalGrowth >= 0 ? '+' : ''}{formatCurrency(totalGrowth)}
                </p>
                {totalGrowth >= 0
                  ? <TrendingUp className="w-5 h-5 text-green-500" />
                  : <TrendingDown className="w-5 h-5 text-red-400" />}
              </div>
              <p className="text-xs text-gray-400 mt-1">What the market earned you</p>
            </div>
            <div className="card">
              <p className="card-title">Your contributions</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalContribs)}</p>
              <p className="text-xs text-gray-400 mt-1">What you put in</p>
            </div>
          </div>

          {/* Stacked bar: contributions vs growth per account */}
          {chartData.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <p className="text-sm font-semibold text-gray-900">Contributions vs. investment growth by account</p>
                <div className="group relative">
                  <Info className="w-4 h-4 text-gray-300" />
                  <div className="absolute left-6 top-0 hidden group-hover:block bg-gray-800 text-white text-xs rounded-lg p-2 w-52 z-10">
                    Growth = balance change minus your contributions. Calculated using Modified Dietz method.
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 48)}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v, 'GBP', true)} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={120} />
                  <Tooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'contributions' ? 'Contributions' : 'Investment growth']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} formatter={(v) => v === 'contributions' ? 'Contributions' : 'Investment growth'} />
                  <Bar dataKey="contributions" name="contributions" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="growth" name="growth" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.growth >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Per-account return table */}
          <div className="card">
            <p className="text-sm font-semibold text-gray-900 mb-3">Return breakdown by account</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 pb-2">Account</th>
                    <th className="text-right text-xs font-medium text-gray-500 pb-2">End balance</th>
                    <th className="text-right text-xs font-medium text-gray-500 pb-2">Contributions</th>
                    <th className="text-right text-xs font-medium text-gray-500 pb-2">Growth</th>
                    <th className="text-right text-xs font-medium text-gray-500 pb-2">Ann. return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {validAnalyses
                    .sort((a, b) => b.end_balance_gbp - a.end_balance_gbp)
                    .map((a) => (
                      <tr key={a.account_id}>
                        <td className="py-2.5 font-medium text-gray-900">{a.account_name}</td>
                        <td className="py-2.5 text-right text-gray-700">{formatCurrency(a.end_balance_gbp)}</td>
                        <td className="py-2.5 text-right text-blue-600">{formatCurrency(a.total_contributions_gbp)}</td>
                        <td className={`py-2.5 text-right font-medium ${a.total_growth_gbp >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {a.total_growth_gbp >= 0 ? '+' : ''}{formatCurrency(a.total_growth_gbp)}
                        </td>
                        <td className={`py-2.5 text-right font-semibold ${a.annualised_return >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {formatPercent(a.annualised_return)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info box about Vanguard */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Tracking Vanguard returns accurately</p>
                <p className="text-blue-700">
                  Each time you update your Vanguard balance, enter the contributions you made since the last update
                  separately. This app will then calculate how much of your growth came from fund returns vs. your
                  monthly investments — something Vanguard&apos;s own app doesn&apos;t show you.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
