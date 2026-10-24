import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  Armchair,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  ArrowLeft,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { Booking } from '@/types';
import { formatCurrency, formatTime, formatDate } from '@/utils/cn';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['ticket-detail', id],
    queryFn: async () => {
      const res = await apiClient.get<Booking>(ENDPOINTS.TICKETS.DETAIL(id!));
      return res.data;
    },
    enabled: !!id,
  });

  const handleCopyCode = () => {
    if (ticket) {
      navigator.clipboard.writeText(ticket.qrToken || ticket.orderCode);
      toast.success('Ticket code copied to clipboard!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[520px] rounded-3xl" />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Ticket Not Found</h2>
        <p className="text-xs text-slate-400">
          We could not find a ticket matching this reference number.
        </p>
        <Link to="/tickets">
          <Button variant="primary">View My Tickets</Button>
        </Link>
      </div>
    );
  }

  const isValid = ticket.checkInStatus === 'valid';
  const isUsed = ticket.checkInStatus === 'used';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-20">
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Tickets
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} leftIcon={<Printer className="w-3.5 h-3.5" />}>
            Print Pass
          </Button>
          <Link to={`/staff/checkin?code=${encodeURIComponent(ticket.qrToken)}`}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<QrCode className="w-3.5 h-3.5 text-cyan-400" />}
              title="Test verify this ticket in staff scanner"
            >
              Verify as Staff
            </Button>
          </Link>
        </div>
      </div>

      {/* Cinematic E-Ticket Card */}
      <div className="bg-cinema-card border-2 border-cinema-border rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Top Perforated Header */}
        <div className="bg-gradient-to-r from-brand-900/60 via-slate-900 to-brand-900/60 border-b border-cinema-border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-sm">
              CG
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-wide">
                CINE<span className="text-brand-500">GO</span> CINEMA PASS
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">
                ORDER REF: {ticket.orderCode}
              </p>
            </div>
          </div>

          <div>
            <Badge
              variant={isValid ? 'success' : isUsed ? 'neutral' : 'warning'}
              size="md"
              className={isValid ? 'border-emerald-500 animate-pulse-subtle' : ''}
            >
              {isValid ? 'VALID FOR ENTRY' : isUsed ? 'ALREADY USED' : 'EXPIRED'}
            </Badge>
          </div>
        </div>

        {/* Ticket Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <img
              src={ticket.movie.posterUrl}
              alt={ticket.movie.title}
              className="w-28 sm:w-32 aspect-[2/3] rounded-xl object-cover bg-slate-900 shadow-xl border border-cinema-border shrink-0"
            />

            <div className="space-y-3 flex-1 min-w-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="warning" size="sm">
                    {ticket.movie.ageRating}
                  </Badge>
                  <span className="text-xs text-slate-400">Standard Screening</span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">{ticket.movie.title}</h2>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-400" /> Cinema Location
                  </span>
                  <span className="font-semibold text-white">{ticket.cinema.name}</span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5 text-brand-400" /> Theater Hall
                  </span>
                  <span className="font-bold text-brand-400">{ticket.cinema.roomName}</span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-brand-400" /> Date
                  </span>
                  <span className="font-semibold text-white">
                    {formatDate(ticket.showtime.startTime)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-brand-400" /> Showtime
                  </span>
                  <span className="font-extrabold text-white">
                    {formatTime(ticket.showtime.startTime)} - {formatTime(ticket.showtime.endTime)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reserved Seats Matrix */}
          <div className="bg-slate-900/90 border border-cinema-border rounded-2xl p-4 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Assigned Seating
            </span>
            <div className="flex flex-wrap gap-2">
              {ticket.seats.map((seat) => (
                <div
                  key={seat.id}
                  className="px-3.5 py-1.5 rounded-xl bg-cinema-card border border-cinema-border text-center"
                >
                  <span className="text-sm font-mono font-black text-white">{seat.seatCode}</span>
                  <span className="text-[10px] text-slate-400 block uppercase">{seat.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Snacks if any */}
          {ticket.foodItems.length > 0 && (
            <div className="bg-slate-900/60 border border-cinema-border rounded-xl p-3.5 space-y-1 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Pre-ordered Concessions
              </span>
              {ticket.foodItems.map((f, i) => (
                <div key={i} className="flex justify-between text-slate-300">
                  <span>
                    {f.quantity}x {f.name}
                  </span>
                  <span className="font-medium text-white">{formatCurrency(f.quantity * f.unitPrice)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Scannable QR Code Section */}
          <div className="pt-4 border-t-2 border-dashed border-cinema-border text-center space-y-4">
            <div className="inline-block p-4 bg-white rounded-2xl shadow-xl">
              <QRCodeSVG
                value={ticket.qrToken || ticket.orderCode}
                size={160}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-xs text-slate-300 font-bold bg-slate-900 px-3 py-1 rounded-lg border border-cinema-border">
                  {ticket.qrToken}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Copy token code"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Present this QR code to the usher at the theater entrance.
              </p>
            </div>

            {isUsed && ticket.checkedInAt && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300">
                Checked in on {new Date(ticket.checkedInAt).toLocaleString()}
                {ticket.checkedInBy && ` by ${ticket.checkedInBy}`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
