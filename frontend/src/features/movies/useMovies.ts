import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { Movie, Showtime } from '@/types';

export interface MovieFilters {
  status?: 'now_showing' | 'coming_soon';
  q?: string;
  genre?: string;
  cinemaId?: string;
  date?: string;
}

export function useMovies(filters?: MovieFilters) {
  return useQuery({
    queryKey: ['movies', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.q) params.append('q', filters.q);
      if (filters?.genre && filters.genre !== 'All') params.append('genre', filters.genre);
      if (filters?.cinemaId && filters.cinemaId !== 'all') params.append('cinemaId', filters.cinemaId);
      if (filters?.date) params.append('date', filters.date);

      const res = await apiClient.get<Movie[]>(`${ENDPOINTS.MOVIES.LIST}?${params.toString()}`);
      return res.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useMovie(id?: string) {
  return useQuery({
    queryKey: ['movie', id],
    queryFn: async () => {
      if (!id) throw new Error('Movie ID is required');
      const res = await apiClient.get<Movie>(ENDPOINTS.MOVIES.DETAIL(id));
      return res.data;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useMovieShowtimes(movieId?: string, filters?: { date?: string; cinemaId?: string }) {
  return useQuery({
    queryKey: ['movie-showtimes', movieId, filters],
    queryFn: async () => {
      if (!movieId) throw new Error('Movie ID is required');
      const params = new URLSearchParams();
      if (filters?.date) params.append('date', filters.date);
      if (filters?.cinemaId && filters.cinemaId !== 'all') params.append('cinemaId', filters.cinemaId);

      const res = await apiClient.get<Showtime[]>(
        `${ENDPOINTS.MOVIES.SHOWTIMES(movieId)}?${params.toString()}`
      );
      return res.data;
    },
    enabled: !!movieId,
    staleTime: 30 * 1000,
  });
}
