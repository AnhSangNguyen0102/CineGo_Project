import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Clapperboard,
  Plus,
  Search,
  Edit2,
  Trash2,
  Film,
  Play,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { Movie } from '@/types';

const movieFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  originalTitle: z.string().optional(),
  synopsis: z.string().min(10, 'Synopsis must be at least 10 characters'),
  director: z.string().min(1, 'Director is required'),
  cast: z.string().min(1, 'Please list cast members separated by commas'),
  durationMinutes: z.coerce.number().min(1, 'Duration must be positive'),
  genres: z.string().min(1, 'Genres separated by commas'),
  ageRating: z.enum(['P', 'K', 'T13', 'T16', 'T18', 'C']),
  posterUrl: z.string().url('Must be a valid URL'),
  bannerUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  trailerUrl: z.string().url('Must be a valid URL'),
  releaseDate: z.string().min(1, 'Release date is required'),
  status: z.enum(['now_showing', 'coming_soon']),
});

type MovieFormData = z.infer<typeof movieFormSchema>;

export const AdminMoviesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Movie | null>(null);

  const { data: movies, isLoading } = useQuery({
    queryKey: ['admin-movies'],
    queryFn: async () => {
      const res = await apiClient.get<Movie[]>(ENDPOINTS.ADMIN.MOVIES);
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MovieFormData>({
    resolver: zodResolver(movieFormSchema),
  });

  const openAddModal = () => {
    setEditingMovie(null);
    reset({
      title: '',
      originalTitle: '',
      synopsis: '',
      director: '',
      cast: '',
      durationMinutes: 120,
      genres: 'Action, Sci-Fi',
      ageRating: 'T16',
      posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600',
      bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200',
      trailerUrl: 'https://www.youtube.com/watch?v=Way9Dexny3w',
      releaseDate: new Date().toISOString().split('T')[0],
      status: 'now_showing',
    });
    setModalOpen(true);
  };

  const openEditModal = (movie: Movie) => {
    setEditingMovie(movie);
    reset({
      title: movie.title,
      originalTitle: movie.originalTitle || '',
      synopsis: movie.synopsis,
      director: movie.director,
      cast: movie.cast.join(', '),
      durationMinutes: movie.durationMinutes,
      genres: movie.genres.join(', '),
      ageRating: movie.ageRating,
      posterUrl: movie.posterUrl,
      bannerUrl: movie.bannerUrl || '',
      trailerUrl: movie.trailerUrl,
      releaseDate: movie.releaseDate,
      status: movie.status,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: MovieFormData) => {
    try {
      const payload = {
        ...data,
        cast: data.cast.split(',').map((c) => c.trim()).filter(Boolean),
        genres: data.genres.split(',').map((g) => g.trim()).filter(Boolean),
        bannerUrl: data.bannerUrl || data.posterUrl,
      };

      if (editingMovie) {
        await apiClient.put(ENDPOINTS.ADMIN.MOVIE_DETAIL(editingMovie.id), payload);
        toast.success(`Movie "${data.title}" updated successfully.`);
      } else {
        await apiClient.post(ENDPOINTS.ADMIN.MOVIES, payload);
        toast.success(`Movie "${data.title}" added to catalog.`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save movie.');
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      const res = await apiClient.delete(ENDPOINTS.ADMIN.MOVIE_DETAIL(deleteCandidate.id));
      toast.info(res.data.message || 'Movie removed or deactivated.');
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      setDeleteCandidate(null);
    } catch {
      toast.error('Failed to delete movie.');
    }
  };

  const filteredMovies = movies?.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.director.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Clapperboard className="w-7 h-7 text-brand-500" />
            Movies Catalog Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Add new films, configure age classifications, edit synopses, and manage exhibition status.
          </p>
        </div>

        <Button variant="primary" onClick={openAddModal} leftIcon={<Plus className="w-4 h-4" />}>
          Add New Movie
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-cinema-card border border-cinema-border p-3 rounded-xl">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search movies by title or director..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="py-1.5"
          />
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap">
          Total Movies: <strong className="text-white">{filteredMovies?.length || 0}</strong>
        </span>
      </div>

      {/* Movies Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Movie Details</TableHead>
            <TableHead>Duration & Rating</TableHead>
            <TableHead>Genres</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMovies?.map((m) => (
            <TableRow key={m.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <img
                    src={m.posterUrl}
                    alt={m.title}
                    className="w-10 h-14 rounded object-cover bg-slate-900 shrink-0"
                  />
                  <div>
                    <h4 className="font-bold text-white text-sm">{m.title}</h4>
                    <p className="text-xs text-slate-400">Dir: {m.director}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <span className="text-xs text-slate-300 block">{m.durationMinutes} min</span>
                  <Badge variant={m.ageRating === 'T18' ? 'danger' : 'warning'} size="sm">
                    {m.ageRating}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {m.genres.map((g) => (
                    <span
                      key={g}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={m.status === 'now_showing' ? 'success' : 'info'} size="sm">
                  {m.status === 'now_showing' ? 'Now Showing' : 'Coming Soon'}
                </Badge>
              </TableCell>
              <TableCell>
                {m.isActive ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Active
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Inactive
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => openEditModal(m)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                    title="Edit movie"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteCandidate(m)}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                    title="Delete or deactivate movie"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Add / Edit Movie Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMovie ? `Edit Movie: ${editingMovie.title}` : 'Add New Movie'}
        maxWidth="2xl"
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
              Save Movie
            </Button>
          </>
        }
      >
        <form className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Movie Title *"
              error={errors.title?.message}
              {...register('title')}
            />
            <Input
              label="Original Title (Optional)"
              {...register('originalTitle')}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Synopsis *
            </label>
            <textarea
              rows={3}
              className="w-full bg-slate-900 border border-cinema-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              {...register('synopsis')}
            />
            {errors.synopsis && (
              <p className="text-xs text-red-400 mt-1">{errors.synopsis.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Director *"
              error={errors.director?.message}
              {...register('director')}
            />
            <Input
              label="Duration (Minutes) *"
              type="number"
              error={errors.durationMinutes?.message}
              {...register('durationMinutes')}
            />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Age Rating *
              </label>
              <select
                className="w-full bg-slate-900 border border-cinema-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                {...register('ageRating')}
              >
                <option value="P">P - General Audience</option>
                <option value="K">K - Under 13 with Guardian</option>
                <option value="T13">T13 - 13+</option>
                <option value="T16">T16 - 16+</option>
                <option value="T18">T18 - 18+</option>
                <option value="C">C - Restricted</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cast Members (comma separated) *"
              placeholder="e.g. Actor A, Actor B"
              error={errors.cast?.message}
              {...register('cast')}
            />
            <Input
              label="Genres (comma separated) *"
              placeholder="e.g. Action, Sci-Fi"
              error={errors.genres?.message}
              {...register('genres')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Poster Image URL *"
              error={errors.posterUrl?.message}
              {...register('posterUrl')}
            />
            <Input
              label="YouTube Trailer URL *"
              error={errors.trailerUrl?.message}
              {...register('trailerUrl')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Release Date *"
              type="date"
              error={errors.releaseDate?.message}
              {...register('releaseDate')}
            />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Exhibition Status *
              </label>
              <select
                className="w-full bg-slate-900 border border-cinema-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                {...register('status')}
              >
                <option value="now_showing">Now Showing</option>
                <option value="coming_soon">Coming Soon</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete / Soft-Deactivate Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleDelete}
        title="Remove or Deactivate Movie"
        message={`Are you sure you want to remove "${deleteCandidate?.title}"? If active showtimes reference this film, it will be safely soft-deactivated instead of deleted.`}
        confirmText="Confirm Deletion"
      />
    </div>
  );
};
