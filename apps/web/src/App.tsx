import { useQuery } from '@tanstack/react-query';
import { APP_NAME } from '@psx/shared';

interface Health {
  app: string;
  status: string;
  db: string;
  provider: string;
}

function App() {
  const { data, isLoading, isError } = useQuery<Health>({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('health check failed');
      return res.json();
    },
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-emerald-400">{APP_NAME}</h1>
        <p className="mt-2 text-sm text-slate-400">
          Long-term wealth creation for Pakistan Stock Exchange investors.
        </p>
        <div className="mt-6 rounded-lg bg-slate-800 p-4 text-sm">
          <p className="font-semibold text-slate-300">API status</p>
          {isLoading && <p className="text-slate-400">checking…</p>}
          {isError && <p className="text-red-400">API unreachable</p>}
          {data && (
            <ul className="mt-1 space-y-1 text-slate-300">
              <li>status: {data.status}</li>
              <li>db: {data.db}</li>
              <li>provider: {data.provider}</li>
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
