import { useState } from 'react';
import { PieChart, HeartPulse, CalendarClock, Coins, TrendingUp, Wand2 } from 'lucide-react';
import { usePlanner } from '../store/planner';
import { PlannerForm } from '../features/planner/PlannerForm';
import { AllocationPanel } from '../features/planner/AllocationPanel';
import { HealthPanel } from '../features/planner/HealthPanel';
import { SipPanel } from '../features/planner/SipPanel';
import { DividendPanel } from '../features/planner/DividendPanel';
import { ProjectionPanel } from '../features/planner/ProjectionPanel';
import { Tabs, type TabDef } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/misc';

const tabs: TabDef[] = [
  { id: 'allocation', label: 'Allocation', icon: <PieChart className="h-4 w-4" /> },
  { id: 'health', label: 'Health', icon: <HeartPulse className="h-4 w-4" /> },
  { id: 'sip', label: 'SIP', icon: <CalendarClock className="h-4 w-4" /> },
  { id: 'dividends', label: 'Dividends', icon: <Coins className="h-4 w-4" /> },
  { id: 'projection', label: 'Projection', icon: <TrendingUp className="h-4 w-4" /> },
];

export function DashboardPage() {
  const { request, applied } = usePlanner();
  const [tab, setTab] = useState('allocation');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Wealth Planner</h1>
        <p className="mt-1 text-sm text-slate-400">
          Build a long-term, Shariah-compliant PSX portfolio from a fixed monthly investment.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[330px_1fr]">
        <PlannerForm />

        <div className="min-w-0 space-y-5">
          {!applied ? (
            <EmptyState
              icon={<Wand2 className="h-8 w-8" />}
              title="Generate your plan"
              hint="Set your monthly amount, duration, strategy and risk, then hit Generate plan to see allocation, health, SIP growth, dividends and long-term projections."
            />
          ) : (
            <>
              <Tabs tabs={tabs} active={tab} onChange={setTab} />
              {tab === 'allocation' && <AllocationPanel request={request} />}
              {tab === 'health' && <HealthPanel request={request} />}
              {tab === 'sip' && <SipPanel request={request} />}
              {tab === 'dividends' && <DividendPanel request={request} />}
              {tab === 'projection' && <ProjectionPanel request={request} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
