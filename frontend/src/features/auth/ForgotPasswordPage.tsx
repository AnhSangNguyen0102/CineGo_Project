import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, Mail, Lock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';

const requestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const resetSchema = z
  .object({
    code: z.string().min(6, 'Reset code must be 6 digits'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RequestFormValues = z.infer<typeof requestSchema>;
type ResetFormValues = z.infer<typeof resetSchema>;

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const requestForm = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: 'customer@cinego.com' },
  });

  const resetForm = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '123456', newPassword: '', confirmPassword: '' },
  });

  const onRequestSubmit = async (data: RequestFormValues) => {
    try {
      setIsLoading(true);
      const res = await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, data);
      setUserEmail(data.email);
      setStep('reset');
      toast.success(res.data.message || 'Reset code sent! Check your email or use test code 123456');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetFormValues) => {
    try {
      setIsLoading(true);
      await apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, {
        email: userEmail,
        code: data.code,
        newPassword: data.newPassword,
      });
      toast.success('Your password has been reset! Please sign in.', 'Success');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-rose-400 items-center justify-center shadow-lg shadow-brand-500/20 mb-2">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {step === 'request' ? 'Reset Password' : 'Enter New Password'}
          </h1>
          <p className="text-xs text-slate-400">
            {step === 'request'
              ? 'Enter your registered email address to receive a recovery code.'
              : `Enter the 6-digit code sent to ${userEmail} and your new password.`}
          </p>
        </div>

        <div className="bg-cinema-card border border-cinema-border rounded-xl p-6 shadow-xl">
          {step === 'request' ? (
            <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
                error={requestForm.formState.errors.email?.message}
                {...requestForm.register('email')}
              />

              <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
                Send Recovery Code
              </Button>
            </form>
          ) : (
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
              <div className="bg-slate-900/80 border border-cinema-border p-3 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Test reset code <strong>123456</strong> is pre-filled for convenience.</span>
              </div>

              <Input
                label="Reset Code (6 digits)"
                placeholder="123456"
                error={resetForm.formState.errors.code?.message}
                {...resetForm.register('code')}
              />

              <Input
                label="New Password"
                type="password"
                placeholder="Min. 8 characters"
                leftIcon={<Lock className="w-4 h-4" />}
                error={resetForm.formState.errors.newPassword?.message}
                {...resetForm.register('newPassword')}
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Repeat new password"
                leftIcon={<Lock className="w-4 h-4" />}
                error={resetForm.formState.errors.confirmPassword?.message}
                {...resetForm.register('confirmPassword')}
              />

              <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
                Set New Password
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-slate-400 border-t border-cinema-border pt-4 flex items-center justify-center gap-1">
            <Link to="/login" className="inline-flex items-center gap-1 text-slate-300 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
