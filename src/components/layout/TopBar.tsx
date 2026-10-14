import { Bell, Search, Menu } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onMenuClick: () => void;
}

export default function TopBar({ title, subtitle, actions, onMenuClick }: TopBarProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/advertisements?search=${encodeURIComponent(query.trim())}`);
      setQuery('');
    }
  }

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center px-4 sm:px-6 gap-3 sm:gap-4 sticky top-0 z-20">
      <button type="button" onClick={onMenuClick} className="lg:hidden w-9 h-9 rounded-lg hover:bg-surface-2 flex items-center justify-center flex-shrink-0" aria-label="Open navigation">
        <Menu className="w-5 h-5 text-muted" />
      </button>
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-bold text-navy truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
      </div>

      {actions}

      {/* Search */}
      <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 bg-surface-2 border border-border rounded-lg px-3 py-1.5 w-60 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all">
        <Search className="w-3.5 h-3.5 text-muted flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search advertisements…"
          className="flex-1 bg-transparent text-sm text-navy placeholder:text-muted-2 focus:outline-none"
        />
      </form>

      {/* Notifications */}
      <button type="button" className="relative w-9 h-9 rounded-lg hover:bg-surface-2 flex items-center justify-center transition-colors" aria-label="Notifications">
        <Bell className="w-4.5 h-4.5 text-muted" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-critical rounded-full border-2 border-surface"></span>
      </button>
    </header>
  );
}
