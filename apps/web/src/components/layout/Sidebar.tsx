import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Activity,
  Scale,
  Wallet,
  TrendingUp,
  CalendarClock,
} from 'lucide-react';
import { cn } from '../../lib/cn';

const nav = [
  { to: '/', label: 'Planner', icon: LayoutDashboard, end: true },
  { to: '/sips', label: 'My SIPs', icon: CalendarClock },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/market', label: 'Market', icon: Activity },
  { to: '/rebalance', label: 'Rebalance', icon: Scale },
  { to: '/account', label: 'Account', icon: Wallet },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-ink-900/40 p-4 lg:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald/15 text-emerald">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">PSX Wealth</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Builder</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-emerald/10 text-emerald-soft shadow-[inset_0_0_0_1px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:bg-ink-700/50 hover:text-white'
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-xl border border-line bg-ink-850/60 p-3 text-[11px] leading-relaxed text-slate-500">
        Long-term Shariah-compliant wealth planning for PSX (KMI-30 / KMI-100).
      </div>
    </aside>
  );
}
