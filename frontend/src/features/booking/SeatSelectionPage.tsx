import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Armchair,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  ShieldAlert,
} from 'lucide-react';
import { useBookingStore } from './useBookingStore';
import { SmartSeatModal } from './SmartSeatModal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { socketManager } from '@/api/socket';
import { Showtime, ShowtimeSeat, SeatLayoutResponse } from '@/types';
import { formatCurrency, formatTime, formatDate } from '@/utils/cn';

export const SeatSelectionPage: React.FC = () => {
  const { id: showtimeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    currentShowtime,
    setCurrentShowtime,
    selectedSeats,
    setSelectedSeats,
    toggleSeat,
    holdingSecondsLeft,
    isTimerRunning,
    startHoldingTimer,
    tickTimer,
    stopHoldingTimer,
  } = useBookingStore();

  const [layout, setLayout] = useState<SeatLayoutResponse | null>(null);
  const [showtime, setShowtime] = useState<Showtime | null>(currentShowtime);
  const [isLoading, setIsLoading] = useState(true);
  const [isSmartSeatOpen, setIsSmartSeatOpen] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [expiredModalOpen, setExpiredModalOpen] = useState(false);

  // Fetch Seats Map
  const fetchSeats = useCallback(async () => {
    if (!showtimeId) return;
    try {
      setIsLoading(true);
      const res = await apiClient.get<SeatLayoutResponse>(ENDPOINTS.SHOWTIMES.SEATS(showtimeId));
      setLayout(res.data);

      // If showtime wasn't loaded from previous page, fetch movie showtimes
      if (!showtime) {
        // Fallback fetch if opened directly
        const stRes = await apiClient.get<Showtime[]>(`${ENDPOINTS.MOVIES.LIST}/mov_1/showtimes`);
        const found = stRes.data.find((s) => s.id === showtimeId) || stRes.data[0];
        setShowtime(found);
        setCurrentShowtime(found);
      }
    } catch {
      toast.error('Failed to load room seat layout.');
    } finally {
      setIsLoading(false);
    }
  }, [showtimeId, showtime, setCurrentShowtime, toast]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  // Real-time WebSocket connection & live seat updates
  useEffect(() => {
    if (!showtimeId) return;

    socketManager.joinShowtime(showtimeId);

    const unsubscribeSeatUpdate = socketManager.on('seat:update', (data: any) => {
      setLayout((prevLayout) => {
        if (!prevLayout) return prevLayout;
        const updatedSeats = prevLayout.seats.map((seat) => {
          if (seat.id === data.seatId || seat.seatCode === data.seatCode) {
            return {
              ...seat,
              status: data.status,
              lockedByUserId: data.lockedByUserId,
            };
          }
          return seat;
        });
        return { ...prevLayout, seats: updatedSeats };
      });
    });

    const unsubscribeLockExpired = socketManager.on('lock:expired', (data: any) => {
      setLayout((prevLayout) => {
        if (!prevLayout) return prevLayout;
        const expiredIds: string[] = data.seatIds || [];
        const updatedSeats = prevLayout.seats.map((seat) => {
          if (expiredIds.includes(seat.id)) {
            return { ...seat, status: 'available' as const, lockedByUserId: undefined };
          }
          return seat;
        });
        return { ...prevLayout, seats: updatedSeats };
      });
    });

    return () => {
      unsubscribeSeatUpdate();
      unsubscribeLockExpired();
      socketManager.leaveShowtime();
    };
  }, [showtimeId]);

  // 1-second interval timer for holding seats
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      tickTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, tickTimer]);

  // Handle timer reaching 0
  useEffect(() => {
    if (isTimerRunning && holdingSecondsLeft <= 0) {
      stopHoldingTimer();
      setExpiredModalOpen(true);
      if (showtimeId && selectedSeats.length > 0) {
        apiClient
          .post(ENDPOINTS.SHOWTIMES.UNLOCK_SEATS(showtimeId), {
            seatIds: selectedSeats.map((s) => s.id),
          })
          .catch(() => {});
      }
      setSelectedSeats([]);
      fetchSeats();
    }
  }, [holdingSecondsLeft, isTimerRunning, stopHoldingTimer, showtimeId, selectedSeats, setSelectedSeats, fetchSeats]);

  // Seat Click handler
  const handleSeatClick = async (seat: ShowtimeSeat) => {
    if (seat.status === 'sold') {
      toast.warning('This seat has already been purchased.', 'Seat Unavailable');
      return;
    }

    if (seat.status === 'held_by_others') {
      toast.warning('This seat is temporarily locked by another customer.', 'Seat Held');
      return;
    }

    const isAlreadySelected = selectedSeats.some((s) => s.id === seat.id);

    if (!isAlreadySelected && selectedSeats.length >= 8) {
      toast.warning('You can select a maximum of 8 seats per order.', 'Seat Limit Reached');
      return;
    }

    // Toggle locally
    const added = toggleSeat(seat);

    // Call Lock / Unlock API atomically
    if (added) {
      try {
        setIsLocking(true);
        const lockRes = await apiClient.post(ENDPOINTS.SHOWTIMES.LOCK_SEATS(showtimeId!), {
          seatIds: [...selectedSeats.map((s) => s.id), seat.id],
        });
        startHoldingTimer(lockRes.data.expiresAt);
      } catch (err: any) {
        // Conflict handling: reject whole selection and refresh map
        if (err.response?.status === 409) {
          toast.error(
            err.response.data.message || 'Seat was just taken by someone else! Refreshing map...',
            'Seat Conflict'
          );
          setSelectedSeats([]);
          stopHoldingTimer();
          fetchSeats();
        } else {
          toast.error('Failed to reserve seat. Please try again.');
          toggleSeat(seat); // revert
        }
      } finally {
        setIsLocking(false);
      }
    } else {
      // Removing seat
      const remaining = selectedSeats.filter((s) => s.id !== seat.id);
      if (remaining.length === 0) {
        stopHoldingTimer();
      }
      try {
        await apiClient.post(ENDPOINTS.SHOWTIMES.UNLOCK_SEATS(showtimeId!), {
          seatIds: [seat.id],
        });
      } catch {}
    }
  };

  // Accept Smart Seat selection
  const handleAcceptSmartSeats = async (seats: ShowtimeSeat[]) => {
    try {
      setIsLocking(true);
      const lockRes = await apiClient.post(ENDPOINTS.SHOWTIMES.LOCK_SEATS(showtimeId!), {
        seatIds: seats.map((s) => s.id),
      });
      setSelectedSeats(seats);
      startHoldingTimer(lockRes.data.expiresAt);
      toast.success(
        `Locked ${seats.length} smart seats: ${seats.map((s) => s.seatCode).join(', ')}`,
        'Seats Reserved'
      );
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error('One of the recommended seats was just taken. Please try Smart Seat again.');
        fetchSeats();
      } else {
        toast.error('Failed to lock recommended seats.');
      }
    } finally {
      setIsLocking(false);
    }
  };

  // Clear all seats
  const handleClearAll = async () => {
    if (selectedSeats.length === 0) return;
    try {
      await apiClient.post(ENDPOINTS.SHOWTIMES.UNLOCK_SEATS(showtimeId!), {
        seatIds: selectedSeats.map((s) => s.id),
      });
    } catch {}
    setSelectedSeats([]);
    stopHoldingTimer();
    toast.info('All seat reservations released.');
  };

  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Top Showtime Summary Bar */}
      <div className="bg-slate-900 border-b border-cinema-border py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{showtime?.movieTitle || 'Movie Showtime'}</span>
                {showtime?.ageRating && <Badge variant="warning">{showtime.ageRating}</Badge>}
              </h1>
              <p className="text-xs text-slate-400">
                {showtime?.cinemaName} • <span className="text-brand-400 font-medium">{showtime?.roomName}</span> •{' '}
                {showtime?.startTime && `${formatDate(showtime.startTime)} at ${formatTime(showtime.startTime)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Smart Seat Button */}
            <Button
              variant="gold"
              size="sm"
              onClick={() => setIsSmartSeatOpen(true)}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Smart Seat AI
            </Button>

            {/* Holding Timer Pill */}
            {isTimerRunning && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold animate-pulse-subtle">
                <Clock className="w-3.5 h-3.5" />
                <span>Expires in:</span>
                <span className="font-mono font-bold text-amber-200">
                  {formatTimer(holdingSecondsLeft)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Seat Map Screen & Matrix */}
          <div className="lg:col-span-8 bg-cinema-card border border-cinema-border rounded-2xl p-6 sm:p-8 space-y-8">
            {/* Curved Cinema Screen */}
            <div className="space-y-2 text-center">
              <div className="relative mx-auto w-4/5 max-w-lg">
                <div className="h-3 bg-gradient-to-r from-transparent via-brand-500 to-transparent rounded-t-full shadow-lg shadow-brand-500/30" />
                <div className="h-8 bg-gradient-to-b from-brand-500/10 to-transparent" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Cinema Screen
              </p>
            </div>

            {/* Interactive Grid */}
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <Skeleton className="w-64 h-8 rounded" />
                <Skeleton className="w-80 h-40 rounded-xl" />
              </div>
            ) : !layout ? (
              <div className="py-16 text-center text-red-400 text-sm">
                Could not load seats for this auditorium.
              </div>
            ) : (
              <div className="overflow-x-auto pb-4 pt-2">
                <div className="min-w-[460px] mx-auto flex flex-col items-center gap-2.5">
                  {/* Group seats by row */}
                  {Array.from(new Set(layout.seats.map((s) => s.row))).map((rowLetter) => {
                    const rowSeats = layout.seats
                      .filter((s) => s.row === rowLetter)
                      .sort((a, b) => a.col - b.col);

                    return (
                      <div key={rowLetter} className="flex items-center gap-2">
                        {/* Row letter label */}
                        <span className="w-5 text-xs font-mono font-bold text-slate-400 text-center">
                          {rowLetter}
                        </span>

                        {/* Seat items in row */}
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {rowSeats.map((seat) => {
                            const isSelected = selectedSeats.some((s) => s.id === seat.id);
                            const isHeldByOthers = seat.status === 'held_by_others' && !isSelected;
                            const isSold = seat.status === 'sold';

                            let seatStyle = 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500';
                            let icon = null;

                            if (isSold) {
                              seatStyle = 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-40';
                              icon = <X className="w-3 h-3" />;
                            } else if (isHeldByOthers) {
                              seatStyle =
                                'bg-orange-950/60 border-orange-500/70 text-orange-300 animate-pulse-subtle cursor-not-allowed';
                            } else if (isSelected) {
                              seatStyle =
                                'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/30 scale-105';
                              icon = <Check className="w-3 h-3" />;
                            } else if (seat.type === 'vip') {
                              seatStyle =
                                'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/20';
                            } else if (seat.type === 'couple') {
                              seatStyle =
                                'bg-pink-500/10 text-pink-300 border-pink-500/30 hover:border-pink-400 hover:bg-pink-500/20';
                            }

                            return (
                              <button
                                key={seat.id}
                                type="button"
                                disabled={isSold || isHeldByOthers || isLocking}
                                onClick={() => handleSeatClick(seat)}
                                title={`${seat.seatCode} - ${seat.type.toUpperCase()} (${formatCurrency(
                                  seat.price
                                )}) - ${seat.status}`}
                                aria-label={`Seat ${seat.seatCode}, type ${seat.type}, price ${formatCurrency(
                                  seat.price
                                )}, status ${seat.status}`}
                                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg border text-[11px] font-mono font-bold flex flex-col items-center justify-center transition-all duration-150 select-none ${seatStyle}`}
                              >
                                {icon || seat.col}
                              </button>
                            );
                          })}
                        </div>

                        {/* Right Row letter label */}
                        <span className="w-5 text-xs font-mono font-bold text-slate-400 text-center">
                          {rowLetter}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Seat Map Legend (Accessible: shapes, icons, and text) */}
            <div className="border-t border-cinema-border pt-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
                Auditorium Seating Legend
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border border-slate-700 bg-slate-800" />
                  <span>Standard</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border border-amber-500/40 bg-amber-500/15 text-amber-400 font-mono text-[10px] flex items-center justify-center">
                    V
                  </div>
                  <span>VIP Prime</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border border-pink-500/40 bg-pink-500/15 text-pink-400 font-mono text-[10px] flex items-center justify-center">
                    C
                  </div>
                  <span>Couple</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border border-emerald-400 bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Selected (Held)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border border-orange-500 bg-orange-900/60" />
                  <span>Held by Others</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border border-slate-800 bg-slate-900 opacity-50 flex items-center justify-center text-slate-600">
                    <X className="w-3 h-3" />
                  </div>
                  <span>Sold Out</span>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Summary Sidebar */}
          <div className="lg:col-span-4 bg-cinema-card border border-cinema-border rounded-2xl p-6 space-y-6 sticky top-24">
            <h2 className="text-base font-bold text-white border-b border-cinema-border pb-3 flex items-center justify-between">
              <span>Booking Summary</span>
              <span className="text-xs font-semibold text-slate-400">
                {selectedSeats.length} / 8 seats
              </span>
            </h2>

            {/* Selected Seats List */}
            {selectedSeats.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Armchair className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No seats selected yet.</p>
                <p className="text-[11px] text-slate-500">
                  Click on any available seat on the map or use <strong>Smart Seat AI</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {selectedSeats.map((seat) => (
                    <div
                      key={seat.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-cinema-border text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/20 text-brand-300 font-mono font-bold">
                          {seat.seatCode}
                        </span>
                        <span className="capitalize text-slate-300">{seat.type} Seat</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{formatCurrency(seat.price)}</span>
                        <button
                          type="button"
                          onClick={() => handleSeatClick(seat)}
                          className="text-slate-400 hover:text-red-400 p-0.5"
                          title="Remove seat"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear selection
                  </button>
                </div>

                {/* Total Price & Proceed */}
                <div className="pt-4 border-t border-cinema-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Total Ticket Price:</span>
                    <span className="text-xl font-extrabold text-white">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    onClick={() => navigate('/booking/order')}
                    disabled={selectedSeats.length === 0 || isLocking}
                  >
                    Proceed to Concessions
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Smart Seat Modal */}
      {showtimeId && (
        <SmartSeatModal
          isOpen={isSmartSeatOpen}
          onClose={() => setIsSmartSeatOpen(false)}
          showtimeId={showtimeId}
          onAcceptSeats={handleAcceptSmartSeats}
        />
      )}

      {/* Holding Timer Expired Modal */}
      <Modal
        isOpen={expiredModalOpen}
        onClose={() => setExpiredModalOpen(false)}
        maxWidth="sm"
        title={
          <span className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            Reservation Expired
          </span>
        }
        footer={
          <Button variant="primary" onClick={() => setExpiredModalOpen(false)}>
            Select Seats Again
          </Button>
        }
      >
        <p className="text-sm text-slate-300 leading-relaxed">
          Your 5-minute holding reservation has expired. The held seats have been released back to
          the public. Please select your seats again to proceed.
        </p>
      </Modal>
    </div>
  );
};
