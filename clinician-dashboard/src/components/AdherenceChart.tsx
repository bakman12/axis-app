// AdherenceChart.tsx
// 30-day adherence heatmap/bar chart using Recharts.
// Receives data as a prop — never fetches directly.

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { AdherenceSnapshot } from '../lib/api/adherence';

interface Props {
  snapshots: AdherenceSnapshot[];
  /** Calendar dates in range with no data */
  missingDates?: string[];
}

const TERRA = '#c75b3a';
const CREAM = '#faf9f6';
const STONE = '#8a8a8a';
const LOW_THRESHOLD = 0.8; // 80% — highlight days below this

function rateToColor(rate: number | null): string {
  if (rate === null) return '#e8e4dc'; // no data — light cream
  if (rate >= 0.9) return '#2c7a4b';   // dark green — excellent
  if (rate >= 0.8) return '#5fa87a';   // medium green — good
  if (rate >= 0.6) return '#e8a838';   // amber — concerning
  return TERRA;                         // terracotta — poor
}

interface ChartRow {
  date: string;
  label: string;
  rate: number | null;
  taken: number;
  missed: number;
  fill: string;
}

export function AdherenceChart({ snapshots, missingDates = [] }: Props) {
  const data: ChartRow[] = snapshots.map(s => ({
    date:   s.date,
    label:  format(parseISO(s.date), 'd MMM'),
    rate:   s.adherence_rate,
    taken:  s.total_doses_taken,
    missed: s.total_doses_missed,
    fill:   rateToColor(s.adherence_rate),
  }));

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={10} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: STONE, fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={v => `${Math.round(v * 100)}%`}
            domain={[0, 1]}
            tick={{ fontSize: 11, fill: STONE, fontFamily: 'Inter, sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'rate') return [`${Math.round(value * 100)}%`, 'Adherence'];
              return [value, name];
            }}
            labelFormatter={label => `Date: ${label}`}
            contentStyle={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              border: '1px solid #e8e4dc',
              borderRadius: 8,
              background: '#fff',
            }}
          />
          <ReferenceLine
            y={LOW_THRESHOLD}
            stroke={TERRA}
            strokeDasharray="4 2"
            strokeWidth={1}
            label={{ value: '80%', position: 'insideTopRight', fontSize: 10, fill: TERRA }}
          />
          <Bar dataKey="rate" radius={[3, 3, 0, 0]}>
            {data.map(entry => (
              <Cell key={entry.date} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        {[
          { color: '#2c7a4b', label: '≥90% — Excellent' },
          { color: '#5fa87a', label: '80–89% — Good' },
          { color: '#e8a838', label: '60–79% — Monitor' },
          { color: TERRA,     label: '<60% — At risk' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: STONE, fontFamily: 'Inter, sans-serif' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
            {label}
          </div>
        ))}
        {missingDates.length > 0 && (
          <div style={{ fontSize: 11, color: STONE, fontFamily: 'Inter, sans-serif' }}>
            {missingDates.length} day{missingDates.length !== 1 ? 's' : ''} with no sync data
          </div>
        )}
      </div>
    </div>
  );
}
