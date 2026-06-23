import { useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { PortfolioRequest } from '@psx/shared';
import { useDividends } from '../../hooks/usePlannerQueries';
import { ApiError } from '../../lib/api';
import { pkr, pkrCompact, num } from '../../lib/format';
import { AXIS, GRID, tooltipStyle } from '../../lib/chart';
import { Card } from '../../components/ui/Card';
import { Stat, ErrorNote, Skeleton } from '../../components/ui/misc';
import { SegmentedControl } from '../../components/ui/Field';

export function DividendPanel({ request }: { request: PortfolioRequest }) {
  const { data, isLoading, isError, error } = useDividends(request, true);
  const [mode, setMode] = useState<'on' | 'off'>('on');

  if (isLoading) return <Skeleton className="h-72" />;
  if (isError) return <ErrorNote message={error instanceof ApiError ? error.message : 'Failed.'} />;
  if (!data) return null;

  const f = mode === 'on' ? data.reinvestOn : data.reinvestOff;
  const chart = f.perYear.map((p) => ({
    year: p.year,
    income: Math.round(p.dividendIncome),
    cumulative: Math.round(p.cumulativeDividends),
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-400">Dividend reinvestment</p>
        <div className="w-56">
          <SegmentedControl
            options={[
              { value: 'off', label: 'Payout' },
              { value: 'on', label: 'Reinvest (DRIP)' },
            ]}
            value={mode}
            onChange={(v) => setMode(v)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat
          label="Monthly income (final yr)"
          value={pkr(f.finalMonthlyDividendIncome)}
          tone="up"
        />
        <Stat label="Total dividends" value={pkrCompact(f.totalDividends)} />
        <Stat label="Final shares" value={num(f.finalShares)} />
        <Stat label="Final value" value={pkrCompact(f.finalValue)} />
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">
          Annual dividend income · {mode === 'on' ? 'reinvested' : 'paid out'}
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{ left: 6, right: 6, top: 6 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                unit="y"
              />
              <YAxis
                yAxisId="l"
                tick={{ fill: AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v) => pkrCompact(v).replace('PKR ', '')}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => pkr(v)}
                labelFormatter={(l) => `Year ${l}`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                yAxisId="l"
                name="Annual income"
                dataKey="income"
                fill="#22d3ee"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Line
                yAxisId="l"
                name="Cumulative"
                type="monotone"
                dataKey="cumulative"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
