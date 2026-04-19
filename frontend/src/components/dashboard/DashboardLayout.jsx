import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Zap, LayoutDashboard, ListTodo, LogOut, Menu, X,
  ChevronRight, User, Bell
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks',     icon: ListTodo,        label: 'Tasks' },
];

function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={clsx(
        'fixed top-0 left-0 h-full z-50 flex flex-col',
        'w-[260px] bg-surface-950/95 backdrop-blur-xl border-r border-white/[0.06]',
        'transition-transform duration-300 ease-out',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-[0_0_16px_rgba(124,92,252,0.4)]">
            <Zap className="w-4 h-4 text-white" fill="currentColor" />
          </div>
          <span className="font-display text-lg font-bold text-white tracking-tight">NeuralQ</span>
          <button className="ml-auto lg:hidden text-gray-500 hover:text-gray-300" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Workspace</p>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} onClick={onClose}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-accent/15 text-accent-light border border-accent/20'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.05]'
              )}>
              {({ isActive }) => (
                <>
                  <Icon className={clsx('w-4 h-4 flex-shrink-0', isActive ? 'text-accent-light' : 'text-gray-600 group-hover:text-gray-300')} />
                  <span>{label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto text-accent/60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User panel */}
        <div className="px-3 py-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl glass mb-2">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-accent-light" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{user?.name}</p>
              <p className="text-xs text-gray-600 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150">
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function Topbar({ onMenuClick }) {
  return (
    <header className="fixed top-0 left-0 lg:left-[260px] right-0 h-16 z-30 flex items-center px-4 lg:px-8 border-b border-white/[0.06] bg-surface-950/80 backdrop-blur-xl">
      <button className="lg:hidden mr-3 p-2 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 transition-all"
        onClick={onMenuClick}>
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-white/[0.06] text-gray-600 hover:text-gray-300 transition-all relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full" />
        </button>
      </div>
    </header>
  );
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar onMenuClick={() => setSidebarOpen(true)} />
      <main className="lg:ml-[260px] pt-16 min-h-screen">
        <div className="p-4 lg:p-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
