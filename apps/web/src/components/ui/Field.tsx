import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-400">
      <span>{children}</span>
      {hint && <span className="text-slate-500">{hint}</span>}
    </label>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label hint={hint}>{label}</Label>
      {children}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('input-base', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn('input-base appearance-none pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg border border-line bg-ink-900/70 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition',
            value === o.value
              ? 'bg-emerald text-ink-950 shadow-glow'
              : 'text-slate-400 hover:text-white'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
