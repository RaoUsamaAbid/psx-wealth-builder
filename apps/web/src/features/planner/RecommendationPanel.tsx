import { useState } from 'react';
import { AlertTriangle, RefreshCw, ShoppingCart } from 'lucide-react';
import type { PortfolioRequest, RecommendationConfidence } from '@psx/shared';
import { useRecommendation } from '../../hooks/usePlannerQueries';
import { ApiError } from '../../lib/api';
import { pkr, pct } from '../../lib/format';
import { Badge, ErrorNote, Skeleton, Stat } from '../../components/ui/misc';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';
import { Card } from '../../components/ui/Card';

const confidenceTone: Record<RecommendationConfidence, 'emerald' | 'amber' | 'rose'> = {
  high: 'emerald',
  medium: 'amber',
  low: 'rose',
};

export function RecommendationPanel({ request }: { request: PortfolioRequest }) {
  const [form, setForm] = useState({
    carriedCash: '0',
    availableDividends: '0',
    feePercent: '0.25',
    maxOrders: '4',
  });
  const [inputs, setInputs] = useState({
    carriedCash: 0,
    availableDividends: 0,
    estimatedFeeRate: 0.0025,
    maxOrders: 4,
  });
  const query = useRecommendation(request, true, inputs);

  if (query.isLoading) return <Skeleton className="h-72" />;
  if (query.isError) {
    return (
      <ErrorNote
        message={
          query.error instanceof ApiError ? query.error.message : 'Failed to generate buy plan.'
        }
      />
    );
  }
  if (!query.data) return null;
  const data = query.data;

  const regenerate = () => {
    setInputs({
      carriedCash: Math.max(0, Number(form.carriedCash) || 0),
      availableDividends: Math.max(0, Number(form.availableDividends) || 0),
      estimatedFeeRate: Math.max(0, Number(form.feePercent) || 0) / 100,
      maxOrders: Math.min(10, Math.max(1, Math.round(Number(form.maxOrders) || 4))),
    });
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-emerald" />
          <h3 className="text-sm font-semibold text-white">This month&apos;s model buy plan</h3>
          <Badge tone={confidenceTone[data.dataConfidence]}>{data.dataConfidence} confidence</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Field label="Carried cash" hint="PKR">
            <Input
              type="number"
              min={0}
              value={form.carriedCash}
              onChange={(event) => setForm({ ...form, carriedCash: event.target.value })}
            />
          </Field>
          <Field label="Dividends available" hint="PKR">
            <Input
              type="number"
              min={0}
              value={form.availableDividends}
              onChange={(event) => setForm({ ...form, availableDividends: event.target.value })}
            />
          </Field>
          <Field label="Trading cost estimate" hint="%">
            <Input
              type="number"
              min={0}
              max={10}
              step="0.05"
              value={form.feePercent}
              onChange={(event) => setForm({ ...form, feePercent: event.target.value })}
            />
          </Field>
          <Field label="Maximum orders">
            <Input
              type="number"
              min={1}
              max={10}
              value={form.maxOrders}
              onChange={(event) => setForm({ ...form, maxOrders: event.target.value })}
            />
          </Field>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={regenerate} loading={query.isFetching}>
            <RefreshCw className="h-4 w-4" /> Recalculate
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Available cash" value={pkr(data.availableCash)} />
        <Stat label="Current portfolio" value={pkr(data.currentPortfolioValue)} />
        <Stat label="Estimated order total" value={pkr(data.estimatedTotal)} tone="up" />
        <Stat label="Cash remaining" value={pkr(data.remainingCash)} />
      </div>

      {data.orders.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-850 text-left text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Buy</th>
                  <th className="px-3 py-3 font-medium">Company</th>
                  <th className="px-3 py-3 text-right font-medium">Price</th>
                  <th className="px-3 py-3 text-right font-medium">Target</th>
                  <th className="px-3 py-3 text-right font-medium">Est. total</th>
                  <th className="px-4 py-3 font-medium">Why</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr key={order.symbol} className="border-t border-line/60 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-emerald-soft">
                        {order.shares} × {order.symbol}
                      </p>
                      <Badge tone={confidenceTone[order.confidence]}>{order.confidence}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-white">{order.companyName}</p>
                      <p className="text-xs text-slate-500">{order.sector}</p>
                    </td>
                    <td className="stat-num px-3 py-3 text-right text-slate-300">
                      {pkr(order.referencePrice)}
                    </td>
                    <td className="stat-num px-3 py-3 text-right text-slate-300">
                      {pct(order.targetWeight)}
                    </td>
                    <td className="stat-num px-3 py-3 text-right text-white">
                      {pkr(order.estimatedTotal)}
                      <p className="text-[10px] text-slate-500">
                        incl. {pkr(order.estimatedFees)} costs
                      </p>
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      {order.reasons.map((reason) => (
                        <p key={reason} className="text-xs text-slate-400">
                          {reason}
                        </p>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div className="space-y-1">
            <p className="text-xs text-slate-300">
              Prices captured {new Date(data.asOf).toLocaleString()} · plan expires{' '}
              {new Date(data.expiresAt).toLocaleString()}
            </p>
            {data.warnings.map((warning) => (
              <p key={warning} className="text-xs text-slate-500">
                {warning}
              </p>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
