import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { Role } from '@/types';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If staff tries to access anything other than checkin, redirect to checkin
    if (user.role === 'staff') {
      return <Navigate to="/staff/checkin" replace />;
    }

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
          <ShieldX className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Your current role (<span className="text-brand-400 font-semibold">{user.role}</span>) does not have permission to view this section.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => window.history.back()}>
            Go Back
          </Button>
          <Button variant="primary" onClick={() => (window.location.href = '/')}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
