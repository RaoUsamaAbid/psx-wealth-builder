import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Target } from 'lucide-react';
import type { PortfolioRequest, ScenarioName } from '@psx/shared';
import { useProjection } from '../../hooks/usePlannerQueries';
import { ApiError } from '../../lib/api';
import { pkr, pkrCompact, pct } from '../../lib/format';
import { AXIS, GRID, tooltipStyle } from '../../lib/chart';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { ErrorNote, Skeleton } from '../../components/ui/misc';

const SCEN_COLOR: Record<ScenarioName, string> = {
  conservative: '#64748b',
  base: '#10b981',
  optimistic: '#22d3ee',
};

export function ProjectionPanel({ request }: { request: PortfolioRequest }) {
  const [targetInput, setTargetInput] = useState('');
  const [target, setTarget] = useState<number | undefined>();
  const { data, isLoading, isError, error } = useProjection(request, true, target);

  if (isLoading) return <Skeleton className="h-72" />;
  if (isError) return <ErrorNote message={error instanceof ApiError ? error.message : 'Failed.'} />;
  if (!data) return null;

  const years = data.scenarios[0]?.perYear.length ?? 0;
  const chart = Array.from({ length: years }, (_, i) => {
    const row: Record<string, number> = { year: i + 1 };
    for (const s of data.scenarios) row[s.scenario] = Math.round(s.perYear[i]?.portfolioValue ?? 0);
    return row;
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {data.scenarios.map((s) => (
          <div key={s.scenario} className="rounded-xl border border-line bg-ink-900/50 p-4">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: SCEN_COLOR[s.scenario] }}
              />
              <p className="text-xs font-medium capitalize text-slate-300">{s.scenario}</p>
            </div>
            <p className="stat-num mt-2 text-xl font-bold text-white">
              {pkrCompact(s.futureValue)}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              CAGR {s.cagrPercent != null ? pct(s.cagrPercent) : '—'} ·{' '}
              {pkr(s.finalMonthlyDividendIncome)}/mo div
            </p>
          </div>
        ))}
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-white">Projected portfolio value</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ left: 6, right: 6, top: 6 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: AXIS, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                unit="y"
              />
              <YAxis
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
              {(['conservative', 'base', 'optimistic'] as ScenarioName[]).map((s) => (
                <Line
                  key={s}
                  name={s}
                  type="monotone"
                  dataKey={s}
                  stroke={SCEN_COLOR[s]}
                  strokeWidth={s === 'base' ? 2.5 : 1.5}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald" />
          <h3 className="text-sm font-semibold text-white">Goal solver</h3>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Target a future value — we compute the monthly contribution required (base scenario).
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              type="number"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder="Target value, e.g. 20000000"
              className="stat-num"
            />
          </div>
          <Button
            onClick={() => setTarget(Number(targetInput) || undefined)}
            disabled={!targetInput}
          >
            Solve
          </Button>
        </div>
        {data.targetSolve && (
          <div className="mt-4 rounded-lg border border-emerald/30 bg-emerald/10 p-4">
            <p className="text-sm text-slate-300">
              To reach{' '}
              <span className="font-semibold text-white">{pkr(data.targetSolve.targetValue)}</span>{' '}
              in {data.years} years, invest about
            </p>
            <p className="stat-num mt-1 text-2xl font-bold text-emerald-soft">
              {pkr(data.targetSolve.requiredMonthlyInvestment)} / month
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
