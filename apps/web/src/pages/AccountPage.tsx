import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Star, History, Trash2, Play, Plus } from 'lucide-react';
import { api } from '../lib/api';
import type { HistoryItem, SavedPortfolio, WatchItem } from '../lib/types';
import { usePlanner } from '../store/planner';
import { pkr, shortDate } from '../lib/format';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { Tabs } from '../components/ui/Tabs';
import { Badge, Center, Spinner, EmptyState } from '../components/ui/misc';

export function AccountPage() {
  const [tab, setTab] = useState('saved');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Your saved plans, watchlist and investment log.
        </p>
      </div>
      <Tabs
        tabs={[
          { id: 'saved', label: 'Saved plans', icon: <Bookmark className="h-4 w-4" /> },
          { id: 'watchlist', label: 'Watchlist', icon: <Star className="h-4 w-4" /> },
          { id: 'history', label: 'History', icon: <History className="h-4 w-4" /> },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'saved' && <SavedTab />}
      {tab === 'watchlist' && <WatchlistTab />}
      {tab === 'history' && <HistoryTab />}
    </div>
  );
}

function SavedTab() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const apply = usePlanner((s) => s.apply);
  const { data, isLoading } = useQuery({
    queryKey: ['me', 'portfolios'],
    queryFn: () => api<{ portfolios: SavedPortfolio[] }>('/me/portfolios'),
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/me/portfolios/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'portfolios'] }),
  });

  if (isLoading)
    return (
      <Center>
        <Spinner />
      </Center>
    );
  if (!data || data.portfolios.length === 0)
    return (
      <EmptyState
        icon={<Bookmark className="h-8 w-8" />}
        title="No saved plans yet"
        hint="Generate a plan, then Save it to keep it here."
      />
    );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {data.portfolios.map((p) => (
        <Card key={p.id} className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-white">{p.name}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge tone="emerald">{p.request.strategy}</Badge>
              <Badge tone="slate">{p.request.riskLevel} risk</Badge>
              <Badge tone="cyan">{pkr(p.request.monthlyInvestmentAmount)}/mo</Badge>
              <Badge tone="slate">{p.request.durationYears}y</Badge>
            </div>
            <p className="mt-2 text-xs text-slate-500">Saved {shortDate(p.createdAt)}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <Button
              size="sm"
              onClick={() => {
                apply(p.request);
                navigate('/');
              }}
            >
              <Play className="h-3.5 w-3.5" /> Load
            </Button>
            <Button size="sm" variant="ghost" onClick={() => del.mutate(p.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function WatchlistTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['me', 'watchlist'],
    queryFn: () => api<{ watchlist: WatchItem[] }>('/me/watchlist'),
  });
  const del = useMutation({
    mutationFn: (symbol: string) => api(`/me/watchlist/${symbol}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'watchlist'] }),
  });

  if (isLoading)
    return (
      <Center>
        <Spinner />
      </Center>
    );
  if (!data || data.watchlist.length === 0)
    return (
      <EmptyState
        icon={<Star className="h-8 w-8" />}
        title="Watchlist is empty"
        hint="Star a company from your generated allocation to track it."
      />
    );

  return (
    <div className="flex flex-wrap gap-2">
      {data.watchlist.map((w) => (
        <div
          key={w.symbol}
          className="flex items-center gap-2 rounded-lg border border-line bg-ink-850 px-3 py-2"
        >
          <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
          <span className="font-semibold text-white">{w.symbol}</span>
          <button
            onClick={() => del.mutate(w.symbol)}
            className="text-slate-500 hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function HistoryTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ symbol: '', shares: '', price: '', note: '' });
  const { data, isLoading } = useQuery({
    queryKey: ['me', 'history'],
    queryFn: () => api<{ history: HistoryItem[] }>('/me/history'),
  });
  const add = useMutation({
    mutationFn: () =>
      api('/me/history', {
        method: 'POST',
        body: {
          symbol: form.symbol.trim().toUpperCase(),
          shares: Number(form.shares),
          price: Number(form.price),
          note: form.note || undefined,
        },
      }),
    onSuccess: () => {
      setForm({ symbol: '', shares: '', price: '', note: '' });
      qc.invalidateQueries({ queryKey: ['me', 'history'] });
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/me/history/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'history'] }),
  });

  const valid = form.symbol && Number(form.shares) > 0 && Number(form.price) > 0;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Symbol"
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            className="uppercase sm:w-32"
          />
          <Input
            placeholder="Shares"
            type="number"
            value={form.shares}
            onChange={(e) => setForm({ ...form, shares: e.target.value })}
            className="sm:w-28"
          />
          <Input
            placeholder="Price"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="sm:w-28"
          />
          <Input
            placeholder="Note (optional)"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="flex-1"
          />
          <Button onClick={() => add.mutate()} loading={add.isPending} disabled={!valid}>
            <Plus className="h-4 w-4" /> Log
          </Button>
        </div>
        {add.isError && (
          <p className="mt-2 text-xs text-rose-300">Could not add — check the symbol exists.</p>
        )}
      </Card>

      {isLoading ? (
        <Center>
          <Spinner />
        </Center>
      ) : !data || data.history.length === 0 ? (
        <EmptyState
          icon={<History className="h-8 w-8" />}
          title="No transactions logged"
          hint="Record your buys to track your real portfolio."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-850 text-left text-xs text-slate-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Symbol</th>
                <th className="px-3 py-2.5 text-right font-medium">Shares</th>
                <th className="px-3 py-2.5 text-right font-medium">Price</th>
                <th className="px-3 py-2.5 font-medium">Note</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {data.history.map((h) => (
                <tr key={h.id} className="border-t border-line/60">
                  <td className="px-4 py-2.5 text-xs text-slate-400">{shortDate(h.date)}</td>
                  <td className="px-3 py-2.5 font-semibold text-white">{h.symbol}</td>
                  <td className="stat-num px-3 py-2.5 text-right text-slate-300">{h.shares}</td>
                  <td className="stat-num px-3 py-2.5 text-right text-slate-300">{pkr(h.price)}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{h.note ?? '—'}</td>
                  <td className="pr-3">
                    <button
                      onClick={() => del.mutate(h.id)}
                      className="text-slate-500 hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
