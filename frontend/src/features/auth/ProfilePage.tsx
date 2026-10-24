import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, Calendar, Shield, Save, CheckCircle } from 'lucide-react';
import { useAuthStore } from './useAuthStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      phone: user?.phone || '',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsLoading(true);
      const res = await apiClient.put(ENDPOINTS.AUTH.ME, data);
      updateUser(res.data.user);
      toast.success('Your profile details have been updated.', 'Profile Saved');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Account Profile</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your personal information and cinema membership details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <Card className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <img
              src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
              alt={user.fullName}
              className="w-24 h-24 rounded-full object-cover border-2 border-brand-500 shadow-xl"
            />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-cinema-card">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">{user.fullName}</h3>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>

          <div className="pt-2">
            <Badge
              variant={user.role === 'admin' ? 'danger' : user.role === 'staff' ? 'warning' : 'primary'}
            >
              Role: {user.role.toUpperCase()}
            </Badge>
          </div>

          <div className="w-full pt-4 border-t border-cinema-border space-y-2 text-xs text-slate-400 text-left">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-500" />
              <span>Status: <strong className="text-emerald-400">Active</strong></span>
            </div>
          </div>
        </Card>

        {/* Edit Form */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-white">Personal Information</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Full Name"
                  leftIcon={<User className="w-4 h-4" />}
                  error={errors.fullName?.message}
                  {...register('fullName')}
                />

                <Input
                  label="Email Address (Read-only)"
                  value={user.email}
                  disabled
                  leftIcon={<Mail className="w-4 h-4" />}
                  helperText="Email is bound to your account identity and cannot be edited."
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  leftIcon={<Phone className="w-4 h-4" />}
                  error={errors.phone?.message}
                  {...register('phone')}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
