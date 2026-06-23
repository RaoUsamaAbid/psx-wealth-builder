import { useMemo } from 'react';
import { Activity, Radio } from 'lucide-react';
import { useMarket } from '../store/market';
import { timeAgo } from '../lib/format';
import { Card } from '../components/ui/Card';
import { Badge, Center, Spinner } from '../components/ui/misc';
import { cn } from '../lib/cn';

export function MarketPage() {
  const { quotes, prevPrices, snapshot, connected } = useMarket();
  const list = useMemo(
    () => Object.values(quotes).sort((a, b) => a.symbol.localeCompare(b.symbol)),
    [quotes]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Market</h1>
          <p className="mt-1 text-sm text-slate-400">
            Realtime PSX quotes, streamed over websockets.
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
