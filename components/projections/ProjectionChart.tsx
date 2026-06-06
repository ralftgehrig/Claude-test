'use client';

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { useDisplayCurrency } from '@/lib/display-currency';
import type { ProjectionDataPoint } from '@/lib/types';

interface ProjectionChartProps {
  data: ProjectionDataPoint[];
  isMonteCarlo: boolean;
  compareData?: { name: string; data: ProjectionDataPoint[]; color: string }[];
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  const { mask } = useDisplayCurrency();
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 min-w-40">
      <p className="text-xs text-gray-500 mb-2">Year {label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-xs text-gray-600">{p.name}</span>
          </div>
          <span className="text-sm font-semibold" style={{ color: p.color }}>
            {mask(formatCurrency(p.value))}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ProjectionChart({ data, isMonteCarlo, compareData }: ProjectionChartProps) {
  const { privacyMode } = useDisplayCurrency();
  const yAxisWidth = privacyMode ? 12 : 65;
  const yTickFormatter = (v: number) => privacyMode ? '' : formatCurrency(v, 'GBP', true);

  if (isMonteCarlo) {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="p90Gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} label={{ value: 'Years', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#9ca3af' }} />
          <YAxis tickFormatter={yTickFormatter} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={yAxisWidth} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="p90" name="90th %ile" stroke="#93c5fd" fill="url(#p90Gradient)" strokeWidth={1} dot={false} />
          <Area type="monotone" dataKey="p75" name="75th %ile" stroke="#60a5fa" fill="transparent" strokeWidth={1} dot={false} />
          <Area type="monotone" dataKey="p50" name="Median" stroke="#3b82f6" fill="transparent" strokeWidth={2.5} dot={false} />
          <Area type="monotone" dataKey="p25" name="25th %ile" stroke="#60a5fa" fill="transparent" strokeWidth={1} dot={false} />
          <Area type="monotone" dataKey="p10" name="10th %ile" stroke="#93c5fd" fill="transparent" strokeWidth={1} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (compareData && compareData.length > 0) {
    const allData = data.map((d, i) => {
      const point: Record<string, unknown> = { year: d.year };
      point['Baseline'] = d.netWorth;
      for (const comp of compareData) {
        point[comp.name] = comp.data[i]?.netWorth;
      }
      return point;
    });

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={allData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={yTickFormatter} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={yAxisWidth} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
          <Line type="monotone" dataKey="Baseline" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
          {compareData.map((comp) => (
            <Line key={comp.name} type="monotone" dataKey={comp.name} stroke={comp.color} strokeWidth={2} dot={false} strokeDasharray="5 3" />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} label={{ value: 'Years from now', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#9ca3af' }} />
        <YAxis tickFormatter={yTickFormatter} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={yAxisWidth} />
        <Tooltip content={<CustomTooltip />} />
        {/* Event reference lines */}
        {data
          .filter((d) => d.events?.length > 0)
          .map((d) =>
            d.events.map((ev) => (
              <ReferenceLine
                key={`${d.year}-${ev.label}`}
                x={d.year}
                stroke={ev.amount >= 0 ? '#10b981' : '#ef4444'}
                strokeDasharray="4 2"
                label={{ value: ev.label, position: 'insideTopLeft', fontSize: 9, fill: ev.amount >= 0 ? '#10b981' : '#ef4444' }}
              />
            ))
          )}
        <Area type="monotone" dataKey="netWorth" name="Net worth" stroke="#3b82f6" strokeWidth={2.5} fill="url(#projGradient)" dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: '#3b82f6' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
