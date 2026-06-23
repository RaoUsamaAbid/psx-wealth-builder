import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { HealthGrade, PortfolioRequest } from '@psx/shared';
import { useHealth } from '../../hooks/usePlannerQueries';
import { ApiError } from '../../lib/api';
import { pct, pctFromFraction } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { Badge, ErrorNote, Skeleton } from '../../components/ui/misc';

const gradeColor: Record<HealthGrade, string> = {
  A: '#10b981',
  B: '#34d399',
  C: '#facc15',
  D: '#fb923c',
  E: '#f43f5e',
};

function ScoreRing({ score, grade }: { score: number; grade: HealthGrade }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="rgba(148,163,184,0.12)"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={gradeColor[grade]}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute text-center">
        <p className="stat-num text-3xl font-bold text-white">{Math.round(score)}</p>
        <p className="text-xs text-slate-400">/ 100</p>
      </div>
    </div>
  );
}

export function HealthPanel({ request }: { request: PortfolioRequest }) {
  const { data, isLoading, isError, error } = useHealth(request, true);
  if (isLoading) return <Skeleton className="h-72" />;
  if (isError) return <ErrorNote message={error instanceof ApiError ? error.message : 'Failed.'} />;
  if (!data) return null;

  const h = data.health;
  const radar = [
    { k: 'Diversification', v: h.components.diversification },
    { k: 'Risk', v: h.components.risk },
    { k: 'Dividends', v: h.components.dividendStrength },
    { k: 'Growth', v: h.components.growthPotential },
    { k: 'Sectors', v: h.components.sectorExposure },
  ];
  const metrics = [
    ['Effective holdings', h.metrics.effectiveHoldings.toFixed(1)],
    ['Sectors', String(h.metrics.sectorCount)],
    ['Top sector', `${h.metrics.topSector} ${pct(h.metrics.topSectorWeight)}`],
    ['Portfolio beta', h.metrics.portfolioBeta.toFixed(2)],
    ['Avg debt ratio', pctFromFraction(h.metrics.portfolioDebtRatio)],
    ['Avg div yield', pctFromFraction(h.metrics.portfolioDividendYield)],
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Card className="lg:col-span-2 flex flex-col items-center justify-center gap-3">
        <ScoreRing score={h.score} grade={h.grade} />
        <Badge
          tone={h.grade === 'A' || h.grade === 'B' ? 'emerald' : h.grade === 'C' ? 'amber' : 'rose'}
        >
          Grade {h.grade}
        </Badge>
        <p className="text-xs text-slate-400">Overall portfolio health</p>
      </Card>

      <Card className="lg:col-span-3">
        <h3 className="mb-2 text-sm font-semibold text-white">Health breakdown</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radar} outerRadius="75%">
              <PolarGrid stroke="rgba(148,163,184,0.15)" />
              <PolarAngleAxis dataKey="k" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Radar dataKey="v" stroke="#10b981" fill="#10b981" fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="lg:col-span-5">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-line bg-ink-900/40 p-3">
              <p className="text-[11px] text-slate-400">{label}</p>
              <p className="stat-num mt-0.5 text-sm font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {h.notes.map((n, i) => {
            const positive = n.toLowerCase().includes('well-balanced');
            return (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                {positive ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                )}
                {n}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
