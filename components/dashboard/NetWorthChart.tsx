'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { useDisplayCurrency } from '@/lib/display-currency';

interface DataPoint {
  date: string;
  total: number;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
}) => {
  const { mask } = useDisplayCurrency();
  if (!active || !payload?.length || !label) return null;
  return (
    <div
      className="px-4 py-3 rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        border: '0.5px solid rgba(60,60,67,0.12)',
      }}
    >
      <p className="text-[11px] font-medium mb-1" style={{ color: '#8E8E93' }}>
        {format(new Date(label), 'MMMM yyyy')}
      </p>
      <p className="text-[15px] font-bold" style={{ color: '#1C1C1E' }}>
        {mask(formatCurrency(payload[0].value))}
      </p>
    </div>
  );
};

export default function NetWorthChart({ data }: { data: DataPoint[] }) {
  const { privacyMode } = useDisplayCurrency();

  // Convert to numeric timestamps so Recharts spaces points by real elapsed time
  const points = data.map((d) => ({
    ts: parseISO(d.date).getTime(),
    total: d.total,
  }));

  const min = Math.min(...points.map((d) => d.total));
  const max = Math.max(...points.map((d) => d.total));
  const padding = (max - min) * 0.08;

  const tsMin = points[0]?.ts ?? 0;
  const tsMax = points[points.length - 1]?.ts ?? 0;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={points} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#007AFF" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(60,60,67,0.08)" />
        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={[tsMin, tsMax]}
          tickFormatter={(ts: number) => format(new Date(ts), 'MMM yy')}
          tick={{ fontSize: 10, fill: '#8E8E93' }}
          tickLine={false}
          axisLine={false}
          tickCount={6}
        />
        <YAxis
          tickFormatter={(v) => privacyMode ? '' : formatCurrency(v, 'GBP', true)}
          tick={{ fontSize: 10, fill: '#8E8E93' }}
          tickLine={false}
          axisLine={false}
          width={privacyMode ? 12 : 58}
          domain={[min - padding, max + padding]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#007AFF"
          strokeWidth={2}
          fill="url(#nwGrad)"
          dot={false}
          activeDot={{ r: 5, strokeWidth: 0, fill: '#007AFF' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
