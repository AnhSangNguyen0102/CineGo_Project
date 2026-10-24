import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Film,
  LayoutDashboard,
  Clapperboard,
  Armchair,
  CalendarDays,
  Popcorn,
  Ticket,
  Users,
  LogOut,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { Badge } from '@/components/ui/Badge';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const navItems = [
    { label: 'Dashboard & KPI', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Movies Catalog', path: '/admin/movies', icon: Clapperboard },
    { label: 'Rooms & Seat Layouts', path: '/admin/rooms', icon: Armchair },
    { label: 'Showtimes Scheduler', path: '/admin/showtimes', icon: CalendarDays },
    { label: 'Concessions & Snacks', path: '/admin/food', icon: Popcorn },
    { label: 'Bookings & Orders', path: '/admin/bookings', icon: Ticket },
    { label: 'Users & Permissions', path: '/admin/users', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-cinema-darker flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-cinema-dark border-r border-cinema-border flex flex-col shrink-0">
        {/* Brand */}
        <div className="p-5 border-b border-cinema-border flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-rose-400 flex items-center justify-center text-white">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-wide">
                CINE<span className="text-brand-500">GO</span>
              </span>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block -mt-1">
                Admin Console
              </span>
            </div>
          </Link>
          <Badge variant="danger" size="sm">Admin</Badge>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer / User info */}
        <div className="p-4 border-t border-cinema-border bg-slate-900/40 space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
              alt={user?.fullName}
              className="w-9 h-9 rounded-full object-cover border border-slate-700"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user?.fullName}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Link
              to="/"
              className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Site</span>
            </Link>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin Content Body */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
