import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Ticker } from './Ticker';
import { useMarketSocket } from '../../hooks/useMarketSocket';

export function AppLayout() {
  useMarketSocket(); // open the realtime stream once for the whole app

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <Ticker />
        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-7xl animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
