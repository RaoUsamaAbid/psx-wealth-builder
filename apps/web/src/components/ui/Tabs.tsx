import { cn } from '../../lib/cn';

export interface TabDef {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-ink-900/50 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition',
            active === t.id
              ? 'bg-ink-700 text-white shadow-card'
              : 'text-slate-400 hover:text-white'
          )}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}
