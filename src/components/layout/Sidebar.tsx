import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  FolderOpen,
  FileBarChart,
  Shield,
  ChevronRight,
  X,
} from 'lucide-react';

const navItems = [
  { to: '/',               icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/advertisements', icon: Search,           label: 'Scan Advertisements' },
  { to: '/investigations', icon: FolderOpen,        label: 'Investigations' },
  { to: '/reports',        icon: FileBarChart,      label: 'Reports' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className={`fixed top-0 left-0 h-screen w-60 bg-surface border-r border-border flex flex-col z-40 shadow-card transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black text-navy tracking-tight">TRACE<span className="text-accent">//</span>FIN</p>
          <p className="text-[10px] text-muted font-medium leading-tight">Threat Intelligence</p>
        </div>
        <button type="button" onClick={onClose} className="lg:hidden w-8 h-8 rounded-lg hover:bg-surface-2 flex items-center justify-center" aria-label="Close navigation">
          <X className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-muted uppercase tracking-wider px-3 mb-2">Navigation</p>
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={isActive ? 'nav-link-active' : 'nav-link'}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent-mid flex items-center justify-center">
            <span className="text-xs font-bold text-accent">AR</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-navy truncate">A. Reyes</p>
            <p className="text-[10px] text-muted truncate">Senior Analyst</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
