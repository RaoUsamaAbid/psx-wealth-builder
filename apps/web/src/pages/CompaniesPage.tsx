import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Building2 } from 'lucide-react';
import type { Company } from '@psx/shared';
import { api } from '../lib/api';
import type { CompaniesResponse, CompanyDetail } from '../lib/types';
import { pkrCompact, pkr, pctFromFraction, num } from '../lib/format';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Field';
import { Badge, Center, Spinner, ErrorNote } from '../components/ui/misc';
import { cn } from '../lib/cn';

export function CompaniesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api<CompaniesResponse>('/companies'),
  });
  const [q, setQ] = useState('');
  const [sector, setSector] = useState('');
  const [index, setIndex] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const sectors = useMemo(
    () => [...new Set((data?.companies ?? []).map((c) => c.sector))].sort(),
    [data]
  );
  const rows = useMemo(() => {
    let list = data?.companies ?? [];
    if (q) {
      const s = q.toLowerCase();
      list = list.filter(
        (c) => c.symbol.toLowerCase().includes(s) || c.companyName.toLowerCase().includes(s)
      );
    }
    if (sector) list = list.filter((c) => c.sector === sector);
    if (index) list = list.filter((c) => c.indices.includes(index as Company['indices'][number]));
    return list;
  }, [data, q, sector, index]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Companies</h1>
        <p className="mt-1 text-sm text-slate-400">Browse the KMI Shariah-compliant universe.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search symbol or name…"
            className="pl-9"
          />
        </div>
        <Select value={sector} onChange={(e) => setSector(e.target.value)} className="sm:w-52">
          <option value="">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select value={index} onChange={(e) => setIndex(e.target.value)} className="sm:w-40">
          <option value="">All indices</option>
          <option value="KMI30">KMI-30</option>
          <option value="KMI100">KMI-100</option>
        </Select>
      </div>

      {isLoading ? (
        <Center>
          <Spinner />
        </Center>
      ) : isError ? (
        <ErrorNote message="Failed to load companies." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-850 text-left text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-3 py-3 font-medium">Company</th>
                  <th className="px-3 py-3 font-medium">Sector</th>
                  <th className="px-3 py-3 text-right font-medium">Market cap</th>
                  <th className="px-4 py-3 font-medium">Indices</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.symbol}
                    onClick={() => setSelected(c.symbol)}
                    className="cursor-pointer border-t border-line/60 hover:bg-ink-800/50"
                  >
                    <td className="px-4 py-3 font-semibold text-white">{c.symbol}</td>
                    <td className="px-3 py-3 text-slate-300">{c.companyName}</td>
                    <td className="px-3 py-3 text-xs text-slate-400">{c.sector}</td>
                    <td className="stat-num px-3 py-3 text-right text-slate-300">
                      {pkrCompact(c.marketCap)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {c.indices.map((i) => (
                          <Badge key={i} tone={i === 'KMI30' ? 'emerald' : 'cyan'}>
                            {i}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                      No companies match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selected && <CompanyDrawer symbol={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CompanyDrawer({ symbol, onClose }: { symbol: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['company', symbol],
    queryFn: () => api<CompanyDetail>(`/companies/${symbol}`),
  });

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-ink-900 p-6 shadow-2xl animate-[fade-up_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10 text-emerald">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{symbol}</h3>
              <p className="text-xs text-slate-400">{data?.company.companyName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading || !data ? (
          <Center>
            <Spinner />
          </Center>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone="slate">{data.company.sector}</Badge>
              {data.company.indices.map((i) => (
                <Badge key={i} tone={i === 'KMI30' ? 'emerald' : 'cyan'}>
                  {i}
                </Badge>
              ))}
              {data.company.shariahCompliant && <Badge tone="emerald">Shariah</Badge>}
            </div>

            {data.quote && (
              <div className="rounded-xl border border-line bg-ink-850 p-4">
                <p className="text-xs text-slate-400">Last price</p>
                <p className="stat-num text-2xl font-bold text-white">{pkr(data.quote.price)}</p>
                <p
                  className={cn(
                    'stat-num text-sm',
                    data.quote.changePercent >= 0 ? 'text-emerald-soft' : 'text-rose-300'
                  )}
                >
                  {data.quote.changePercent >= 0 ? '▲' : '▼'}{' '}
                  {Math.abs(data.quote.changePercent).toFixed(2)}%
                </p>
              </div>
            )}

            {data.fundamentals && (
              <div>
                <p className="mb-2 text-xs font-medium text-slate-400">Fundamentals</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['EPS', pkr(data.fundamentals.eps)],
                    ['P/E', data.fundamentals.peRatio.toFixed(1)],
                    ['Div yield', pctFromFraction(data.fundamentals.dividendYield)],
                    ['EPS growth', pctFromFraction(data.fundamentals.epsGrowth)],
                    ['ROE', pctFromFraction(data.fundamentals.roe)],
                    ['Debt ratio', pctFromFraction(data.fundamentals.debtRatio)],
                    ['Beta', data.fundamentals.beta.toFixed(2)],
                    ['Book value', pkr(data.fundamentals.bookValue)],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-line bg-ink-900/50 p-2.5">
                      <p className="text-[11px] text-slate-400">{k}</p>
                      <p className="stat-num text-sm font-semibold text-white">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.dividends.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-slate-400">
                  Dividend history (per share)
                </p>
                <div className="flex items-end gap-2">
                  {data.dividends.map((d) => {
                    const max = Math.max(...data.dividends.map((x) => x.amountPerShare));
                    return (
                      <div key={d.year} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-emerald/70"
                          style={{ height: `${Math.max(6, (d.amountPerShare / max) * 80)}px` }}
                        />
                        <span className="stat-num text-[10px] text-slate-400">
                          {d.amountPerShare.toFixed(0)}
                        </span>
                        <span className="text-[10px] text-slate-500">{d.year}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-[11px] leading-relaxed text-slate-500">
              Market cap {pkrCompact(data.company.marketCap)} · {num(data.dividends.length)} years
              of dividend history. Fundamentals are illustrative seed values pending the live data
              feed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
