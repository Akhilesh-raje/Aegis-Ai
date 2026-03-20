import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Simulation from './pages/Simulation';
import Logs from './pages/Logs';
import SOAR from './pages/SOAR';
import ThreatIntelligence from './pages/ThreatIntelligence';
import NetworkMonitor from './pages/NetworkMonitor';
import Investigation from './pages/Investigation';
import Settings from './pages/Settings';
import WarRoom from './pages/WarRoom';
import Fleet from './pages/Fleet';
import { AuraProvider } from './components/layout/AuraProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuraProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/network" element={<NetworkMonitor />} />
              <Route path="/threats" element={<ThreatIntelligence />} />
              <Route path="/investigation" element={<Investigation />} />
              <Route path="/soar" element={<SOAR />} />
              <Route path="/simulation" element={<Simulation />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/fleet" element={<Fleet />} />
              <Route path="/war-room" element={<WarRoom />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuraProvider>
    </QueryClientProvider>
  );
}

export default App;
