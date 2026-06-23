import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Plus, Trash2, Scale, ArrowUpRight, ArrowDownRight, Minus, Repeat } from 'lucide-react';
import type { RebalanceActionType, RiskLevel, Strategy } from '@psx/shared';
import { api, ApiError } from '../lib/api';
import type { RebalanceResponse } from '../lib/types';
import { pct, pkr } from '../lib/format';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, SegmentedControl } from '../components/ui/Field';
import { Badge, ErrorNote, EmptyState } from '../components/ui/misc';
import { cn } from '../lib/cn';

interface Row {
  symbol: string;
  shares: string;
}

const actionMeta: Record<
  RebalanceActionType,
  { tone: 'emerald' | 'amber' | 'rose' | 'slate'; icon: typeof Minus }
> = {
  hold: { tone: 'slate', icon: Minus },
  increase: { tone: 'emerald', icon: ArrowUpRight },
  reduce: { tone: 'amber', icon: ArrowDownRight },
  replace: { tone: 'rose', icon: Repeat },
};

export function RebalancePage() {
  const [rows, setRows] = useState<Row[]>([
    { symbol: 'OGDC', shares: '300' },
    { symbol: 'LUCK', shares: '200' },
  ]);
  const [strategy, setStrategy] = useState<Strategy>('balanced');
  const [risk, setRisk] = useState<RiskLevel>('medium');
  const [band, setBand] = useState('5');

  const mut = useMutation({
    mutationFn: () =>
      api<RebalanceResponse>('/rebalance', {
        method: 'POST',
        body: {
          monthlyInvestmentAmount: 50000,
          durationYears: 15,
          strategy,
          riskLevel: risk,
          band: Number(band) || 5,
          currentHoldings: rows
            .filter((r) => r.symbol.trim() && Number(r.shares) > 0)
            .map((r) => ({ symbol: r.symbol.trim().toUpperCase(), shares: Number(r.shares) })),
        },
      }),
  });

  const setRow = (i: number, k: keyof Row, v: string) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows((p) => [...p, { symbol: '', shares: '' }]);
  const delRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i));

  const res = mut.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Rebalance</h1>
        <p className="mt-1 text-sm text-slate-400">
          Compare your current holdings to the ideal target and get actions.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-emerald" />
            <h3 className="text-sm font-semibold text-white">Your holdings</h3>
          </div>

          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="Symbol"
                  value={r.symbol}
                  onChange={(e) => setRow(i, 'symbol', e.target.value)}
                  className="flex-1 uppercase"
                />
                <Input
                  placeholder="Shares"
                  type="number"
                  value={r.shares}
                  onChange={(e) => setRow(i, 'shares', e.target.value)}
                  className="w-24 stat-num"
                />
                <button onClick={() => delRow(i)} className="text-slate-500 hover:text-rose-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4" /> Add holding
          </Button>

          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-400">Target strategy</p>
            <SegmentedControl
              options={[
                { value: 'dividend', label: 'Dividend' },
                { value: 'growth', label: 'Growth' },
                { value: 'balanced', label: 'Balanced' },
              ]}
              value={strategy}
              onChange={setStrategy}
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-400">Risk</p>
            <SegmentedControl
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
              value={risk}
              onChange={setRisk}
            />
          </div>
          <Field label="Tolerance band" hint="percentage points">
            <Input type="number" value={band} onChange={(e) => setBand(e.target.value)} />
          </Field>

          <Button className="w-full" onClick={() => mut.mutate()} loading={mut.isPending}>
            Analyze
          </Button>
        </Card>

        <div className="min-w-0 space-y-4">
          {mut.isError && (
            <ErrorNote
              message={mut.error instanceof ApiError ? mut.error.message : 'Failed to analyze.'}
            />
          )}
          {!res && !mut.isError && (
            <EmptyState
              icon={<Scale className="h-8 w-8" />}
              title="Enter holdings and analyze"
              hint="We'll suggest hold, increase, reduce, or replace for each position."
            />
          )}
          {res && (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge tone="slate">Value {pkr(res.currentValue)}</Badge>
                <Badge tone="emerald">{res.summary.increase} increase</Badge>
                <Badge tone="amber">{res.summary.reduce} reduce</Badge>
                <Badge tone="rose">{res.summary.replace} replace</Badge>
                <Badge tone="slate">{res.summary.hold} hold</Badge>
              </div>
              <div className="space-y-2">
                {res.actions.map((a, i) => {
                  const meta = actionMeta[a.action];
                  const Icon = meta.icon;
                  return (
                    <Card key={`${a.symbol}-${i}`} className="flex items-start gap-3 p-4">
                      <div
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          meta.tone === 'emerald' && 'bg-emerald/15 text-emerald',
                          meta.tone === 'amber' && 'bg-amber-400/15 text-amber-300',
                          meta.tone === 'rose' && 'bg-rose-500/15 text-rose-300',
                          meta.tone === 'slate' && 'bg-slate-500/15 text-slate-300'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white">{a.symbol}</span>
                          <Badge tone={meta.tone}>{a.action}</Badge>
                          {a.replaceWith && <Badge tone="cyan">→ {a.replaceWith}</Badge>}
                          <span className="text-xs text-slate-500">{a.sector}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          current {pct(a.currentWeight)} · target {pct(a.targetWeight)} · score{' '}
                          {a.score}
                        </p>
                        <ul className="mt-1.5 space-y-0.5">
                          {a.reasons.map((r, j) => (
                            <li key={j} className="text-xs text-slate-400">
                              • {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
