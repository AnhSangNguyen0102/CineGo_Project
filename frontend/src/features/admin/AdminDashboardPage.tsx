import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  Ticket,
  ShoppingBag,
  Percent,
  TrendingUp,
  Calendar,
  Filter,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { AdminStats } from '@/types';
import { formatCurrency } from '@/utils/cn';
import { SEED_CINEMAS, SEED_MOVIES } from '@/mocks/seedData';

export const AdminDashboardPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('7d');
  const [selectedCinema, setSelectedCinema] = useState('all');
  const [selectedMovie, setSelectedMovie] = useState('all');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats', dateRange, selectedCinema, selectedMovie],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange) params.append('range', dateRange);
      if (selectedCinema !== 'all') params.append('cinemaId', selectedCinema);
      if (selectedMovie !== 'all') params.append('movieId', selectedMovie);

      const res = await apiClient.get<AdminStats>(`${ENDPOINTS.ADMIN.STATS}?${params.toString()}`);
      return res.data;
    },
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-8 h-8 text-brand-500" />
            Executive Cinema Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time simulated revenue, box office ticketing trends, and room occupancy metrics.
          </p>
        </div>

        {/* Global Dashboard Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-cinema-card border border-cinema-border p-2.5 rounded-2xl">
          {/* Cinema Filter */}
          <select
            value={selectedCinema}
            onChange={(e) => setSelectedCinema(e.target.value)}
            className="bg-slate-900 border border-cinema-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All Cinemas</option>
            {SEED_CINEMAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Movie Filter */}
          <select
            value={selectedMovie}
            onChange={(e) => setSelectedMovie(e.target.value)}
            className="bg-slate-900 border border-cinema-border rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All Movies</option>
            {SEED_MOVIES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-cinema-border">
            {[
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
              { id: 'all', label: 'All' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDateRange(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  dateRange === tab.id
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : !stats ? null : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <Card className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Simulated Revenue
              </span>
              <span className="text-2xl font-extrabold text-white">
                {formatCurrency(stats.totalRevenue)}
              </span>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <TrendingUp className="w-3 h-3" /> Counts paid orders only
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </Card>

          {/* Tickets Sold */}
          <Card className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Tickets Sold
              </span>
              <span className="text-2xl font-extrabold text-white">
                {stats.totalTicketsSold.toLocaleString()}
              </span>
              <p className="text-[11px] text-sky-400 font-medium">Across all auditoriums</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Ticket className="w-6 h-6" />
            </div>
          </Card>

          {/* Orders */}
          <Card className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Total Orders
              </span>
              <span className="text-2xl font-extrabold text-white">
                {stats.totalOrders.toLocaleString()}
              </span>
              <p className="text-[11px] text-brand-400 font-medium">Completed checkouts</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </Card>

          {/* Average Occupancy */}
          <Card className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Avg. Occupancy
              </span>
              <span className="text-2xl font-extrabold text-amber-400">
                {stats.averageOccupancyRate}%
              </span>
              <p className="text-[11px] text-amber-300/80 font-medium">Seat fill efficiency</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Percent className="w-6 h-6" />
            </div>
          </Card>
        </div>
      )}

      {/* Visual Analytics Charts */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Revenue Over Time Chart */}
          <div className="lg:col-span-8">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-cinema-border pb-3">
                <h3 className="font-bold text-base text-white">Revenue & Tickets Trend</h3>
                <Badge variant="neutral">Daily Timeline</Badge>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.revenueByDate}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} tickFormatter={(val) => `$${val}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#131B2E',
                        borderColor: '#1F293D',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue ($)"
                      stroke="#e11d48"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Top Grossing Movies */}
          <div className="lg:col-span-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-cinema-border pb-3">
                <h3 className="font-bold text-base text-white">Top Grossing Movies</h3>
                <Badge variant="gold">Box Office</Badge>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topMovies} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" horizontal={false} />
                    <XAxis type="number" stroke="#64748B" fontSize={10} tickFormatter={(val) => `$${val}`} />
                    <YAxis
                      dataKey="title"
                      type="category"
                      stroke="#94A3B8"
                      fontSize={10}
                      width={90}
                      tickFormatter={(val) => (val.length > 12 ? `${val.substring(0, 12)}...` : val)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#131B2E',
                        borderColor: '#1F293D',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="revenue" name="Revenue ($)" fill="#38BDF8" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Occupancy Rate by Showtime */}
          <div className="lg:col-span-12">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-cinema-border pb-3">
                <h3 className="font-bold text-base text-white">Auditorium Occupancy Rate by Showtime</h3>
                <Badge variant="info">Seat Fill %</Badge>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.occupancyByShowtime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" vertical={false} />
                    <XAxis dataKey="cinemaRoom" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} tickFormatter={(val) => `${val}%`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#131B2E',
                        borderColor: '#1F293D',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(val: any) => [`${val}%`, 'Occupancy Rate']}
                    />
                    <Bar dataKey="occupancyRate" name="Occupancy Rate (%)" fill="#FBBF24" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
