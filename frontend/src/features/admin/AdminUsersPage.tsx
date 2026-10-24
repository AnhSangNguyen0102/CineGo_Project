import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, Plus, Edit2, Shield, CheckCircle, XCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { User, Role } from '@/types';

const userSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  role: z.enum(['customer', 'staff', 'admin']),
});

type UserFormData = z.infer<typeof userSchema>;

export const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await apiClient.get<User[]>(ENDPOINTS.ADMIN.USERS);
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const openAddModal = () => {
    setEditingUser(null);
    reset({
      fullName: '',
      email: '',
      phone: '',
      role: 'customer',
    });
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    reset({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      role: (user.role === 'admin' || user.role === 'staff' ? user.role : 'customer'),
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      if (editingUser) {
        await apiClient.put(ENDPOINTS.ADMIN.USER_DETAIL(editingUser.id), data);
        toast.success(`User "${data.fullName}" updated.`);
      } else {
        await apiClient.post(ENDPOINTS.ADMIN.USERS, data);
        toast.success(`User "${data.fullName}" added.`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setModalOpen(false);
    } catch {
      toast.error('Failed to save user.');
    }
  };

  const toggleUserActive = async (user: User) => {
    try {
      await apiClient.put(ENDPOINTS.ADMIN.USER_DETAIL(user.id), {
        isActive: !user.isActive,
      });
      toast.info(`User ${user.fullName} status updated.`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch {
      toast.error('Failed to update status.');
    }
  };

  const filteredUsers = users?.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-brand-500" />
            Users, Roles & Access Control
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage system access, assign Staff/Admin roles, and deactivate compromised accounts.
          </p>
        </div>

        <Button variant="primary" onClick={openAddModal} leftIcon={<Plus className="w-4 h-4" />}>
          Add User Account
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 bg-cinema-card border border-cinema-border p-3 rounded-xl">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="py-1.5"
          />
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap">
          Total Users: <strong className="text-white">{filteredUsers?.length || 0}</strong>
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User Profile</TableHead>
            <TableHead>Assigned Role</TableHead>
            <TableHead>Contact Phone</TableHead>
            <TableHead>Active Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers?.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <img
                    src={
                      u.avatarUrl ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                    }
                    alt={u.fullName}
                    className="w-9 h-9 rounded-full object-cover bg-slate-900 border border-slate-700"
                  />
                  <div>
                    <h4 className="font-bold text-white text-xs">{u.fullName}</h4>
                    <p className="text-[11px] text-slate-400">{u.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={u.role === 'admin' ? 'danger' : u.role === 'staff' ? 'warning' : 'primary'}
                  size="sm"
                >
                  {u.role.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-xs text-slate-300">{u.phone || '—'}</span>
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  onClick={() => toggleUserActive(u)}
                  className="flex items-center gap-1.5 text-xs font-semibold hover:underline"
                >
                  {u.isActive ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <span className="text-slate-500 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Deactivated
                    </span>
                  )}
                </button>
              </TableCell>
              <TableCell className="text-right">
                <button
                  onClick={() => openEditModal(u)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                  title="Edit user role"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit User Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? `Edit User: ${editingUser.fullName}` : 'Add New Account'}
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit(onSubmit)}
              isLoading={isSubmitting}
            >
              Save User
            </Button>
          </>
        }
      >
        <form className="space-y-4">
          <Input label="Full Name *" error={errors.fullName?.message} {...register('fullName')} />
          <Input label="Email Address *" error={errors.email?.message} {...register('email')} />
          <Input label="Phone Number" {...register('phone')} />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Role Permission *
            </label>
            <select
              className="w-full bg-slate-900 border border-cinema-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              {...register('role')}
            >
              <option value="customer">Customer (Booking & Tickets)</option>
              <option value="staff">Cinema Staff (Gate Scanner)</option>
              <option value="admin">Administrator (Full Access)</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
};
