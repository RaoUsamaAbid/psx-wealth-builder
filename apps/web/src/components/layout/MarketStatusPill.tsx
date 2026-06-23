import { useMarket } from '../../store/market';
import { timeAgo } from '../../lib/format';
import { cn } from '../../lib/cn';
import type { MarketStatus } from '../../lib/types';

const dot: Record<MarketStatus, string> = {
  live: 'bg-emerald shadow-[0_0_8px_2px_rgba(16,185,129,0.6)]',
  simulated: 'bg-cyan shadow-[0_0_8px_2px_rgba(34,211,238,0.5)]',
  stale: 'bg-amber-400',
  down: 'bg-rose-500',
};

export function MarketStatusPill() {
  const { snapshot, connected } = useMarket();
  const status = snapshot?.status ?? 'down';

  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-ink-900/70 px-3 py-1.5">
      <span className={cn('h-2 w-2 rounded-full', connected ? dot[status] : 'bg-slate-500')} />
      <span className="text-xs font-medium capitalize text-slate-200">
        {connected ? status : 'offline'}
      </span>
      <span className="hidden text-xs text-slate-500 sm:inline">
        {snapshot?.source ?? '—'} · {timeAgo(snapshot?.lastUpdated ?? null)}
      </span>
    </div>
  );
}
