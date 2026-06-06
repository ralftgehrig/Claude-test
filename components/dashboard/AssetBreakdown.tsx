'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { CATEGORY_COLORS } from '@/lib/types';
import { useDisplayCurrency } from '@/lib/display-currency';
import type { AssetCategory } from '@/lib/types';

interface AssetBreakdownProps {
  byCategory: Partial<Record<AssetCategory, number>>;
  totalGBP: number;
}

const LABELS: Record<AssetCategory, string> = {
  equity: 'Equity',
  pension: 'Pension',
  property: 'Property',
  cash: 'Cash',
  crypto: 'Crypto',
  debt: 'Debt',
};

export default function AssetBreakdown({ byCategory, totalGBP }: AssetBreakdownProps) {
  const { mask } = useDisplayCurrency();

  const data = Object.entries(byCategory)
    .filter(([, v]) => v && Math.abs(v) > 0)
    .map(([cat, value]) => ({
      name: LABELS[cat as AssetCategory] ?? cat,
      value: Math.abs(value!),
      rawValue: value!,
      cat: cat as AssetCategory,
    }))
    .sort((a, b) => b.value - a.value);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        No data yet — add accounts and balances
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.cat} fill={CATEGORY_COLORS[entry.cat]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => mask(formatCurrency(value))}
            contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', fontSize: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex-1 space-y-2 w-full">
        {data.map((entry) => (
          <div key={entry.cat} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: CATEGORY_COLORS[entry.cat] }}
            />
            <span className="text-xs text-gray-600 flex-1">{entry.name}</span>
            <span className="text-xs font-medium text-gray-900">
              {mask(formatCurrency(entry.rawValue, 'GBP', true))}
            </span>
            <span className="text-xs text-gray-400 w-12 text-right">
              {totalGBP > 0 ? mask(formatPercent(Math.abs(entry.rawValue) / totalGBP, 0)) : '–'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
