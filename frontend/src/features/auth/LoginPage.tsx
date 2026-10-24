import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Film, Mail, Lock, Sparkles, User, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from './useAuthStore';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const { login } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'customer@cinego.com',
      password: 'password123',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      const res = await apiClient.post(ENDPOINTS.AUTH.LOGIN, data);
      const { user, token } = res.data;
      login(user, token);
      toast.success(`Welcome back, ${user.fullName}!`, 'Signed In');

      if (user.role === 'staff') {
        navigate('/staff/checkin');
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate(redirectUrl);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = (email: string) => {
    setValue('email', email);
    setValue('password', 'password123');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-rose-400 items-center justify-center shadow-lg shadow-brand-500/20 mb-2">
            <Film className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome to CineGo
          </h1>
          <p className="text-xs text-slate-400">
            Sign in to book tickets, manage reservations, and check in.
          </p>
        </div>

        {/* Quick Demo Credentials Box */}
        <div className="bg-slate-900/80 border border-cinema-border rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              1-Click Demo Accounts
            </span>
            <Badge variant="warning" size="sm">Auto-fill</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleFillDemo('customer@cinego.com')}
              className="px-2 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-500 flex flex-col items-center gap-0.5 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>Customer</span>
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('staff@cinego.com')}
              className="px-2 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-500 flex flex-col items-center gap-0.5 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Staff</span>
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('admin@cinego.com')}
              className="px-2 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-500 flex flex-col items-center gap-0.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        <div className="bg-cinema-card border border-cinema-border rounded-xl p-6 shadow-xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.password?.message}
                {...register('password')}
              />
              <div className="flex justify-end mt-1">
                <Link
                  to="/forgot-password"
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400 border-t border-cinema-border pt-4">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
