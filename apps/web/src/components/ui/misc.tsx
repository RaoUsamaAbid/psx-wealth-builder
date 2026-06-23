import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-emerald', className)} />;
}

export function Center({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[200px] items-center justify-center">{children}</div>;
}

type Tone = 'emerald' | 'slate' | 'amber' | 'rose' | 'cyan';
const toneMap: Record<Tone, string> = {
  emerald: 'bg-emerald/15 text-emerald-soft border-emerald/30',
  cyan: 'bg-cyan/15 text-cyan border-cyan/30',
  slate: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  amber: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export function Badge({ tone = 'slate', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        toneMap[tone]
      )}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'up' | 'down';
}) {
  return (
    <div className="rounded-xl border border-line bg-ink-900/50 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p
        className={cn(
          'stat-num mt-1 text-xl font-semibold',
          tone === 'up' && 'text-emerald-soft',
          tone === 'down' && 'text-rose-300',
          !tone && 'text-white'
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line py-12 text-center">
      {icon && <div className="mb-3 text-slate-500">{icon}</div>}
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} />;
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
      {message}
    </div>
  );
}
