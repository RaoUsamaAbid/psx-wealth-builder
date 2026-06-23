import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, User, Menu } from 'lucide-react';
import { useAuth } from '../../store/auth';
import { MarketStatusPill } from './MarketStatusPill';
import { cn } from '../../lib/cn';

const mobileNav = [
  { to: '/', label: 'Planner', end: true },
  { to: '/companies', label: 'Companies' },
  { to: '/market', label: 'Market' },
  { to: '/rebalance', label: 'Rebalance' },
  { to: '/account', label: 'Account' },
];

export function Topbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink-950/80 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
        <button className="lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="menu">
          <Menu className="h-5 w-5 text-slate-300" />
        </button>
        <div className="hidden text-sm font-semibold text-white lg:block">
          Portfolio Intelligence
        </div>
        <div className="flex items-center gap-3">
          <MarketStatusPill />
          <div className="flex items-center gap-2 rounded-full border border-line bg-ink-900/70 py-1 pl-1 pr-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald/15 text-emerald">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden max-w-[140px] truncate text-xs text-slate-300 sm:inline">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="text-slate-400 hover:text-rose-300"
              aria-label="logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 border-t border-line p-3 lg:hidden">
          {mobileNav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm',
                  isActive ? 'bg-emerald/10 text-emerald-soft' : 'text-slate-300'
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
