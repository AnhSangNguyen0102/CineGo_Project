import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Ticket, Search, Eye, QrCode, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { Booking } from '@/types';
import { formatCurrency, formatTime, formatDate } from '@/utils/cn';

export const AdminBookingsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'cancelled'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      const res = await apiClient.get<Booking[]>(ENDPOINTS.ADMIN.BOOKINGS);
      return res.data;
    },
  });

  const filteredBookings = bookings?.filter((b) => {
    const matchesSearch =
      b.orderCode.toLowerCase().includes(search.toLowerCase()) ||
      b.userName.toLowerCase().includes(search.toLowerCase()) ||
      b.movie.title.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' ? true : b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Ticket className="w-7 h-7 text-brand-500" />
            Customer Bookings & Transactions
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review simulated ticket purchases, scannable QR tokens, and gate check-in status logs.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-cinema-card border border-cinema-border p-3 rounded-xl">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by order code, customer, movie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="py-1.5"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'paid', label: 'Paid' },
            { id: 'pending', label: 'Pending' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-cinema-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order Code</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Movie & Showtime</TableHead>
            <TableHead>Seats</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Payment & Gate</TableHead>
            <TableHead className="text-right">Inspect</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredBookings?.map((b) => (
            <TableRow key={b.id}>
              <TableCell>
                <span className="font-mono font-bold text-brand-400 text-xs block">
                  {b.orderCode}
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(b.createdAt).toLocaleDateString()}
                </span>
              </TableCell>
              <TableCell>
                <div>
                  <span className="font-semibold text-white text-xs block">{b.userName}</span>
                  <span className="text-[11px] text-slate-400">{b.userEmail}</span>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <span className="font-bold text-white text-xs block truncate max-w-[160px]">
                    {b.movie.title}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatDate(b.showtime.startTime)} • {formatTime(b.showtime.startTime)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1 max-w-[120px]">
                  {b.seats.map((s) => (
                    <span
                      key={s.id}
                      className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-200"
                    >
                      {s.seatCode}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-extrabold text-white text-xs">
                  {formatCurrency(b.finalTotal)}
                </span>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Badge variant={b.status === 'paid' ? 'success' : 'warning'} size="sm">
                    {b.status.toUpperCase()}
                  </Badge>
                  <span className="block text-[10px] text-slate-400">
                    Gate: <strong className="text-slate-200">{b.checkInStatus}</strong>
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <button
                  onClick={() => setSelectedBooking(b)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                  title="View order details"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Inspect Order Modal */}
      {selectedBooking && (
        <Modal
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title={`Order Breakdown: ${selectedBooking.orderCode}`}
          maxWidth="lg"
          footer={
            <Button variant="secondary" onClick={() => setSelectedBooking(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-4 rounded-xl bg-slate-900 border border-cinema-border grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block mb-0.5">Customer:</span>
                <span className="font-bold text-white text-sm">{selectedBooking.userName}</span>
                <p className="text-slate-400">{selectedBooking.userEmail}</p>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Payment Method:</span>
                <span className="font-semibold text-emerald-400 uppercase">
                  {selectedBooking.paymentMethod} (Simulated)
                </span>
                <p className="text-slate-400 font-mono text-[11px]">
                  Token: {selectedBooking.qrToken}
                </p>
              </div>
            </div>

            {/* Screening info */}
            <div className="p-4 rounded-xl bg-slate-900 border border-cinema-border space-y-1">
              <span className="text-slate-400 block">Film & Hall:</span>
              <p className="text-white font-bold text-sm">{selectedBooking.movie.title}</p>
              <p className="text-slate-300">
                {selectedBooking.cinema.name} • {selectedBooking.cinema.roomName}
              </p>
              <p className="text-brand-400 font-medium">
                {formatDate(selectedBooking.showtime.startTime)} at{' '}
                {formatTime(selectedBooking.showtime.startTime)}
              </p>
            </div>

            {/* Seats */}
            <div className="space-y-1">
              <span className="font-bold text-slate-300 block">Reserved Seats:</span>
              <div className="flex flex-wrap gap-2">
                {selectedBooking.seats.map((s) => (
                  <div
                    key={s.id}
                    className="p-2 rounded-lg bg-slate-900 border border-cinema-border font-mono text-center min-w-[60px]"
                  >
                    <span className="font-bold text-white block">{s.seatCode}</span>
                    <span className="text-[10px] text-slate-400 uppercase">{s.type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Concessions */}
            {selectedBooking.foodItems.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-cinema-border">
                <span className="font-bold text-slate-300 block">Concessions:</span>
                {selectedBooking.foodItems.map((f, i) => (
                  <div key={i} className="flex justify-between text-slate-300">
                    <span>
                      {f.quantity}x {f.name}
                    </span>
                    <span>{formatCurrency(f.quantity * f.unitPrice)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div className="pt-3 border-t border-cinema-border flex items-center justify-between text-sm">
              <span className="font-bold text-white">Grand Total:</span>
              <span className="font-extrabold text-emerald-400 text-lg">
                {formatCurrency(selectedBooking.finalTotal)}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
