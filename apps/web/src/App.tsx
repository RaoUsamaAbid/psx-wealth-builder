import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/auth';
import { AppLayout } from './components/layout/AppLayout';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { MarketPage } from './pages/MarketPage';
import { RebalancePage } from './pages/RebalancePage';
import { AccountPage } from './pages/AccountPage';
import { SipsPage } from './pages/SipsPage';

function App() {
  const token = useAuth((s) => s.token);

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route element={token ? <AppLayout /> : <Navigate to="/login" replace />}>
        <Route index element={<DashboardPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="market" element={<MarketPage />} />
        <Route path="rebalance" element={<RebalancePage />} />
        <Route path="sips" element={<SipsPage />} />
        <Route path="account" element={<AccountPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
