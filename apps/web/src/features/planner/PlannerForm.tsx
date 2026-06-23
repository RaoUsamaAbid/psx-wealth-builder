import { useState, type FormEvent } from 'react';
import { SlidersHorizontal, Sparkles, ChevronDown } from 'lucide-react';
import type { Index, PortfolioRequest, RiskLevel, Strategy } from '@psx/shared';
import { usePlanner } from '../../store/planner';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, SegmentedControl } from '../../components/ui/Field';
import { cn } from '../../lib/cn';

const STRATEGIES: { value: Strategy; label: string }[] = [
  { value: 'dividend', label: 'Dividend' },
  { value: 'growth', label: 'Growth' },
  { value: 'balanced', label: 'Balanced' },
];
const RISKS: { value: RiskLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

// Local form shape: percents are entered as whole numbers for friendliness.
interface FilterForm {
  shariahOnly: boolean;
  minDividendYield: string;
  minEpsGrowth: string;
  maxDebtRatio: string;
  maxVolatility: string;
}

const emptyFilters: FilterForm = {
  shariahOnly: false,
  minDividendYield: '',
  minEpsGrowth: '',
  maxDebtRatio: '',
  maxVolatility: '',
};

export function PlannerForm() {
  const { request, apply } = usePlanner();
  const [amount, setAmount] = useState(String(request.monthlyInvestmentAmount));
  const [years, setYears] = useState(String(request.durationYears));
  const [strategy, setStrategy] = useState<Strategy>(request.strategy);
  const [risk, setRisk] = useState<RiskLevel>(request.riskLevel);
  const [index, setIndex] = useState<Index | ''>(request.index ?? '');
  const [holdings, setHoldings] = useState(String(request.holdingsCount ?? 10));
  const maxPerSector = String(request.maxPerSector ?? 2);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterForm>(emptyFilters);

  function buildRequest(): PortfolioRequest {
    const req: PortfolioRequest = {
      monthlyInvestmentAmount: Math.max(1, Number(amount) || 0),
      durationYears: Math.max(1, Number(years) || 0),
      strategy,
      riskLevel: risk,
      holdingsCount: Math.min(30, Math.max(1, Number(holdings) || 10)),
      maxPerSector: Math.min(10, Math.max(1, Number(maxPerSector) || 2)),
    };
    if (index) req.index = index;
    const f: NonNullable<PortfolioRequest['filters']> = {};
    if (filters.shariahOnly) f.shariahOnly = true;
    if (filters.minDividendYield) f.minDividendYield = Number(filters.minDividendYield) / 100;
    if (filters.minEpsGrowth) f.minEpsGrowth = Number(filters.minEpsGrowth) / 100;
    if (filters.maxDebtRatio) f.maxDebtRatio = Number(filters.maxDebtRatio) / 100;
    if (filters.maxVolatility) f.maxVolatility = Number(filters.maxVolatility);
    if (Object.keys(f).length > 0) req.filters = f;
    return req;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    apply(buildRequest());
  }

  const setF = (k: keyof FilterForm, v: string | boolean) => setFilters((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={onSubmit} className="card sticky top-20 space-y-5 p-5">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-emerald" />
        <h3 className="text-sm font-semibold text-white">Plan inputs</h3>
      </div>

      <Field label="Monthly investment" hint="PKR / month">
        <Input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="stat-num"
        />
      </Field>

      <Field label="Duration" hint="years">
        <Input type="number" min={1} value={years} onChange={(e) => setYears(e.target.value)} />
      </Field>

      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-400">Strategy</p>
        <SegmentedControl options={STRATEGIES} value={strategy} onChange={setStrategy} />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-400">Risk level</p>
        <SegmentedControl options={RISKS} value={risk} onChange={setRisk} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Index">
          <Select value={index} onChange={(e) => setIndex(e.target.value as Index | '')}>
            <option value="">All KMI</option>
            <option value="KMI30">KMI-30</option>
            <option value="KMI100">KMI-100</option>
          </Select>
        </Field>
        <Field label="Holdings">
          <Input
            type="number"
            min={1}
            max={30}
            value={holdings}
            onChange={(e) => setHoldings(e.target.value)}
          />
        </Field>
      </div>

      {/* Advanced filters */}
      <div className="rounded-lg border border-line">
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-medium text-slate-300"
        >
          <span>Advanced filters</span>
          <ChevronDown className={cn('h-4 w-4 transition', showFilters && 'rotate-180')} />
        </button>
        {showFilters && (
          <div className="space-y-3 border-t border-line p-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={filters.shariahOnly}
                onChange={(e) => setF('shariahOnly', e.target.checked)}
                className="accent-emerald"
              />
              Shariah-compliant only
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min div yield" hint="%">
                <Input
                  type="number"
                  value={filters.minDividendYield}
                  onChange={(e) => setF('minDividendYield', e.target.value)}
                  placeholder="5"
                />
              </Field>
              <Field label="Min EPS growth" hint="%">
                <Input
                  type="number"
                  value={filters.minEpsGrowth}
                  onChange={(e) => setF('minEpsGrowth', e.target.value)}
                  placeholder="10"
                />
              </Field>
              <Field label="Max debt ratio" hint="%">
                <Input
                  type="number"
                  value={filters.maxDebtRatio}
                  onChange={(e) => setF('maxDebtRatio', e.target.value)}
                  placeholder="40"
                />
              </Field>
              <Field label="Max volatility" hint="beta">
                <Input
                  type="number"
                  step="0.1"
                  value={filters.maxVolatility}
                  onChange={(e) => setF('maxVolatility', e.target.value)}
                  placeholder="1.2"
                />
              </Field>
            </div>
          </div>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full">
        <Sparkles className="h-4 w-4" />
        Generate plan
      </Button>
    </form>
  );
}
