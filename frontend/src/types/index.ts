export type Role = 'guest' | 'customer' | 'staff' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  synopsis: string;
  director: string;
  cast: string[];
  durationMinutes: number;
  genres: string[];
  ageRating: 'P' | 'K' | 'T13' | 'T16' | 'T18' | 'C';
  posterUrl: string;
  bannerUrl: string;
  trailerUrl: string;
  releaseDate: string;
  status: 'now_showing' | 'coming_soon';
  rating: number; // e.g., 8.8
  reviewCount: number;
  isActive: boolean;
}

export interface Cinema {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  totalRooms: number;
  isActive: boolean;
}

export type SeatType = 'standard' | 'vip' | 'couple' | 'aisle';
export type SeatStatus = 'available' | 'held_by_me' | 'held_by_others' | 'sold';

export interface RoomSeatConfig {
  id: string;
  row: string; // e.g. "A"
  col: number; // e.g. 1
  seatCode: string; // e.g. "A1"
  type: SeatType;
}

export interface Room {
  id: string;
  cinemaId: string;
  cinemaName: string;
  name: string;
  totalRows: number;
  totalCols: number;
  totalSeats: number;
  seatLayout: RoomSeatConfig[];
  isActive: boolean;
}

export interface Showtime {
  id: string;
  movieId: string;
  movieTitle: string;
  moviePoster: string;
  ageRating: 'P' | 'K' | 'T13' | 'T16' | 'T18' | 'C';
  durationMinutes: number;
  cinemaId: string;
  cinemaName: string;
  roomId: string;
  roomName: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  priceBase: number; // Standard seat price in USD or VND
  availableSeats: number;
  totalSeats: number;
  status: 'scheduled' | 'running' | 'completed' | 'cancelled';
}

export interface ShowtimeSeat {
  id: string;
  showtimeId: string;
  row: string;
  col: number;
  seatCode: string;
  type: SeatType;
  status: SeatStatus;
  price: number;
  lockedByUserId?: string;
  lockedUntil?: string; // ISO string
}

export interface SeatLayoutResponse {
  showtimeId: string;
  rows: number;
  cols: number;
  seats: ShowtimeSeat[];
}

export interface FoodItem {
  id: string;
  name: string;
  description: string;
  category: 'combo' | 'popcorn' | 'drink' | 'snack';
  price: number;
  imageUrl: string;
  isActive: boolean;
}

export interface SelectedFood {
  foodId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Booking {
  id: string;
  orderCode: string;
  userId: string;
  userName: string;
  userEmail: string;
  showtimeId: string;
  movie: {
    id: string;
    title: string;
    posterUrl: string;
    ageRating: string;
  };
  cinema: {
    id: string;
    name: string;
    roomName: string;
  };
  showtime: {
    startTime: string;
    endTime: string;
  };
  seats: {
    id: string;
    seatCode: string;
    type: SeatType;
    price: number;
  }[];
  foodItems: SelectedFood[];
  totalSeatPrice: number;
  totalFoodPrice: number;
  discountAmount: number;
  finalTotal: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  paymentMethod: 'credit_card' | 'momo' | 'vnpay' | 'bank_transfer';
  qrToken: string;
  checkInStatus: 'valid' | 'used' | 'expired';
  checkedInAt?: string;
  checkedInBy?: string;
  createdAt: string;
}

export interface AdminStats {
  totalRevenue: number;
  totalTicketsSold: number;
  totalOrders: number;
  averageOccupancyRate: number;
  revenueByDate: {
    date: string;
    revenue: number;
    tickets: number;
  }[];
  topMovies: {
    movieId: string;
    title: string;
    revenue: number;
    ticketsSold: number;
  }[];
  occupancyByShowtime: {
    showtimeId: string;
    movieTitle: string;
    occupancyRate: number;
    cinemaRoom: string;
  }[];
}

export interface CheckinResult {
  status: 'valid' | 'already_used' | 'invalid' | 'wrong_showtime';
  message: string;
  ticket?: Booking;
  checkedInAt?: string;
}
