import { create } from 'zustand';
import { Showtime, ShowtimeSeat } from '@/types';

interface BookingState {
  currentShowtime: Showtime | null;
  selectedSeats: ShowtimeSeat[];
  lockExpiresAt: string | null;
  holdingSecondsLeft: number;
  isTimerRunning: boolean;
  foodSelections: Record<string, number>; // foodId -> quantity
  pendingOrderId: string | null;

  setCurrentShowtime: (showtime: Showtime | null) => void;
  setSelectedSeats: (seats: ShowtimeSeat[]) => void;
  toggleSeat: (seat: ShowtimeSeat) => boolean; // returns true if seat was added
  setRecommendedSeats: (seats: ShowtimeSeat[]) => void;
  startHoldingTimer: (expiresAt: string) => void;
  tickTimer: () => void;
  stopHoldingTimer: () => void;
  setFoodQuantity: (foodId: string, quantity: number) => void;
  clearFood: () => void;
  setPendingOrderId: (orderId: string | null) => void;
  resetBooking: () => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  currentShowtime: null,
  selectedSeats: [],
  lockExpiresAt: null,
  holdingSecondsLeft: 0,
  isTimerRunning: false,
  foodSelections: {},
  pendingOrderId: null,

  setCurrentShowtime: (showtime) => {
    set({
      currentShowtime: showtime,
      selectedSeats: [],
      lockExpiresAt: null,
      holdingSecondsLeft: 0,
      isTimerRunning: false,
      foodSelections: {},
      pendingOrderId: null,
    });
  },

  setSelectedSeats: (seats) => set({ selectedSeats: seats }),

  toggleSeat: (seat) => {
    const { selectedSeats } = get();
    const exists = selectedSeats.some((s) => s.id === seat.id);

    if (exists) {
      set({ selectedSeats: selectedSeats.filter((s) => s.id !== seat.id) });
      return false;
    } else {
      if (selectedSeats.length >= 8) {
        return false;
      }
      set({ selectedSeats: [...selectedSeats, seat] });
      return true;
    }
  },

  setRecommendedSeats: (seats) => {
    set({ selectedSeats: seats.slice(0, 8) });
  },

  startHoldingTimer: (expiresAt: string) => {
    const expiryMs = new Date(expiresAt).getTime();
    const nowMs = Date.now();
    const diffSeconds = Math.max(0, Math.floor((expiryMs - nowMs) / 1000));

    set({
      lockExpiresAt: expiresAt,
      holdingSecondsLeft: diffSeconds,
      isTimerRunning: true,
    });
  },

  tickTimer: () => {
    const { holdingSecondsLeft } = get();
    if (holdingSecondsLeft <= 1) {
      set({
        holdingSecondsLeft: 0,
        isTimerRunning: false,
        lockExpiresAt: null,
        selectedSeats: [],
      });
    } else {
      set({ holdingSecondsLeft: holdingSecondsLeft - 1 });
    }
  },

  stopHoldingTimer: () => {
    set({
      isTimerRunning: false,
      holdingSecondsLeft: 0,
      lockExpiresAt: null,
    });
  },

  setFoodQuantity: (foodId, quantity) => {
    const current = { ...get().foodSelections };
    if (quantity <= 0) {
      delete current[foodId];
    } else {
      current[foodId] = quantity;
    }
    set({ foodSelections: current });
  },

  clearFood: () => set({ foodSelections: {} }),

  setPendingOrderId: (orderId) => set({ pendingOrderId: orderId }),

  resetBooking: () => {
    set({
      selectedSeats: [],
      lockExpiresAt: null,
      holdingSecondsLeft: 0,
      isTimerRunning: false,
      foodSelections: {},
      pendingOrderId: null,
    });
  },
}));
