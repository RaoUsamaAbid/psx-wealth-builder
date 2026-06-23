import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  Check,
  ChevronRight,
  Plus,
  RefreshCw,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import type { Index, PortfolioRequest, RiskLevel, Strategy } from '@psx/shared';
import { api, ApiError } from '../lib/api';
import type { PersonalSipDetail, PersonalSipPlan, RecommendationResponse } from '../lib/types';
import { pkr, pct, shortDate } from '../lib/format';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Field, Input, SegmentedControl, Select } from '../components/ui/Field';
import { Badge, EmptyState, ErrorNote, Skeleton, Stat } from '../components/ui/misc';

interface CreateForm {
  name: string;
  monthlyInvestmentAmount: string;
  durationYears: string;
  strategy: Strategy;
  riskLevel: RiskLevel;
  index: Index;
  holdingsCount: string;
  maxOrders: string;
  feePercent: string;
}

const initialForm: CreateForm = {
  name: 'My 5-Year PSX Plan',
  monthlyInvestmentAmount: '10000',
  durationYears: '5',
  strategy: 'balanced',
  riskLevel: 'medium',
  index: 'KMI30',
  holdingsCount: '5',
  maxOrders: '4',
  feePercent: '0.25',
};

export function SipsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(initialForm);
  const [availableDividends, setAvailableDividends] = useState('0');
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);

  const plansQuery = useQuery({
    queryKey: ['me', 'sips'],
    queryFn: () => api<{ plans: PersonalSipPlan[] }>('/me/sips'),
  });
  useEffect(() => {
    if (!selectedId && plansQuery.data?.plans[0]) setSelectedId(plansQuery.data.plans[0].id);
  }, [plansQuery.data, selectedId]);

  const detailQuery = useQuery({
    queryKey: ['me', 'sips', selectedId],
    enabled: Boolean(selectedId),
    queryFn: () => api<PersonalSipDetail>(`/me/sips/${selectedId}`),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const request: PortfolioRequest = {
        monthlyInvestmentAmount: Math.max(1, Number(form.monthlyInvestmentAmount) || 0),
        durationYears: Math.max(1, Number(form.durationYears) || 0),
        strategy: form.strategy,
        riskLevel: form.riskLevel,
        index: form.index,
        holdingsCount: Math.min(30, Math.max(1, Number(form.holdingsCount) || 5)),
        maxPerSector: 2,
        filters: { shariahOnly: true },
      };
      return api<{ plan: PersonalSipPlan }>('/me/sips', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          request,
          estimatedFeeRate: Math.max(0, Number(form.feePercent) || 0) / 100,
          maxOrders: Math.min(10, Math.max(1, Number(form.maxOrders) || 4)),
        },
      });
    },
    onSuccess: ({ plan }) => {
      queryClient.invalidateQueries({ queryKey: ['me', 'sips'] });
      setSelectedId(plan.id);
      setShowCreate(false);
      setRecommendation(null);
    },
  });

  const recommendationMutation = useMutation({
    mutationFn: () =>
      api<RecommendationResponse>(`/me/sips/${selectedId}/recommendation`, {
        method: 'POST',
        body: { availableDividends: Math.max(0, Number(availableDividends) || 0) },
      }),
    onSuccess: setRecommendation,
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      api<{ plan: PersonalSipPlan }>(`/me/sips/${selectedId}/confirm`, {
        method: 'POST',
        body: { availableDividends: Math.max(0, Number(availableDividends) || 0) },
      }),
    onSuccess: () => {
      setRecommendation(null);
      setAvailableDividends('0');
      queryClient.invalidateQueries({ queryKey: ['me', 'sips'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'sips', selectedId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/me/sips/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      setSelectedId((current) => (current === id ? null : current));
      setRecommendation(null);
      queryClient.invalidateQueries({ queryKey: ['me', 'sips'] });
    },
  });

  const detail = detailQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">My SIPs</h1>
          <p className="mt-1 text-sm text-slate-400">
            Save a strategy once, invest monthly, and let each confirmed cycle update the next one.
          </p>
        </div>
        <Button onClick={() => setShowCreate((open) => !open)}>
          <Plus className="h-4 w-4" /> New SIP
        </Button>
      </div>

      {showCreate && (
        <Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Plan name">
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="Monthly investment" hint="PKR">
              <Input
                type="number"
                min={1}
                value={form.monthlyInvestmentAmount}
                onChange={(event) =>
                  setForm({ ...form, monthlyInvestmentAmount: event.target.value })
                }
              />
            </Field>
            <Field label="Duration" hint="years">
              <Input
                type="number"
                min={1}
                value={form.durationYears}
                onChange={(event) => setForm({ ...form, durationYears: event.target.value })}
              />
            </Field>
            <Field label="Universe">
              <Select
                value={form.index}
                onChange={(event) => setForm({ ...form, index: event.target.value as Index })}
              >
                <option value="KMI30">KMI-30</option>
                <option value="KMI100">KMI All-Share</option>
              </Select>
            </Field>
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-400">Strategy</p>
              <SegmentedControl
                options={[
                  { value: 'dividend', label: 'Dividend' },
                  { value: 'balanced', label: 'Balanced' },
                  { value: 'growth', label: 'Growth' },
                ]}
                value={form.strategy}
                onChange={(strategy) => setForm({ ...form, strategy })}
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
                value={form.riskLevel}
                onChange={(riskLevel) => setForm({ ...form, riskLevel })}
              />
            </div>
            <Field label="Target holdings">
              <Input
                type="number"
                min={1}
                max={30}
                value={form.holdingsCount}
                onChange={(event) => setForm({ ...form, holdingsCount: event.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Max orders">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.maxOrders}
                  onChange={(event) => setForm({ ...form, maxOrders: event.target.value })}
                />
              </Field>
              <Field label="Est. costs" hint="%">
                <Input
                  type="number"
                  min={0}
                  step="0.05"
                  value={form.feePercent}
                  onChange={(event) => setForm({ ...form, feePercent: event.target.value })}
                />
              </Field>
            </div>
          </div>
          {createMutation.isError && (
            <div className="mt-3">
              <ErrorNote
                message={
                  createMutation.error instanceof ApiError
                    ? createMutation.error.message
                    : 'Could not create SIP.'
                }
              />
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={!form.name.trim()}
            >
              Create SIP
            </Button>
          </div>
        </Card>
      )}

      {plansQuery.isLoading ? (
        <Skeleton className="h-56" />
      ) : !plansQuery.data?.plans.length ? (
        <EmptyState
          icon={<CalendarClock className="h-8 w-8" />}
          title="No personal SIPs yet"
          hint="Create one plan and the app will preserve its strategy, holdings and carried cash."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <div className="space-y-2">
            {plansQuery.data.plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => {
                  setSelectedId(plan.id);
                  setRecommendation(null);
                }}
                className={`flex w-full items-center justify-between rounded-lg border p-4 text-left ${
                  selectedId === plan.id
                    ? 'border-emerald/40 bg-emerald/10'
                    : 'border-line bg-ink-900/50 hover:bg-ink-800/60'
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{plan.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {pkr(plan.request.monthlyInvestmentAmount)}/mo · {plan.request.durationYears}y
                  </p>
                  <div className="mt-2 flex gap-1">
                    <Badge tone="emerald">{plan.request.strategy}</Badge>
                    <Badge>{plan.request.index ?? 'All KMI'}</Badge>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </button>
            ))}
          </div>

          {detailQuery.isLoading ? (
            <Skeleton className="h-80" />
          ) : detail ? (
            <div className="min-w-0 space-y-5">
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{detail.plan.name}</h2>
                      <Badge tone="emerald">{detail.plan.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Next cycle{' '}
                      {detail.plan.nextInvestmentDate
                        ? shortDate(detail.plan.nextInvestmentDate)
                        : 'when you are ready'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(detail.plan.id)}
                    loading={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <Stat
                    label="Monthly amount"
                    value={pkr(detail.plan.request.monthlyInvestmentAmount)}
                  />
                  <Stat label="Carried cash" value={pkr(detail.plan.carriedCash)} />
                  <Stat label="Holdings owned" value={String(detail.holdings.length)} />
                  <Stat label="Confirmed buys" value={String(detail.transactions.length)} />
                </div>
              </Card>

              <Card>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Field label="Dividends available this cycle" hint="PKR">
                      <Input
                        type="number"
                        min={0}
                        value={availableDividends}
                        onChange={(event) => setAvailableDividends(event.target.value)}
                      />
                    </Field>
                  </div>
                  <Button
                    onClick={() => recommendationMutation.mutate()}
                    loading={recommendationMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4" /> Generate this month
                  </Button>
                </div>
                {recommendationMutation.isError && (
                  <div className="mt-3">
                    <ErrorNote
                      message={
                        recommendationMutation.error instanceof ApiError
                          ? recommendationMutation.error.message
                          : 'Could not generate recommendations.'
                      }
                    />
                  </div>
                )}
              </Card>

              {recommendation && (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Stat label="Available" value={pkr(recommendation.availableCash)} />
                    <Stat label="Orders" value={pkr(recommendation.estimatedTotal)} tone="up" />
                    <Stat label="Roll forward" value={pkr(recommendation.remainingCash)} />
                  </div>
                  <Card className="overflow-hidden p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-ink-850 text-left text-xs text-slate-400">
                          <tr>
                            <th className="px-4 py-3 font-medium">Order</th>
                            <th className="px-3 py-3 font-medium">Sector</th>
                            <th className="px-3 py-3 text-right font-medium">Target</th>
                            <th className="px-4 py-3 text-right font-medium">Estimated total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recommendation.orders.map((order) => (
                            <tr key={order.symbol} className="border-t border-line/60">
                              <td className="px-4 py-3">
                                <p className="font-semibold text-emerald-soft">
                                  Buy {order.shares} × {order.symbol}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {pkr(order.referencePrice)} per share
                                </p>
                              </td>
                              <td className="px-3 py-3 text-slate-400">{order.sector}</td>
                              <td className="stat-num px-3 py-3 text-right text-slate-300">
                                {pct(order.targetWeight)}
                              </td>
                              <td className="stat-num px-4 py-3 text-right text-white">
                                {pkr(order.estimatedTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => confirmMutation.mutate()}
                      loading={confirmMutation.isPending}
                      disabled={recommendation.orders.length === 0}
                    >
                      <Check className="h-4 w-4" /> Confirm purchases
                    </Button>
                  </div>
                  {confirmMutation.isError && (
                    <ErrorNote
                      message={
                        confirmMutation.error instanceof ApiError
                          ? confirmMutation.error.message
                          : 'Could not confirm purchases.'
                      }
                    />
                  )}
                </>
              )}

              {detail.holdings.length > 0 && (
                <Card>
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-emerald" />
                    <h3 className="text-sm font-semibold text-white">Current SIP holdings</h3>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {detail.holdings.map((holding) => (
                      <Badge key={holding.symbol} tone="slate">
                        {holding.symbol} · {holding.shares} shares
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
