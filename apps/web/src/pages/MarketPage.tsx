import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, Radio, RefreshCw, Database } from 'lucide-react';
import { useMarket } from '../store/market';
import { timeAgo } from '../lib/format';
import { api, ApiError } from '../lib/api';
import type { SyncStatus, SyncStatusResponse } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, Center, Spinner, ErrorNote } from '../components/ui/misc';
import { cn } from '../lib/cn';

export function MarketPage() {
  const { quotes, prevPrices, snapshot, connected } = useMarket();
  const qc = useQueryClient();
  const list = useMemo(
    () => Object.values(quotes).sort((a, b) => a.symbol.localeCompare(b.symbol)),
    [quotes]
  );

  const sync = useQuery({
    queryKey: ['market', 'sync'],
    queryFn: () => api<SyncStatusResponse>('/market/sync/status'),
    refetchInterval: (q) => (q.state.data?.deep?.running ? 1500 : false),
  });
  const syncMut = useMutation({
    mutationFn: () => api<{ sync: SyncStatus }>('/market/sync', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market', 'sync'] }),
  });
  const deepMut = useMutation({
    mutationFn: () => api<{ started: boolean }>('/market/sync/deep', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market', 'sync'] }),
  });
  const last = sync.data?.sync;
  const deep = sync.data?.deep;
  const deepPct = deep && deep.total > 0 ? Math.round((deep.processed / deep.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Market</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real PSX prices, refreshed on demand from the official market-watch feed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            tone={
              snapshot?.status === 'live'
                ? 'emerald'
                : snapshot?.status === 'simulated'
                  ? 'cyan'
                  : 'amber'
            }
          >
            <Radio className="h-3 w-3" /> {connected ? (snapshot?.status ?? '—') : 'offline'}
          </Badge>
          <Badge tone="slate">
            <Activity className="h-3 w-3" /> {snapshot?.source ?? '—'}
          </Badge>
          <span className="text-xs text-slate-500">
            updated {timeAgo(snapshot?.lastUpdated ?? null)}
          </span>
        </div>
      </div>

      {/* Sync control */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">PSX data sync</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {last
                ? `Last synced ${timeAgo(last.lastSyncedAt)} · ${last.companies} Shariah companies · ${last.quotes} quotes`
                : 'Not synced yet — pull the live KMI-30 / Shariah universe and prices from PSX.'}
            </p>
          </div>
          <Button onClick={() => syncMut.mutate()} loading={syncMut.isPending}>
            <RefreshCw className={cn('h-4 w-4', syncMut.isPending && 'animate-spin')} />
            {syncMut.isPending ? 'Syncing…' : 'Sync market data'}
          </Button>
        </div>
        {syncMut.isError && (
          <div className="mt-3">
            <ErrorNote
              message={syncMut.error instanceof ApiError ? syncMut.error.message : 'Sync failed.'}
            />
          </div>
        )}
        {syncMut.isSuccess && (
          <p className="mt-3 text-xs text-emerald-soft">
            Synced {syncMut.data.sync.companies} companies in {syncMut.data.sync.durationMs}ms. The
            board updates momentarily.
          </p>
        )}

        {/* Deep sync: real fundamentals from company pages */}
        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Deep sync · real fundamentals</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Scrapes each company page for real sector, market cap, P/E, EPS &amp; growth. Runs in
              the background (~1–2 min).
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => deepMut.mutate()}
            loading={deepMut.isPending}
            disabled={deep?.running}
          >
            <Database className="h-4 w-4" />
            {deep?.running ? 'Running…' : 'Deep sync'}
          </Button>
        </div>
        {deep?.running && (
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink-700">
              <div
                className="h-full rounded-full bg-emerald transition-all"
                style={{ width: `${deepPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              {deep.processed} / {deep.total} companies · {deep.updated} updated
            </p>
          </div>
        )}
        {deep && !deep.running && deep.finishedAt && (
          <p className="mt-3 text-xs text-slate-400">
            Deep sync finished {timeAgo(deep.finishedAt)} · {deep.updated} companies enriched.
          </p>
        )}
        {deepMut.isError && (
          <div className="mt-3">
            <ErrorNote
              message={
                deepMut.error instanceof ApiError ? deepMut.error.message : 'Deep sync failed.'
              }
            />
          </div>
        )}
      </Card>

      {list.length === 0 ? (
        <Center>
          <div className="flex flex-col items-center gap-3">
            <Spinner />
            <p className="text-sm text-slate-400">Connecting to market stream…</p>
          </div>
        </Center>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((q) => {
            const prev = prevPrices[q.symbol] ?? q.price;
            const up = q.price >= prev;
            const moved = q.price !== prev;
            return (
              <Card key={q.symbol} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{q.symbol}</span>
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full transition',
                      moved ? (up ? 'bg-emerald' : 'bg-rose-400') : 'bg-slate-600'
                    )}
                  />
                </div>
                <p
                  className={cn(
                    'stat-num mt-2 text-lg font-bold transition-colors',
                    moved ? (up ? 'text-emerald-soft' : 'text-rose-300') : 'text-white'
                  )}
                >
                  {q.price.toFixed(2)}
                </p>
                <p
                  className={cn(
                    'stat-num text-xs',
                    q.changePercent >= 0 ? 'text-emerald-soft' : 'text-rose-300'
                  )}
                >
                  {q.changePercent >= 0 ? '▲' : '▼'} {Math.abs(q.change).toFixed(2)} (
                  {Math.abs(q.changePercent).toFixed(2)}%)
                </p>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Live quotes are display-only; the planning engines use validated reference prices.
      </p>
    </div>
  );
}
