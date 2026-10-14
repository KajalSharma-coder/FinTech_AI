import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppProvider } from './context/AppContext';
import Dashboard from './pages/Dashboard';
import AdvertisementAnalysis from './pages/AdvertisementAnalysis';
import Investigations from './pages/Investigations';
import Reports from './pages/Reports';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/advertisements" element={<AdvertisementAnalysis />} />
          <Route path="/investigations" element={<Investigations />} />
          <Route path="/reports" element={<Reports />} />
          {/* Catch-all */}
          <Route path="*" element={<Dashboard />} />
        </Routes>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '13px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
            },
          }}
        />
      </AppProvider>
    </BrowserRouter>
  );
}
