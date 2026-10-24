import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Popcorn, Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { FoodItem } from '@/types';
import { formatCurrency } from '@/utils/cn';

const foodSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().min(5, 'Description is required'),
  category: z.enum(['combo', 'popcorn', 'drink', 'snack']),
  price: z.coerce.number().min(0.5, 'Price must be positive'),
  imageUrl: z.string().url('Must be a valid image URL'),
});

type FoodFormData = z.infer<typeof foodSchema>;

export const AdminFoodPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<FoodItem | null>(null);

  const { data: foodItems, isLoading } = useQuery({
    queryKey: ['admin-food'],
    queryFn: async () => {
      const res = await apiClient.get<FoodItem[]>(ENDPOINTS.ADMIN.FOOD);
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FoodFormData>({
    resolver: zodResolver(foodSchema),
  });

  const openAddModal = () => {
    setEditingItem(null);
    reset({
      name: '',
      description: '',
      category: 'combo',
      price: 9.50,
      imageUrl: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=300',
    });
    setModalOpen(true);
  };

  const openEditModal = (item: FoodItem) => {
    setEditingItem(item);
    reset({
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price,
      imageUrl: item.imageUrl,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: FoodFormData) => {
    try {
      if (editingItem) {
        await apiClient.put(ENDPOINTS.ADMIN.FOOD_DETAIL(editingItem.id), data);
        toast.success(`Food item "${data.name}" updated.`);
      } else {
        await apiClient.post(ENDPOINTS.ADMIN.FOOD, data);
        toast.success(`Food item "${data.name}" added.`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-food'] });
      queryClient.invalidateQueries({ queryKey: ['food-items'] });
      setModalOpen(false);
    } catch {
      toast.error('Failed to save food item.');
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await apiClient.delete(ENDPOINTS.ADMIN.FOOD_DETAIL(deleteCandidate.id));
      toast.info('Item deactivated.');
      queryClient.invalidateQueries({ queryKey: ['admin-food'] });
      setDeleteCandidate(null);
    } catch {
      toast.error('Failed to delete item.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Popcorn className="w-7 h-7 text-brand-500" />
            Concessions & Pricing Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage combos, gourmet popcorn, fountain sodas, and concession pricing.
          </p>
        </div>

        <Button variant="primary" onClick={openAddModal} leftIcon={<Plus className="w-4 h-4" />}>
          Add Menu Item
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Concession Item</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {foodItems?.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover bg-slate-900 shrink-0"
                  />
                  <div>
                    <h4 className="font-bold text-white text-xs">{item.name}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{item.description}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="gold" size="sm">
                  {item.category.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-xs font-bold text-white">{formatCurrency(item.price)}</span>
              </TableCell>
              <TableCell>
                {item.isActive ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Available
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Deactivated
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                    title="Edit item"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteCandidate(item)}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                    title="Deactivate item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Add / Edit Food Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `Edit Item: ${editingItem.name}` : 'Add Concession Item'}
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
              Save Item
            </Button>
          </>
        }
      >
        <form className="space-y-4">
          <Input label="Item Name *" error={errors.name?.message} {...register('name')} />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Description *
            </label>
            <textarea
              rows={2}
              className="w-full bg-slate-900 border border-cinema-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Category *
              </label>
              <select
                className="w-full bg-slate-900 border border-cinema-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                {...register('category')}
              >
                <option value="combo">Combo</option>
                <option value="popcorn">Popcorn</option>
                <option value="drink">Drink</option>
                <option value="snack">Snack</option>
              </select>
            </div>

            <Input
              label="Price ($) *"
              type="number"
              step="0.1"
              error={errors.price?.message}
              {...register('price')}
            />
          </div>

          <Input
            label="Image URL *"
            error={errors.imageUrl?.message}
            {...register('imageUrl')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleDelete}
        title="Deactivate Concession Item"
        message={`Are you sure you want to deactivate "${deleteCandidate?.name}" from customer menus?`}
      />
    </div>
  );
};
