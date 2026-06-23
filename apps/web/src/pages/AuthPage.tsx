import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ShieldCheck, PiggyBank, LineChart } from 'lucide-react';
import { useAuth } from '../store/auth';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { ErrorNote } from '../components/ui/misc';
import { ApiError } from '../lib/api';

const highlights = [
  { icon: PiggyBank, text: 'Monthly SIP planning into KMI-30 / KMI-100 Shariah stocks' },
  { icon: LineChart, text: 'Wealth projections, dividend forecasts & CAGR scenarios' },
  { icon: ShieldCheck, text: 'Portfolio health scoring and intelligent rebalancing' },
];

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Hero */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(700px_400px_at_30%_20%,rgba(16,185,129,0.15),transparent_60%)]" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald/15 text-emerald">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">PSX Wealth Builder</p>
            <p className="text-xs text-slate-400">Long-term wealth, the halal way.</p>
          </div>
        </div>
        <div className="relative">
          <h1 className="max-w-md text-3xl font-bold leading-tight text-white">
            Turn a fixed monthly amount into a long-term Pakistani portfolio.
          </h1>
          <div className="mt-8 space-y-4">
            {highlights.map((h) => (
              <div key={h.text} className="flex items-center gap-3 text-sm text-slate-300">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-700/70 text-emerald-soft">
                  <h.icon className="h-4 w-4" />
                </div>
                {h.text}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-slate-500">
          Not a brokerage. Not day-trading. Portfolio intelligence & wealth planning.
        </p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <div className="card w-full max-w-sm p-8">
          <h2 className="text-xl font-bold text-white">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {mode === 'login' ? 'Log in to access your planner.' : 'Start building your plan.'}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email">
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </Field>
            <Field label="Password" hint="min 8 characters">
              <Input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </Field>
            {error && <ErrorNote message={error} />}
            <Button type="submit" loading={loading} className="w-full">
              {mode === 'login' ? 'Log in' : 'Create account'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-400">
            {mode === 'login' ? "Don't have an account?" : 'Already registered?'}{' '}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="font-medium text-emerald-soft hover:underline"
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
