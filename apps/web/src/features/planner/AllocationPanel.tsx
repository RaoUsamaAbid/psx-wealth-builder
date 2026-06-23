import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useMutation } from '@tanstack/react-query';
import { Star, Save, Check } from 'lucide-react';
import type { PortfolioRequest } from '@psx/shared';
import { usePortfolio } from '../../hooks/usePlannerQueries';
import { api, ApiError } from '../../lib/api';
import { CHART_COLORS, tooltipStyle } from '../../lib/chart';
import { pkr, pct, num } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { Stat, ErrorNote, Skeleton } from '../../components/ui/misc';

export function AllocationPanel({ request }: { request: PortfolioRequest }) {
  const { data, isLoading, isError, error } = usePortfolio(request, true);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const [watched, setWatched] = useState<Record<string, boolean>>({});

  const saveMut = useMutation({
    mutationFn: (n: string) =>
      api('/me/portfolios', { method: 'POST', body: { name: n, request } }),
    onSuccess: () => {
      setSaved(true);
      setName('');
      setTimeout(() => setSaved(false), 2500);
    },
  });
  const watchMut = useMutation({
    mutationFn: (symbol: string) => api('/me/watchlist', { method: 'POST', body: { symbol } }),
    onSuccess: (_d, symbol) => setWatched((w) => ({ ...w, [symbol]: true })),
  });

  if (isLoading) return <Skeleton className="h-72" />;
  if (isError)
    return (
      <ErrorNote
        message={error instanceof ApiError ? error.message : 'Failed to load portfolio.'}
      />
    );
  if (!data) return null;
  if (data.holdings.length === 0)
    return <ErrorNote message="No companies matched these inputs/filters. Loosen the filters." />;

  const pieData = data.holdings.map((h) => ({ name: h.symbol, value: h.allocationPercent }));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Invested this month" value={pkr(data.investedThisMonth)} />
        <Stat label="Holdings" value={num(data.holdings.length)} />
        <Stat
          label="Leftover cash"
          value={pkr(data.leftoverCash)}
          sub="from whole-share rounding"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-white">Allocation</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="none"
                >
                  {pieData.map((_e, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n: string) => [`${pct(v)}`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-3 overflow-hidden p-0">
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-ink-850 text-left text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Symbol</th>
                  <th className="px-2 py-2.5 font-medium">Sector</th>
                  <th className="px-2 py-2.5 text-right font-medium">Alloc</th>
                  <th className="px-2 py-2.5 text-right font-medium">Shares</th>
                  <th className="px-4 py-2.5 text-right font-medium">Cost</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {data.holdings.map((h) => (
                  <tr key={h.symbol} className="border-t border-line/60 hover:bg-ink-800/40">
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-white">{h.symbol}</span>
                      <span className="ml-2 hidden text-xs text-slate-500 md:inline">
                        {h.companyName}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-xs text-slate-400">{h.sector}</td>
                    <td className="stat-num px-2 py-2.5 text-right text-emerald-soft">
                      {pct(h.allocationPercent)}
                    </td>
                    <td className="stat-num px-2 py-2.5 text-right text-slate-300">
                      {num(h.shares)}
                    </td>
                    <td className="stat-num px-4 py-2.5 text-right text-slate-300">
                      {num(h.cost)}
                    </td>
                    <td className="pr-3">
                      <button
                        onClick={() => watchMut.mutate(h.symbol)}
                        title="Add to watchlist"
                        className="text-slate-500 hover:text-amber-300"
                      >
                        <Star
                          className={
                            watched[h.symbol] ? 'h-4 w-4 fill-amber-300 text-amber-300' : 'h-4 w-4'
                          }
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Save plan */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Save this plan</p>
            <p className="text-xs text-slate-400">Store these inputs to your account for later.</p>
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Retirement plan"
            className="sm:w-56"
          />
          <Button
            onClick={() => name.trim() && saveMut.mutate(name.trim())}
            loading={saveMut.isPending}
            disabled={!name.trim()}
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'Saved' : 'Save'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
