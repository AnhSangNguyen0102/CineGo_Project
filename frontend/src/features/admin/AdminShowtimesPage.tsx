import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CalendarDays,
  Plus,
  Clock,
  Trash2,
  AlertTriangle,
  Armchair,
  MapPin,
  Calendar,
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
import { Showtime, Movie, Room, Cinema } from '@/types';
import { formatCurrency, formatTime, formatDate } from '@/utils/cn';

const showtimeSchema = z.object({
  movieId: z.string().min(1, 'Please select a movie'),
  roomId: z.string().min(1, 'Please select a room'),
  startTime: z.string().min(1, 'Start time is required'),
  priceBase: z.coerce.number().min(1, 'Price must be greater than 0'),
});

type ShowtimeFormData = z.infer<typeof showtimeSchema>;

export const AdminShowtimesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Showtime | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const { data: showtimes, isLoading } = useQuery({
    queryKey: ['admin-showtimes'],
    queryFn: async () => {
      const res = await apiClient.get<Showtime[]>(ENDPOINTS.ADMIN.SHOWTIMES);
      return res.data;
    },
  });

  const { data: movies } = useQuery({
    queryKey: ['admin-movies'],
    queryFn: async () => {
      const res = await apiClient.get<Movie[]>(ENDPOINTS.ADMIN.MOVIES);
      return res.data;
    },
  });

  const { data: rooms } = useQuery({
    queryKey: ['admin-rooms'],
    queryFn: async () => {
      const res = await apiClient.get<Room[]>(ENDPOINTS.ADMIN.ROOMS);
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShowtimeFormData>({
    resolver: zodResolver(showtimeSchema),
    defaultValues: {
      priceBase: 14.50,
    },
  });

  const selectedMovieId = watch('movieId');
  const selectedStartTime = watch('startTime');

  const selectedMovieObj = movies?.find((m) => m.id === selectedMovieId);

  // Compute estimated end time preview
  const estimatedEndTime = React.useMemo(() => {
    if (!selectedStartTime || !selectedMovieObj) return '';
    try {
      const startMs = new Date(selectedStartTime).getTime();
      const endMs = startMs + selectedMovieObj.durationMinutes * 60 * 1000;
      return new Date(endMs).toISOString();
    } catch {
      return '';
    }
  }, [selectedStartTime, selectedMovieObj]);

  const openAddModal = () => {
    setConflictError(null);
    reset({
      movieId: movies?.[0]?.id || '',
      roomId: rooms?.[0]?.id || '',
      startTime: '',
      priceBase: 14.50,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: ShowtimeFormData) => {
    try {
      setConflictError(null);
      const movie = movies?.find((m) => m.id === data.movieId);
      const room = rooms?.find((r) => r.id === data.roomId);

      if (!movie || !room) {
        toast.error('Invalid movie or room selection.');
        return;
      }

      const startMs = new Date(data.startTime).getTime();
      const endMs = startMs + movie.durationMinutes * 60 * 1000;
      const endTime = new Date(endMs).toISOString();

      const payload = {
        movieId: movie.id,
        movieTitle: movie.title,
        moviePoster: movie.posterUrl,
        ageRating: movie.ageRating,
        durationMinutes: movie.durationMinutes,
        cinemaId: room.cinemaId,
        cinemaName: room.cinemaName,
        roomId: room.id,
        roomName: room.name,
        startTime: data.startTime,
        endTime,
        priceBase: data.priceBase,
        availableSeats: room.totalSeats,
        totalSeats: room.totalSeats,
        status: 'scheduled',
      };

      await apiClient.post(ENDPOINTS.ADMIN.SHOWTIMES, payload);
      toast.success('Showtime scheduled successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-showtimes'] });
      setModalOpen(false);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setConflictError(
          err.response.data.message ||
            'Schedule conflict: This room already has a scheduled showtime during this time!'
        );
      } else {
        toast.error('Failed to create showtime.');
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      const res = await apiClient.delete(ENDPOINTS.ADMIN.SHOWTIME_DETAIL(deleteCandidate.id));
      toast.info(res.data.message || 'Showtime removed or cancelled.');
      queryClient.invalidateQueries({ queryKey: ['admin-showtimes'] });
      setDeleteCandidate(null);
    } catch {
      toast.error('Failed to delete showtime.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-brand-500" />
            Showtimes Scheduling & Conflicts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Program screening slots across auditoriums with automatic room overlap clash detection.
          </p>
        </div>

        <Button variant="primary" onClick={openAddModal} leftIcon={<Plus className="w-4 h-4" />}>
          Schedule Showtime
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Screening Movie</TableHead>
            <TableHead>Location & Room</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Seats Availability</TableHead>
            <TableHead>Base Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {showtimes?.map((st) => (
            <TableRow key={st.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <img
                    src={st.moviePoster}
                    alt={st.movieTitle}
                    className="w-9 h-12 rounded object-cover bg-slate-900 shrink-0 shadow"
                  />
                  <div>
                    <h4 className="font-bold text-white text-xs">{st.movieTitle}</h4>
                    <span className="text-[10px] text-slate-400 block">{st.durationMinutes} min</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <span className="text-xs font-semibold text-white block">{st.roomName}</span>
                  <span className="text-[11px] text-slate-400">{st.cinemaName}</span>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <span className="text-xs text-white font-medium block">
                    {formatDate(st.startTime)}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatTime(st.startTime)} - {formatTime(st.endTime)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs text-slate-300">
                  <strong className="text-emerald-400">{st.availableSeats}</strong> / {st.totalSeats} seats
                </span>
              </TableCell>
              <TableCell>
                <span className="text-xs font-bold text-white">{formatCurrency(st.priceBase)}</span>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    st.status === 'scheduled'
                      ? 'success'
                      : st.status === 'running'
                      ? 'warning'
                      : 'neutral'
                  }
                  size="sm"
                >
                  {st.status.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <button
                  onClick={() => setDeleteCandidate(st)}
                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                  title="Cancel showtime"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Add Showtime Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule New Screening"
        description="Select film, auditorium, and schedule. The system verifies room availability."
        maxWidth="lg"
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
              Confirm Schedule
            </Button>
          </>
        }
      >
        <form className="space-y-4">
          {/* Overlap Conflict Error Warning */}
          {conflictError && (
            <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/60 text-xs text-red-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-red-300 mb-0.5">
                  Overlapping Showtime Conflict Detected!
                </strong>
                <span>{conflictError}</span>
              </div>
            </div>
          )}

          {/* Movie Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Select Film *
            </label>
            <select
              className="w-full bg-slate-900 border border-cinema-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              {...register('movieId')}
            >
              {movies?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.durationMinutes} min, {m.ageRating})
                </option>
              ))}
            </select>
          </div>

          {/* Room Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Select Auditorium & Cinema *
            </label>
            <select
              className="w-full bg-slate-900 border border-cinema-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              {...register('roomId')}
            >
              {rooms?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.cinemaName} — {r.name} ({r.totalSeats} seats)
                </option>
              ))}
            </select>
          </div>

          {/* Start Time Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date & Time *"
              type="datetime-local"
              error={errors.startTime?.message}
              {...register('startTime')}
            />

            <Input
              label="Standard Ticket Price ($) *"
              type="number"
              step="0.5"
              error={errors.priceBase?.message}
              {...register('priceBase')}
            />
          </div>

          {/* Estimated End Time Preview */}
          {estimatedEndTime && (
            <div className="p-3 rounded-lg bg-slate-900 border border-cinema-border text-xs text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-400" />
                Calculated End Time:
              </span>
              <strong className="text-white">
                {new Date(estimatedEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </strong>
            </div>
          )}
        </form>
      </Modal>

      {/* Delete / Cancel Showtime Modal */}
      <ConfirmDialog
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleDelete}
        title="Cancel Showtime"
        message={`Are you sure you want to cancel the screening of "${deleteCandidate?.movieTitle}" on ${
          deleteCandidate ? formatDate(deleteCandidate.startTime) : ''
        }? If tickets have already been booked, its status will be safely marked as cancelled.`}
        confirmText="Confirm Cancellation"
      />
    </div>
  );
};
