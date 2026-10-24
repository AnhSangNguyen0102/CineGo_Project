import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Film,
  Ticket,
  Clock,
  User as UserIcon,
  LogOut,
  ShieldAlert,
  QrCode,
  LayoutDashboard,
  Menu,
  X,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useBookingStore } from '@/features/booking/useBookingStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout, login } = useAuthStore();
  const { selectedSeats, holdingSecondsLeft, isTimerRunning } = useBookingStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [demoSwitchOpen, setDemoSwitchOpen] = useState(false);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleQuickLogin = (role: 'customer' | 'staff' | 'admin') => {
    setDemoSwitchOpen(false);
    if (role === 'customer') {
      login(
        {
          id: 'usr_customer_1',
          email: 'customer@cinego.com',
          fullName: 'Alex Rivera',
          phone: '+1 (555) 234-5678',
          role: 'customer',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          isActive: true,
          createdAt: '2026-01-10T08:00:00Z',
        },
        'mock_token_usr_customer_1'
      );
    } else if (role === 'staff') {
      login(
        {
          id: 'usr_staff_1',
          email: 'staff@cinego.com',
          fullName: 'Sarah Jenkins',
          phone: '+1 (555) 876-5432',
          role: 'staff',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          isActive: true,
          createdAt: '2026-01-05T09:00:00Z',
        },
        'mock_token_usr_staff_1'
      );
      navigate('/staff/checkin');
    } else if (role === 'admin') {
      login(
        {
          id: 'usr_admin_1',
          email: 'admin@cinego.com',
          fullName: 'Marcus Vance',
          phone: '+1 (555) 999-1234',
          role: 'admin',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          isActive: true,
          createdAt: '2026-01-01T00:00:00Z',
        },
        'mock_token_usr_admin_1'
      );
      navigate('/admin/dashboard');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cinema-border bg-cinema-darker/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-rose-400 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-wider text-white flex items-center gap-1">
                  CINE<span className="text-brand-500">GO</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-400 font-bold uppercase tracking-wider ml-1">
                    Smart
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 tracking-widest uppercase -mt-1">
                  Cinema Experience
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/' ? 'text-brand-400 bg-brand-500/10' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                Movies
              </Link>
              {isAuthenticated && (
                <Link
                  to="/tickets"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    location.pathname === '/tickets' ? 'text-brand-400 bg-brand-500/10' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Ticket className="w-4 h-4" />
                  My Tickets
                </Link>
              )}
              {(user?.role === 'staff' || user?.role === 'admin') && (
                <Link
                  to="/staff/checkin"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    location.pathname.startsWith('/staff') ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-cyan-400" />
                  Staff Check-In
                </Link>
              )}
              {user?.role === 'admin' && (
                <Link
                  to="/admin/dashboard"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    location.pathname.startsWith('/admin') ? 'text-amber-400 bg-amber-500/10' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-amber-400" />
                  Admin Portal
                </Link>
              )}
            </nav>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Real-time Locked Seats Countdown Pill */}
            {isTimerRunning && selectedSeats.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full animate-pulse-subtle">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300">
                  Seats held: {selectedSeats.length}
                </span>
                <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded-full">
                  {formatTimer(holdingSecondsLeft)}
                </span>
              </div>
            )}

            {/* Quick Demo Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDemoSwitchOpen(!demoSwitchOpen)}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                title="Switch test persona instantly"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Demo Roles</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {demoSwitchOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-cinema-card border border-cinema-border rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2"
                  onMouseLeave={() => setDemoSwitchOpen(false)}
                >
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
                    Quick Role Switch
                  </p>
                  <button
                    onClick={() => handleQuickLogin('customer')}
                    className="w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-slate-800 flex items-center justify-between text-slate-200 hover:text-white"
                  >
                    <span>Customer (Alex)</span>
                    <Badge variant="info" size="sm">Customer</Badge>
                  </button>
                  <button
                    onClick={() => handleQuickLogin('staff')}
                    className="w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-slate-800 flex items-center justify-between text-slate-200 hover:text-white"
                  >
                    <span>Staff (Sarah)</span>
                    <Badge variant="warning" size="sm">Staff</Badge>
                  </button>
                  <button
                    onClick={() => handleQuickLogin('admin')}
                    className="w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-slate-800 flex items-center justify-between text-slate-200 hover:text-white"
                  >
                    <span>Admin (Marcus)</span>
                    <Badge variant="danger" size="sm">Admin</Badge>
                  </button>
                </div>
              )}
            </div>

            {/* User Profile or Login */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-800/80 transition-colors"
                  aria-label="User menu"
                >
                  <img
                    src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={user.fullName}
                    className="w-8 h-8 rounded-full object-cover border border-slate-700"
                  />
                  <span className="hidden lg:block text-sm font-medium text-slate-200">
                    {user.fullName}
                  </span>
                  <ChevronDown className="hidden lg:block w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-cinema-card border border-cinema-border rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-cinema-border">
                      <p className="text-sm font-semibold text-white truncate">{user.fullName}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      <div className="mt-1.5">
                        <Badge
                          variant={user.role === 'admin' ? 'danger' : user.role === 'staff' ? 'warning' : 'primary'}
                          size="sm"
                        >
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        My Profile
                      </Link>
                      <Link
                        to="/tickets"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Ticket className="w-4 h-4 text-slate-400" />
                        Booking History
                      </Link>
                      {user.role === 'admin' && (
                        <Link
                          to="/admin/dashboard"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
                        >
                          <ShieldAlert className="w-4 h-4 text-amber-400" />
                          Admin Console
                        </Link>
                      )}
                      {user.role === 'staff' && (
                        <Link
                          to="/staff/checkin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
                        >
                          <QrCode className="w-4 h-4 text-cyan-400" />
                          Ticket Scanner
                        </Link>
                      )}
                    </div>
                    <div className="pt-1 border-t border-cinema-border">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                          navigate('/login');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Register
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-cinema-border space-y-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-800"
            >
              Movies Catalog
            </Link>
            {isAuthenticated && (
              <Link
                to="/tickets"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-800"
              >
                My Tickets
              </Link>
            )}
            {(user?.role === 'staff' || user?.role === 'admin') && (
              <Link
                to="/staff/checkin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-cyan-300 hover:bg-cyan-500/10"
              >
                Staff QR Check-In
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-amber-300 hover:bg-amber-500/10"
              >
                Admin Dashboard
              </Link>
            )}

            {/* Mobile Quick Demo Switcher */}
            <div className="pt-2 border-t border-cinema-border">
              <p className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1">
                Demo Quick Login:
              </p>
              <div className="flex gap-2 px-3">
                <Button size="sm" variant="outline" onClick={() => handleQuickLogin('customer')}>
                  Customer
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleQuickLogin('staff')}>
                  Staff
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleQuickLogin('admin')}>
                  Admin
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
