import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './pages/Dashboard';
import AdvertisementAnalysis from './pages/AdvertisementAnalysis';
import Investigations from './pages/Investigations';
import Reports from './pages/Reports';
import EvidenceVault from './pages/EvidenceVault';
import Alerts from './pages/Alerts';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppProvider>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/advertisements" element={<AdvertisementAnalysis />} />
            <Route path="/investigations" element={<Investigations />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/evidence" element={<EvidenceVault />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '13px',
                borderRadius: '10px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-navy)',
              },
            }}
          />
        </AppProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
