import { useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AppShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function AppShell({ children, title, subtitle, actions }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen min-w-0 overflow-x-hidden bg-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <button type="button" className="fixed inset-0 z-30 bg-navy/25 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
      <div className="flex-1 min-w-0 lg:ml-60 flex flex-col min-h-screen">
        <TopBar title={title} subtitle={subtitle} actions={actions} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 min-w-0 p-4 sm:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
