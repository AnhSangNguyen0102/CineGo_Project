import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  UtensilsCrossed,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Popcorn,
  Ticket,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useBookingStore } from './useBookingStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { FoodItem, Booking } from '@/types';
import { formatCurrency, formatTime, formatDate } from '@/utils/cn';

export const OrderFoodPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    currentShowtime,
    selectedSeats,
    foodSelections,
    setFoodQuantity,
    holdingSecondsLeft,
    isTimerRunning,
    setPendingOrderId,
  } = useBookingStore();

  const [activeCategory, setActiveCategory] = useState<'all' | 'combo' | 'popcorn' | 'drink' | 'snack'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch food items
  const { data: foodItems, isLoading } = useQuery({
    queryKey: ['food-items'],
    queryFn: async () => {
      const res = await apiClient.get<FoodItem[]>(ENDPOINTS.FOOD.LIST);
      return res.data;
    },
  });

  // If user accesses order page without seats selected, prompt redirect
  if (selectedSeats.length === 0 || !currentShowtime) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <Ticket className="w-12 h-12 text-slate-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">No Seats Selected</h2>
        <p className="text-xs text-slate-400">
          Please select your showtime and seats before choosing snacks and drinks.
        </p>
        <Link to="/">
          <Button variant="primary">Browse Movies</Button>
        </Link>
      </div>
    );
  }

  const filteredFood = foodItems?.filter((item) =>
    activeCategory === 'all' ? true : item.category === activeCategory
  );

  const totalSeatPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  const selectedFoodList = Object.entries(foodSelections)
    .map(([foodId, qty]) => {
      const item = foodItems?.find((f) => f.id === foodId);
      if (!item || qty <= 0) return null;
      return { item, quantity: qty, subtotal: item.price * qty };
    })
    .filter(Boolean) as { item: FoodItem; quantity: number; subtotal: number }[];

  const totalFoodPrice = selectedFoodList.reduce((sum, f) => sum + f.subtotal, 0);
  const grandTotal = totalSeatPrice + totalFoodPrice;

  const handleCreateOrder = async () => {
    try {
      setIsSubmitting(true);
      const payload = {
        showtimeId: currentShowtime.id,
        seatIds: selectedSeats.map((s) => s.id),
        foodItems: Object.entries(foodSelections).map(([foodId, quantity]) => ({
          foodId,
          quantity,
        })),
      };

      const res = await apiClient.post<Booking>(ENDPOINTS.ORDERS.CREATE, payload);
      setPendingOrderId(res.data.id);
      navigate(`/booking/payment/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Top Header */}
      <div className="bg-slate-900 border-b border-cinema-border py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to={`/showtimes/${currentShowtime.id}/seats`}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Enhance Your Cinema Experience</span>
              </h1>
              <p className="text-xs text-slate-400">
                Fresh gourmet popcorn, signature drink combos, and movie treats.
              </p>
            </div>
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
          {/* Food Menu Section */}
          <div className="lg:col-span-8 space-y-6">
            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'combo', label: 'Value Combos' },
                { id: 'popcorn', label: 'Popcorn' },
                { id: 'drink', label: 'Drinks' },
                { id: 'snack', label: 'Snacks' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                    activeCategory === cat.id
                      ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-500/20'
                      : 'bg-cinema-card text-slate-300 border-cinema-border hover:bg-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Food Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-40 rounded-xl" />
                ))}
              </div>
            ) : !filteredFood || filteredFood.length === 0 ? (
              <div className="text-center py-12 bg-cinema-card border border-cinema-border rounded-xl p-6">
                <Popcorn className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No concessions available in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredFood.map((food) => {
                  const qty = foodSelections[food.id] || 0;

                  return (
                    <div
                      key={food.id}
                      className="bg-cinema-card border border-cinema-border rounded-xl p-4 flex gap-4 hover:border-slate-600 transition-colors"
                    >
                      {/* Image */}
                      <img
                        src={food.imageUrl}
                        alt={food.name}
                        className="w-24 h-24 rounded-lg object-cover bg-slate-900 shrink-0"
                      />

                      {/* Content */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-sm text-white">{food.name}</h3>
                            <Badge variant="gold" size="sm">
                              {food.category}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                            {food.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <span className="font-extrabold text-sm text-brand-400">
                            {formatCurrency(food.price)}
                          </span>

                          {/* Quantity Selector */}
                          <div className="flex items-center gap-2 bg-slate-900 border border-cinema-border rounded-lg p-1">
                            <button
                              type="button"
                              onClick={() => setFoodQuantity(food.id, Math.max(0, qty - 1))}
                              disabled={qty === 0}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-mono font-bold text-white">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => setFoodQuantity(food.id, qty + 1)}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Complete Order Summary Column */}
          <div className="lg:col-span-4 bg-cinema-card border border-cinema-border rounded-2xl p-6 space-y-6 sticky top-24">
            <h2 className="text-base font-bold text-white border-b border-cinema-border pb-3 flex items-center justify-between">
              <span>Order Summary</span>
              <Badge variant="primary">Step 2 of 3</Badge>
            </h2>

            {/* Movie Info */}
            <div className="flex gap-3 items-center">
              <img
                src={currentShowtime.moviePoster}
                alt={currentShowtime.movieTitle}
                className="w-12 h-16 rounded object-cover bg-slate-900 shrink-0"
              />
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-white truncate">
                  {currentShowtime.movieTitle}
                </h4>
                <p className="text-[11px] text-slate-400 truncate">{currentShowtime.cinemaName}</p>
                <p className="text-[11px] text-brand-400 font-medium">
                  {currentShowtime.roomName} • {formatDate(currentShowtime.startTime)} at{' '}
                  {formatTime(currentShowtime.startTime)}
                </p>
              </div>
            </div>

            {/* Seats Breakdown */}
            <div className="space-y-2 pt-2 border-t border-cinema-border">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Selected Seats ({selectedSeats.length})</span>
                <span>{formatCurrency(totalSeatPrice)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedSeats.map((s) => (
                  <span
                    key={s.id}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-cinema-border text-[11px] font-mono text-slate-200"
                  >
                    {s.seatCode} ({formatCurrency(s.price)})
                  </span>
                ))}
              </div>
            </div>

            {/* Food Breakdown */}
            <div className="space-y-2 pt-2 border-t border-cinema-border">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Concessions & Snacks</span>
                <span>{formatCurrency(totalFoodPrice)}</span>
              </div>
              {selectedFoodList.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No snacks added yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedFoodList.map((f) => (
                    <div
                      key={f.item.id}
                      className="flex items-center justify-between text-xs text-slate-300"
                    >
                      <span className="truncate max-w-[180px]">
                        {f.quantity}x {f.item.name}
                      </span>
                      <span className="font-medium text-white">{formatCurrency(f.subtotal)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total & Action */}
            <div className="pt-4 border-t border-cinema-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-300">Total Payable:</span>
                <span className="text-2xl font-extrabold text-white">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              <Button
                variant="primary"
                className="w-full"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={handleCreateOrder}
                isLoading={isSubmitting}
              >
                Proceed to Simulated Payment
              </Button>

              <Link to={`/showtimes/${currentShowtime.id}/seats`} className="block">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  Change Seats
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
