import { useMarket } from '../../store/market';
import { cn } from '../../lib/cn';

const PRIORITY = ['OGDC', 'MEBL', 'LUCK', 'ENGRO', 'FFC', 'PSO', 'HUBC', 'SYS', 'PPL', 'NESTLE'];

export function Ticker() {
  const { quotes, prevPrices } = useMarket();
  const list = Object.values(quotes);
  if (list.length === 0) return null;

  const ordered = [...list].sort((a, b) => {
    const ia = PRIORITY.indexOf(a.symbol);
    const ib = PRIORITY.indexOf(b.symbol);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
  const items = [...ordered, ...ordered]; // duplicate for seamless marquee

  return (
    <div className="relative overflow-hidden border-b border-line bg-ink-900/40">
      <div className="flex w-max animate-[marquee_60s_linear_infinite] gap-6 py-2">
        {items.map((q, i) => {
          const prev = prevPrices[q.symbol] ?? q.price;
          const up = q.price >= prev;
          return (
            <div key={`${q.symbol}-${i}`} className="flex items-center gap-2 px-1 text-xs">
              <span className="font-semibold text-slate-300">{q.symbol}</span>
              <span className="stat-num text-slate-400">{q.price.toFixed(2)}</span>
              <span
                className={cn(
                  'stat-num',
                  q.changePercent >= 0 ? 'text-emerald-soft' : 'text-rose-300'
                )}
              >
                {q.changePercent >= 0 ? '▲' : '▼'} {Math.abs(q.changePercent).toFixed(2)}%
              </span>
              <span className={cn('h-1 w-1 rounded-full', up ? 'bg-emerald' : 'bg-rose-400')} />
            </div>
          );
        })}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}
