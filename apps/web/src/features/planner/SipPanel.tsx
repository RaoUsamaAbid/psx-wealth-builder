import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { PortfolioRequest } from '@psx/shared';
import { useSip } from '../../hooks/usePlannerQueries';
import { ApiError } from '../../lib/api';
import { pkr, pkrCompact, signedPct } from '../../lib/format';
import { AXIS, GRID, tooltipStyle } from '../../lib/chart';
import { Card } from '../../components/ui/Card';
import { Stat, ErrorNote, Skeleton } from '../../components/ui/misc';

export function SipPanel({ request }: { request: PortfolioRequest }) {
  const { data, isLoading, isError, error } = useSip(request, true);
  if (isLoading) return <Skeleton className="h-72" />;
  if (isError) return <ErrorNote message={error instanceof ApiError ? error.message : 'Failed.'} />;
  if (!data || !data.timeline) return null;

  const chart = data.timeline.map((p) => ({
    label: (p.month / 12).toFixed(1),
    value: Math.round(p.marketValue),
    contributed: Math.round(p.contributedToDate),
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Total contributed" value={pkrCompact(data.totalContributed)} />
        <Stat
          label="Deployed"
          value={pkrCompact(data.totalInvested)}
          sub={`${pkr(data.cashUninvested)} idle`}
        />
        <Stat label="Final value" value={pkrCompact(data.totalValue)} tone="up" />
        <Stat
          label="Total gain"
          value={signedPct(data.totalGainPercent)}
          tone={data.totalGainPercent >= 0 ? 'up' : 'down'}
        />
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">
          Portfolio value vs contributions · {data.months} months
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ left: 6, right: 6, top: 6 }}>
              <defs>
                <linearGradient id="sipVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
                unit="y"
              />
              <YAxis
                tick={{ fill: AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => pkrCompact(v).replace('PKR ', '')}
                width={52}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => pkr(v)}
                labelFormatter={(l) => `Year ${l}`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                name="Portfolio value"
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#sipVal)"
              />
              <Line
                name="Contributed"
                type="monotone"
                dataKey="contributed"
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
