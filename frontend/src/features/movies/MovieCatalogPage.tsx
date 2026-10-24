import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Calendar,
  MapPin,
  Clock,
  Star,
  Play,
  Ticket,
  Sparkles,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useMovies, MovieFilters } from './useMovies';
import { MovieCardSkeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TrailerModal } from '@/components/movies/TrailerModal';
import { SEED_CINEMAS } from '@/mocks/seedData';
import { Movie } from '@/types';

const GENRES = [
  'All',
  'Action',
  'Sci-Fi',
  'Adventure',
  'Drama',
  'Comedy',
  'Animation',
  'Biography',
];

export const MovieCatalogPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'now_showing' | 'coming_soon'>('now_showing');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedCinema, setSelectedCinema] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeTrailer, setActiveTrailer] = useState<Movie | null>(null);

  const filters: MovieFilters = {
    status: activeTab,
    q: searchQuery || undefined,
    genre: selectedGenre !== 'All' ? selectedGenre : undefined,
    cinemaId: selectedCinema !== 'all' ? selectedCinema : undefined,
    date: selectedDate || undefined,
  };

  const { data: movies, isLoading, isError } = useMovies(filters);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGenre('All');
    setSelectedCinema('all');
    setSelectedDate('');
  };

  const hasActiveFilters = searchQuery || selectedGenre !== 'All' || selectedCinema !== 'all' || selectedDate;

  return (
    <div className="min-h-screen pb-16">
      {/* Cinematic Hero Spotlight */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-cinema-darker to-cinema-darker border-b border-cinema-border/50 py-12 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Seat Recommendation Engine</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Experience Cinema, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-rose-300 to-amber-300">
                Smarter & Faster.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
              Real-time seat reservations, AI-assisted group seating, contactless mobile check-in, and gourmet concessions at your fingertips.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cinema-border pb-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('now_showing')}
              className={`text-base sm:text-lg font-bold pb-2 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'now_showing'
                  ? 'border-brand-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Now Showing</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                Live
              </span>
            </button>
            <button
              onClick={() => setActiveTab('coming_soon')}
              className={`text-base sm:text-lg font-bold pb-2 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'coming_soon'
                  ? 'border-brand-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Coming Soon</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                Upcoming
              </span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search movies, cast, director..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              className="py-1.5"
            />
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-cinema-card border border-cinema-border rounded-xl p-4 mb-8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-brand-400 hover:text-brand-300 font-medium"
              >
                <X className="w-3 h-3" /> Reset all filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Cinema Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Cinema Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                <select
                  value={selectedCinema}
                  onChange={(e) => setSelectedCinema(e.target.value)}
                  className="w-full bg-slate-900 border border-cinema-border rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="all">All CineGo Theaters</option>
                  {SEED_CINEMAS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Showtime Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-900 border border-cinema-border rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Genre Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Genre
              </label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full bg-slate-900 border border-cinema-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g === 'All' ? 'All Genres' : g}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Movie Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-16 bg-cinema-card border border-cinema-border rounded-xl p-8">
            <p className="text-red-400 font-medium">Failed to load movie catalog. Please try refreshing.</p>
          </div>
        ) : !movies || movies.length === 0 ? (
          <div className="text-center py-20 bg-cinema-card border border-cinema-border rounded-2xl p-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">No Movies Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              We couldn't find any movies matching your current filters. Try searching for a different keyword or resetting filters.
            </p>
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {movies.map((movie) => {
              const hours = Math.floor(movie.durationMinutes / 60);
              const mins = movie.durationMinutes % 60;

              return (
                <div
                  key={movie.id}
                  className="group bg-cinema-card border border-cinema-border hover:border-slate-600 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-brand-500/10 hover:-translate-y-1 flex flex-col"
                >
                  {/* Poster Image */}
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-cinema-dark via-transparent to-transparent opacity-80" />

                    {/* Age Rating Badge */}
                    <div className="absolute top-3 left-3">
                      <Badge
                        variant={
                          movie.ageRating === 'T18'
                            ? 'danger'
                            : movie.ageRating === 'T16'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {movie.ageRating}
                      </Badge>
                    </div>

                    {/* Rating Badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md border border-amber-500/30 text-amber-300 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{movie.rating.toFixed(1)}</span>
                    </div>

                    {/* Trailer Play Hover Button */}
                    <button
                      type="button"
                      onClick={() => setActiveTrailer(movie)}
                      className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-brand-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100 shadow-xl backdrop-blur-sm hover:bg-brand-500"
                      aria-label={`Watch trailer for ${movie.title}`}
                    >
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <Link
                        to={`/movies/${movie.id}`}
                        className="block font-bold text-base text-white group-hover:text-brand-400 transition-colors line-clamp-1"
                        title={movie.title}
                      >
                        {movie.title}
                      </Link>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {hours}h {mins}m
                        </span>
                        <span>•</span>
                        <span className="truncate">{movie.genres.slice(0, 2).join(', ')}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 flex items-center gap-2">
                      <Link to={`/movies/${movie.id}`} className="flex-1">
                        <Button
                          variant={movie.status === 'now_showing' ? 'primary' : 'secondary'}
                          size="sm"
                          className="w-full text-xs"
                          leftIcon={<Ticket className="w-3.5 h-3.5" />}
                        >
                          {movie.status === 'now_showing' ? 'Showtimes' : 'Details'}
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTrailer(movie)}
                        title="Watch Trailer"
                        className="px-2"
                      >
                        <Play className="w-4 h-4 text-slate-300" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trailer Modal */}
      {activeTrailer && (
        <TrailerModal
          isOpen={!!activeTrailer}
          onClose={() => setActiveTrailer(null)}
          title={activeTrailer.title}
          trailerUrl={activeTrailer.trailerUrl}
        />
      )}
    </div>
  );
};
