import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Ticket,
  Calendar,
  Clock,
  ArrowRight,
  Armchair,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { Booking } from '@/types';
import { formatCurrency, formatTime, formatDate } from '@/utils/cn';

export const BookingHistoryPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'valid' | 'used'>('all');

  const { data: bookings, isLoading, isError } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: async () => {
      const res = await apiClient.get<Booking[]>(ENDPOINTS.ORDERS.MY_ORDERS);
      return res.data;
    },
  });

  const filteredBookings = bookings?.filter((b) => {
    if (filter === 'valid') return b.checkInStatus === 'valid';
    if (filter === 'used') return b.checkInStatus === 'used';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Ticket className="w-7 h-7 text-brand-500" />
            My Tickets & Booking History
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Access your active cinema passes, scannable QR tickets, and past reservation records.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 bg-cinema-card border border-cinema-border p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'all' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Bookings
          </button>
          <button
            type="button"
            onClick={() => setFilter('valid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'valid' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Valid Passes
          </button>
          <button
            type="button"
            onClick={() => setFilter('used')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'used' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Checked In
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      ) : isError ? (
        <div className="text-center py-12 bg-cinema-card border border-cinema-border rounded-xl p-8">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 font-medium">Failed to load booking history.</p>
        </div>
      ) : !filteredBookings || filteredBookings.length === 0 ? (
        <div className="text-center py-16 bg-cinema-card border border-cinema-border rounded-2xl p-8 space-y-4">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Tickets Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You don't have any bookings in this view. Browse our movie catalog and book your seats!
          </p>
          <Link to="/">
            <Button variant="primary" size="sm">
              Explore Now Showing Movies
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const isValid = booking.checkInStatus === 'valid';
            const isUsed = booking.checkInStatus === 'used';

            return (
              <Card
                key={booking.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-slate-600 transition-colors"
              >
                {/* Left: Movie & Showtime info */}
                <div className="flex items-center gap-4">
                  <img
                    src={booking.movie.posterUrl}
                    alt={booking.movie.title}
                    className="w-16 h-24 rounded-lg object-cover bg-slate-900 shrink-0 shadow-md"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-white">{booking.movie.title}</h3>
                      <Badge
                        variant={isValid ? 'success' : isUsed ? 'neutral' : 'warning'}
                        size="sm"
                      >
                        {booking.checkInStatus.toUpperCase()}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-400">
                      {booking.cinema.name} •{' '}
                      <span className="text-brand-400 font-semibold">{booking.cinema.roomName}</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {formatDate(booking.showtime.startTime)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {formatTime(booking.showtime.startTime)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Armchair className="w-3.5 h-3.5 text-slate-500" />
                        {booking.seats.length} seats ({booking.seats.map((s) => s.seatCode).join(', ')})
                      </span>
                    </div>

                    {isUsed && booking.checkedInAt && (
                      <p className="text-[11px] text-slate-500 pt-1">
                        Checked in at: {new Date(booking.checkedInAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Order total & View QR Ticket */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-cinema-border">
                  <div className="text-left md:text-right">
                    <span className="text-[11px] text-slate-400 block">Total Price:</span>
                    <span className="text-lg font-extrabold text-white">
                      {formatCurrency(booking.finalTotal)}
                    </span>
                  </div>

                  <Link to={`/tickets/${booking.id}`}>
                    <Button
                      variant={isValid ? 'primary' : 'secondary'}
                      size="sm"
                      rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                    >
                      View QR Ticket
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
