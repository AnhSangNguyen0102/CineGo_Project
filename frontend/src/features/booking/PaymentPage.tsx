import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import {
  CreditCard,
  QrCode,
  Building2,
  Clock,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useBookingStore } from './useBookingStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { Booking } from '@/types';
import { formatCurrency, formatTime, formatDate } from '@/utils/cn';

export const PaymentPage: React.FC = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { holdingSecondsLeft, isTimerRunning, tickTimer, stopHoldingTimer, resetBooking } =
    useBookingStore();

  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'momo' | 'bank_transfer'>(
    'credit_card'
  );
  const [simulateOutcome, setSimulateOutcome] = useState<'success' | 'failure' | 'timeout'>(
    'success'
  );

  // Card form state
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardHolder, setCardHolder] = useState('ALEX RIVERA');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('888');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paidBooking, setPaidBooking] = useState<Booking | null>(null);
  const [expiredModalOpen, setExpiredModalOpen] = useState(false);

  // Fetch pending booking details
  const { data: booking, isLoading } = useQuery({
    queryKey: ['order-payment', orderId],
    queryFn: async () => {
      const res = await apiClient.get<Booking>(ENDPOINTS.ORDERS.DETAIL(orderId!));
      return res.data;
    },
    enabled: !!orderId,
  });

  // Keep countdown running
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, tickTimer]);

  // Handle timer reaching 0
  useEffect(() => {
    if (isTimerRunning && holdingSecondsLeft <= 0 && !isSuccess) {
      stopHoldingTimer();
      setExpiredModalOpen(true);
    }
  }, [holdingSecondsLeft, isTimerRunning, isSuccess, stopHoldingTimer]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;

    try {
      setIsProcessing(true);
      setErrorDetails(null);

      // Call mock pay endpoint
      const res = await apiClient.post(ENDPOINTS.ORDERS.PAY(orderId), {
        paymentMethod,
        simulateOutcome,
      });

      // Celebration confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setIsSuccess(true);
      setPaidBooking(res.data.booking);
      stopHoldingTimer();
      resetBooking();
      toast.success('Your simulated payment was successful!', 'Tickets Confirmed');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Payment simulation failed. Please try again.';
      setErrorDetails(msg);
      toast.error(msg, 'Payment Declined');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFillTestCard = () => {
    setCardNumber('4000 1234 5678 9010');
    setCardHolder('ALEX RIVERA');
    setExpiry('08/29');
    setCvv('123');
    setSimulateOutcome('success');
    setErrorDetails(null);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Order Not Found</h2>
        <Link to="/">
          <Button variant="primary">Return Home</Button>
        </Link>
      </div>
    );
  }

  // Success Confirmation Screen
  if (isSuccess && paidBooking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <Badge variant="success">Payment Approved (Simulated)</Badge>
          <h1 className="text-3xl font-extrabold text-white">Booking Confirmed!</h1>
          <p className="text-xs text-slate-400">
            Order Reference: <strong className="text-brand-400 font-mono">{paidBooking.orderCode}</strong>
          </p>
        </div>

        <Card className="p-6 text-left space-y-4">
          <div className="flex items-center gap-4 border-b border-cinema-border pb-4">
            <img
              src={paidBooking.movie.posterUrl}
              alt={paidBooking.movie.title}
              className="w-16 h-24 rounded-lg object-cover"
            />
            <div>
              <h3 className="text-lg font-bold text-white">{paidBooking.movie.title}</h3>
              <p className="text-xs text-slate-400">{paidBooking.cinema.name}</p>
              <p className="text-xs text-brand-400 font-semibold">
                {paidBooking.cinema.roomName} • {formatDate(paidBooking.showtime.startTime)} at{' '}
                {formatTime(paidBooking.showtime.startTime)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Seats Booked:</span>
              <span className="font-mono font-bold text-white">
                {paidBooking.seats.map((s) => s.seatCode).join(', ')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Total Paid:</span>
              <span className="font-extrabold text-emerald-400 text-sm">
                {formatCurrency(paidBooking.finalTotal)}
              </span>
            </div>
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to={`/tickets/${paidBooking.id}`} className="w-full sm:w-auto">
            <Button variant="primary" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
              View Scannable QR Ticket
            </Button>
          </Link>
          <Link to="/tickets" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full">
              My Booking History
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Top Header */}
      <div className="bg-slate-900 border-b border-cinema-border py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              Simulated Checkout & Payment
            </h1>
            <p className="text-xs text-slate-400">
              Complete your simulated payment before the reservation timer runs out.
            </p>
          </div>

          {isTimerRunning && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Seat lock timer:</span>
              <span className="font-mono font-bold text-amber-200">
                {formatTimer(holdingSecondsLeft)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Payment Method Selector & Form */}
          <div className="lg:col-span-8 space-y-6">
            {/* Academic Simulation Banner */}
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-300">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Academic Simulation Environment</p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  This checkout is entirely simulated. No real credit card or bank details are
                  processed. You can test success, bank decline, or timeout flows.
                </p>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('credit_card')}
                className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === 'credit_card'
                    ? 'bg-brand-500/10 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                    : 'bg-cinema-card border-cinema-border text-slate-400 hover:bg-slate-800'
                }`}
              >
                <CreditCard className="w-5 h-5 text-brand-400" />
                <span className="text-xs font-bold">Credit / Debit Card</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('momo')}
                className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === 'momo'
                    ? 'bg-rose-500/10 border-rose-500 text-white shadow-lg shadow-rose-500/10'
                    : 'bg-cinema-card border-cinema-border text-slate-400 hover:bg-slate-800'
                }`}
              >
                <QrCode className="w-5 h-5 text-rose-400" />
                <span className="text-xs font-bold">E-Wallet (Momo / VNPay)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === 'bank_transfer'
                    ? 'bg-sky-500/10 border-sky-500 text-white shadow-lg shadow-sky-500/10'
                    : 'bg-cinema-card border-cinema-border text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Building2 className="w-5 h-5 text-sky-400" />
                <span className="text-xs font-bold">Bank Transfer QR</span>
              </button>
            </div>

            {/* Payment Details Container */}
            <Card className="p-6">
              {paymentMethod === 'credit_card' && (
                <form onSubmit={handlePay} className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-cinema-border">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Simulated Card Form
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleFillTestCard}
                      leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                      className="text-xs py-1"
                    >
                      Fill Demo Card
                    </Button>
                  </div>

                  <Input
                    label="Card Number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    leftIcon={<CreditCard className="w-4 h-4" />}
                    required
                  />

                  <Input
                    label="Cardholder Name"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    required
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Expiry Date"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      placeholder="MM/YY"
                      required
                    />
                    <Input
                      label="CVV / CVC"
                      type="password"
                      maxLength={4}
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      placeholder="•••"
                      required
                    />
                  </div>

                  {/* Simulator outcome controls */}
                  <div className="pt-3 border-t border-cinema-border space-y-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Simulation Outcome Tester:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSimulateOutcome('success')}
                        className={`py-1.5 px-2 text-xs rounded-lg border font-semibold ${
                          simulateOutcome === 'success'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                            : 'bg-slate-900 text-slate-400 border-cinema-border'
                        }`}
                      >
                        ✓ Success
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimulateOutcome('failure')}
                        className={`py-1.5 px-2 text-xs rounded-lg border font-semibold ${
                          simulateOutcome === 'failure'
                            ? 'bg-red-500/20 text-red-300 border-red-500'
                            : 'bg-slate-900 text-slate-400 border-cinema-border'
                        }`}
                      >
                        ✗ Card Declined
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimulateOutcome('timeout')}
                        className={`py-1.5 px-2 text-xs rounded-lg border font-semibold ${
                          simulateOutcome === 'timeout'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                            : 'bg-slate-900 text-slate-400 border-cinema-border'
                        }`}
                      >
                        ⏱ Timeout
                      </button>
                    </div>
                  </div>

                  {errorDetails && (
                    <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span>Payment Error</span>
                      </div>
                      <p>{errorDetails}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Your seat lock is still valid! Switch outcome to <strong>Success</strong> and retry.
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full mt-4"
                    isLoading={isProcessing}
                  >
                    Confirm & Pay {formatCurrency(booking.finalTotal)}
                  </Button>
                </form>
              )}

              {paymentMethod === 'momo' && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl shadow-xl flex flex-col items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=CINEGO_MOMO_SIMULATION_${booking.id}`}
                      alt="Momo QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-200">
                      Scan with Momo / VNPay mobile app
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Or click the button below to simulate immediate completion.
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full max-w-sm mx-auto"
                    onClick={handlePay}
                    isLoading={isProcessing}
                  >
                    Simulate Wallet Approval
                  </Button>
                </div>
              )}

              {paymentMethod === 'bank_transfer' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-cinema-border space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Beneficiary Bank:</span>
                      <span className="font-semibold text-white">CineGo Simulated Bank</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Account Number:</span>
                      <span className="font-mono font-bold text-brand-400">9842 1000 8888</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Transfer Note:</span>
                      <span className="font-mono font-bold text-amber-300">{booking.orderCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Amount:</span>
                      <span className="font-bold text-white">{formatCurrency(booking.finalTotal)}</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handlePay}
                    isLoading={isProcessing}
                  >
                    Confirm Simulated Bank Transfer
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Right Order Review Column */}
          <div className="lg:col-span-4 bg-cinema-card border border-cinema-border rounded-2xl p-6 space-y-6 sticky top-24">
            <h2 className="text-base font-bold text-white border-b border-cinema-border pb-3">
              Order #{booking.orderCode}
            </h2>

            {/* Movie */}
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-white text-sm">{booking.movie.title}</h4>
              <p className="text-slate-400">{booking.cinema.name}</p>
              <p className="text-brand-400 font-medium">
                {booking.cinema.roomName} • {formatDate(booking.showtime.startTime)} at{' '}
                {formatTime(booking.showtime.startTime)}
              </p>
            </div>

            {/* Seats */}
            <div className="pt-2 border-t border-cinema-border space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Seats ({booking.seats.length}):</span>
                <span className="text-white font-semibold">
                  {booking.seats.map((s) => s.seatCode).join(', ')}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Seat Subtotal:</span>
                <span className="text-white font-medium">{formatCurrency(booking.totalSeatPrice)}</span>
              </div>
            </div>

            {/* Food items */}
            {booking.foodItems.length > 0 && (
              <div className="pt-2 border-t border-cinema-border space-y-1 text-xs">
                <span className="text-slate-400 block mb-1">Snacks & Concessions:</span>
                {booking.foodItems.map((f, i) => (
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
            <div className="pt-4 border-t border-cinema-border flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-300">Grand Total:</span>
              <span className="text-2xl font-extrabold text-white">
                {formatCurrency(booking.finalTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Holding Expired Modal */}
      <Modal
        isOpen={expiredModalOpen}
        onClose={() => setExpiredModalOpen(false)}
        maxWidth="sm"
        title={
          <span className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            Seat Lock Expired
          </span>
        }
        footer={
          <Button variant="primary" onClick={() => navigate('/')}>
            Back to Catalog
          </Button>
        }
      >
        <p className="text-sm text-slate-300 leading-relaxed">
          The 5-minute holding time for your seats has expired while on the checkout page. The
          seats have been released. Please return to the showtimes to choose new seats.
        </p>
      </Modal>
    </div>
  );
};
