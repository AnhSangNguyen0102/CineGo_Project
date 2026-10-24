import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  Star,
  Play,
  MapPin,
  Calendar,
  Users,
  Film,
  ArrowLeft,
  Armchair,
  AlertCircle,
} from 'lucide-react';
import { useMovie, useMovieShowtimes } from './useMovies';
import { useBookingStore } from '@/features/booking/useBookingStore';
import { TrailerModal } from '@/components/movies/TrailerModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatTime } from '@/utils/cn';
import { Showtime } from '@/types';

export const MovieDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setCurrentShowtime } = useBookingStore();

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const dayAfterStr = dayAfter.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedCinema, setSelectedCinema] = useState('all');
  const [trailerOpen, setTrailerOpen] = useState(false);

  const { data: movie, isLoading: movieLoading, isError: movieError } = useMovie(id);
  const { data: showtimes, isLoading: showtimesLoading } = useMovieShowtimes(id, {
    date: selectedDate,
    cinemaId: selectedCinema,
  });

  const handleSelectShowtime = (showtime: Showtime) => {
    if (showtime.availableSeats <= 0 || showtime.status === 'completed') {
      return;
    }
    setCurrentShowtime(showtime);
    navigate(`/showtimes/${showtime.id}/seats`);
  };

  if (movieLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <Skeleton className="w-full h-80 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Skeleton className="h-96 rounded-xl" />
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (movieError || !movie) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Movie Not Found</h2>
        <p className="text-sm text-slate-400">The requested movie could not be found or is unavailable.</p>
        <Link to="/">
          <Button variant="primary">Back to Catalog</Button>
        </Link>
      </div>
    );
  }

  const hours = Math.floor(movie.durationMinutes / 60);
  const mins = movie.durationMinutes % 60;

  // Group showtimes by cinema
  const groupedShowtimes: Record<string, Showtime[]> = {};
  showtimes?.forEach((st) => {
    if (!groupedShowtimes[st.cinemaName]) {
      groupedShowtimes[st.cinemaName] = [];
    }
    groupedShowtimes[st.cinemaName].push(st);
  });

  const cinemaNames = Object.keys(groupedShowtimes);

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Banner Backdrop */}
      <div className="relative w-full h-72 sm:h-96 bg-slate-950 overflow-hidden">
        <img
          src={movie.bannerUrl || movie.posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover opacity-35 filter blur-sm scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cinema-darker via-cinema-darker/70 to-transparent" />
        <div className="absolute top-6 left-4 sm:left-8 z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-xs text-slate-300 hover:text-white border border-slate-700/60 backdrop-blur-md transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Movies
          </Link>
        </div>
      </div>

      {/* Movie Details Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-40 sm:-mt-52 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Poster Column */}
          <div className="md:col-span-4 lg:col-span-3">
            <div className="rounded-2xl overflow-hidden border-2 border-cinema-border bg-cinema-card shadow-2xl relative group">
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="w-full aspect-[2/3] object-cover"
              />
              <button
                type="button"
                onClick={() => setTrailerOpen(true)}
                className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2 text-white font-medium text-sm"
              >
                <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center shadow-lg">
                  <Play className="w-6 h-6 ml-1 fill-white" />
                </div>
                <span>Watch Trailer</span>
              </button>
            </div>
          </div>

          {/* Details Column */}
          <div className="md:col-span-8 lg:col-span-9 space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    movie.ageRating === 'T18'
                      ? 'danger'
                      : movie.ageRating === 'T16'
                      ? 'warning'
                      : 'neutral'
                  }
                >
                  Rating: {movie.ageRating}
                </Badge>
                <Badge variant={movie.status === 'now_showing' ? 'success' : 'info'}>
                  {movie.status === 'now_showing' ? 'Now Showing' : 'Coming Soon'}
                </Badge>
                <div className="flex items-center gap-1 text-amber-400 text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{movie.rating.toFixed(1)} / 10 ({movie.reviewCount} reviews)</span>
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {movie.title}
              </h1>
              {movie.originalTitle && movie.originalTitle !== movie.title && (
                <p className="text-xs text-slate-400 italic">Original: {movie.originalTitle}</p>
              )}
            </div>

            {/* Quick Meta */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 border-y border-cinema-border/60 py-3">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{hours}h {mins}m</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Film className="w-4 h-4 text-slate-400" />
                <span>{movie.genres.join(', ')}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Release: {new Date(movie.releaseDate).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Synopsis */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Synopsis
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                {movie.synopsis}
              </p>
            </div>

            {/* Cast & Crew */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Director
                </span>
                <span className="text-sm text-slate-200 font-medium">{movie.director}</span>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Starring
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {movie.cast.map((actor) => (
                    <span
                      key={actor}
                      className="text-xs px-2 py-0.5 rounded-md bg-slate-900 border border-cinema-border text-slate-300"
                    >
                      {actor}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Watch Trailer Button */}
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Play className="w-4 h-4 text-brand-400 fill-brand-400" />}
                onClick={() => setTrailerOpen(true)}
              >
                Watch Official Trailer
              </Button>
            </div>
          </div>
        </div>

        {/* Showtimes & Booking Section */}
        <section className="mt-14 pt-8 border-t border-cinema-border space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Armchair className="w-6 h-6 text-brand-500" />
                Select Showtime & Book Seats
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose your preferred cinema, date, and showtime to pick seats interactively.
              </p>
            </div>

            {/* Date Selector Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                  selectedDate === todayStr
                    ? 'bg-brand-600 text-white border-brand-500'
                    : 'bg-cinema-card text-slate-300 border-cinema-border hover:bg-slate-800'
                }`}
              >
                Today (Now)
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(tomorrowStr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                  selectedDate === tomorrowStr
                    ? 'bg-brand-600 text-white border-brand-500'
                    : 'bg-cinema-card text-slate-300 border-cinema-border hover:bg-slate-800'
                }`}
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(dayAfterStr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                  selectedDate === dayAfterStr
                    ? 'bg-brand-600 text-white border-brand-500'
                    : 'bg-cinema-card text-slate-300 border-cinema-border hover:bg-slate-800'
                }`}
              >
                Day After
              </button>
            </div>
          </div>

          {/* Showtimes Grouped By Cinema */}
          {showtimesLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : cinemaNames.length === 0 ? (
            <div className="text-center py-12 bg-cinema-card border border-cinema-border rounded-xl p-6 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="text-base font-semibold text-white">No Showtimes Available</h3>
              <p className="text-xs text-slate-400">
                There are no scheduled showtimes for this date. Try selecting another date above.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {cinemaNames.map((cinemaName) => {
                const cinemaShowtimes = groupedShowtimes[cinemaName];
                return (
                  <Card key={cinemaName} className="p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-cinema-border pb-3">
                      <MapPin className="w-4 h-4 text-brand-400" />
                      <h3 className="text-base font-bold text-white">{cinemaName}</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {cinemaShowtimes.map((st) => {
                        const isSoldOut = st.availableSeats <= 0;
                        const isFinished = st.status === 'completed';
                        const isDisabled = isSoldOut || isFinished;

                        return (
                          <button
                            key={st.id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => handleSelectShowtime(st)}
                            className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                              isDisabled
                                ? 'bg-slate-900/40 border-slate-800/80 opacity-50 cursor-not-allowed'
                                : 'bg-slate-900/90 border-cinema-border hover:border-brand-500 hover:bg-slate-800/90 hover:shadow-lg hover:shadow-brand-500/10 active:scale-[0.98]'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-base font-extrabold text-white">
                                  {formatTime(st.startTime)}
                                </span>
                                <span className="text-xs font-semibold text-brand-400">
                                  {formatCurrency(st.priceBase)}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">{st.roomName}</p>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                              {isDisabled ? (
                                <span className="text-red-400 font-semibold">
                                  {isFinished ? 'Started / Ended' : 'Sold Out'}
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-medium flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {st.availableSeats} seats left
                                </span>
                              )}
                              <span className="text-slate-500 text-[10px]">
                                Ends ~{formatTime(st.endTime)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        title={movie.title}
        trailerUrl={movie.trailerUrl}
      />
    </div>
  );
};
