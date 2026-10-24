import { http, HttpResponse } from 'msw';
import {
  SEED_USERS,
  SEED_MOVIES,
  SEED_SHOWTIMES,
  SEED_FOOD_ITEMS,
  SEED_BOOKINGS,
  SEED_ROOMS,
  generateShowtimeSeats,
} from './seedData';
import { User, Movie, Showtime, ShowtimeSeat, Booking, FoodItem, Room } from '@/types';
import { socketManager } from '@/api/socket';

// In-memory stateful data copies
let users: User[] = [...SEED_USERS];
let movies: Movie[] = [...SEED_MOVIES];
let showtimes: Showtime[] = [...SEED_SHOWTIMES];
let foodItems: FoodItem[] = [...SEED_FOOD_ITEMS];
let bookings: Booking[] = [...SEED_BOOKINGS];
let rooms: Room[] = [...SEED_ROOMS];

// Cache of showtime seats: Map<showtimeId, ShowtimeSeat[]>
const showtimeSeatsCache = new Map<string, ShowtimeSeat[]>();

function getSeatsForShowtime(showtimeId: string): ShowtimeSeat[] {
  if (!showtimeSeatsCache.has(showtimeId)) {
    const showtime = showtimes.find((st) => st.id === showtimeId) || showtimes[0];
    showtimeSeatsCache.set(showtimeId, generateShowtimeSeats(showtime));
  }
  return showtimeSeatsCache.get(showtimeId)!;
}

// Helper to get authenticated user from auth header
function getAuthUser(request: Request): User | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.replace('Bearer ', '');
  const user = users.find((u) => `mock_token_${u.id}` === token || token.includes(u.email));
  return user || users[0]; // fallback for demo convenience
}

export const handlers = [
  // ===================== AUTH HANDLERS =====================
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password?: string };
    const user = users.find((u) => u.email.toLowerCase() === body.email?.toLowerCase());

    if (!user) {
      return HttpResponse.json({ message: 'Invalid email or password' }, { status: 400 });
    }

    if (!user.isActive) {
      return HttpResponse.json({ message: 'Your account is deactivated' }, { status: 403 });
    }

    const token = `mock_token_${user.id}`;
    return HttpResponse.json({ user, token });
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const body = (await request.json()) as { email: string; fullName: string; phone?: string };
    const existing = users.find((u) => u.email.toLowerCase() === body.email?.toLowerCase());

    if (existing) {
      return HttpResponse.json({ message: 'Email already registered' }, { status: 400 });
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      email: body.email,
      fullName: body.fullName,
      phone: body.phone || '',
      role: 'customer',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    const token = `mock_token_${newUser.id}`;
    return HttpResponse.json({ user: newUser, token }, { status: 201 });
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('/api/auth/forgot-password', async ({ request }) => {
    const body = (await request.json()) as { email: string };
    return HttpResponse.json({
      success: true,
      message: `If an account exists for ${body.email}, a reset code has been sent. Use code '123456' for testing.`,
      resetToken: 'mock-reset-token-123456',
    });
  }),

  http.post('/api/auth/reset-password', async () => {
    return HttpResponse.json({
      success: true,
      message: 'Password has been reset successfully. You may now log in.',
    });
  }),

  http.get('/api/me', ({ request }) => {
    const user = getAuthUser(request);
    if (!user) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json({ user });
  }),

  http.put('/api/me', async ({ request }) => {
    const user = getAuthUser(request);
    if (!user) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = (await request.json()) as Partial<User>;
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...body, email: user.email, role: user.role };
      return HttpResponse.json({ user: users[idx] });
    }
    return HttpResponse.json({ user });
  }),

  // ===================== MOVIES HANDLERS =====================
  http.get('/api/movies', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const query = url.searchParams.get('q')?.toLowerCase();
    const genre = url.searchParams.get('genre');

    let result = movies.filter((m) => m.isActive);

    if (status) {
      result = result.filter((m) => m.status === status);
    }
    if (query) {
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.director.toLowerCase().includes(query) ||
          m.cast.some((c) => c.toLowerCase().includes(query))
      );
    }
    if (genre && genre !== 'All') {
      result = result.filter((m) => m.genres.includes(genre));
    }

    return HttpResponse.json(result);
  }),

  http.get('/api/movies/:id', ({ params }) => {
    const movie = movies.find((m) => m.id === params.id);
    if (!movie) {
      return HttpResponse.json({ message: 'Movie not found' }, { status: 404 });
    }
    return HttpResponse.json(movie);
  }),

  http.get('/api/movies/:id/showtimes', ({ params, request }) => {
    const url = new URL(request.url);
    const dateParam = url.searchParams.get('date');
    const cinemaParam = url.searchParams.get('cinemaId');

    let list = showtimes.filter((st) => st.movieId === params.id);

    if (dateParam) {
      list = list.filter((st) => st.startTime.startsWith(dateParam));
    }
    if (cinemaParam && cinemaParam !== 'all') {
      list = list.filter((st) => st.cinemaId === cinemaParam);
    }

    return HttpResponse.json(list);
  }),

  // ===================== SHOWTIME & SEATS HANDLERS =====================
  http.get('/api/showtimes/:id/seats', ({ params, request }) => {
    const user = getAuthUser(request);
    const seats = getSeatsForShowtime(params.id as string);
    const showtime = showtimes.find((st) => st.id === params.id) || showtimes[0];
    const totalRows = showtime.roomId === 'room_1' ? 8 : 6;
    const totalCols = showtime.roomId === 'room_1' ? 10 : 8;

    // Check expired locks (5 minutes)
    const now = new Date();
    seats.forEach((seat) => {
      if (
        (seat.status === 'held_by_me' || seat.status === 'held_by_others') &&
        seat.lockedUntil &&
        new Date(seat.lockedUntil) < now
      ) {
        seat.status = 'available';
        seat.lockedByUserId = undefined;
        seat.lockedUntil = undefined;
      }
    });

    // Update status relative to current user
    const userSpecificSeats = seats.map((seat) => {
      if (seat.status === 'held_by_me' || seat.status === 'held_by_others') {
        if (seat.lockedByUserId === user?.id) {
          return { ...seat, status: 'held_by_me' as const };
        } else {
          return { ...seat, status: 'held_by_others' as const };
        }
      }
      return seat;
    });

    return HttpResponse.json({
      showtimeId: params.id,
      rows: totalRows,
      cols: totalCols,
      seats: userSpecificSeats,
    });
  }),

  // Atomic seat lock: all or none!
  http.post('/api/showtimes/:id/seats/lock', async ({ params, request }) => {
    const user = getAuthUser(request);
    const body = (await request.json()) as { seatIds: string[] };
    const { seatIds } = body;
    const seats = getSeatsForShowtime(params.id as string);

    // Verify all requested seats are available or already held by me
    const conflict = seatIds.some((id) => {
      const seat = seats.find((s) => s.id === id);
      if (!seat) return true;
      if (seat.status === 'sold') return true;
      if (seat.status === 'held_by_others' && seat.lockedByUserId !== user?.id) {
        // check if still locked
        if (seat.lockedUntil && new Date(seat.lockedUntil) > new Date()) return true;
      }
      return false;
    });

    if (conflict) {
      return HttpResponse.json(
        {
          conflict: true,
          message: 'One or more chosen seats were just taken. The seat map has been refreshed.',
        },
        { status: 409 }
      );
    }

    // Atomic Lock for 5 minutes
    const lockExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    seatIds.forEach((id) => {
      const seat = seats.find((s) => s.id === id);
      if (seat) {
        seat.status = 'held_by_me';
        seat.lockedByUserId = user?.id;
        seat.lockedUntil = lockExpiry;

        // Broadcast real-time update to socket
        socketManager.emitMockEvent('seat:update', {
          showtimeId: params.id,
          seatId: seat.id,
          seatCode: seat.seatCode,
          status: 'held_by_others',
          lockedByUserId: user?.id,
        });
      }
    });

    return HttpResponse.json({
      success: true,
      lockedSeatIds: seatIds,
      expiresAt: lockExpiry,
    });
  }),

  // Unlock seats
  http.post('/api/showtimes/:id/seats/unlock', async ({ params, request }) => {
    const user = getAuthUser(request);
    const body = (await request.json()) as { seatIds: string[] };
    const { seatIds } = body;
    const seats = getSeatsForShowtime(params.id as string);

    seatIds.forEach((id) => {
      const seat = seats.find((s) => s.id === id);
      if (seat && (seat.lockedByUserId === user?.id || !seat.lockedByUserId)) {
        seat.status = 'available';
        seat.lockedByUserId = undefined;
        seat.lockedUntil = undefined;

        socketManager.emitMockEvent('seat:update', {
          showtimeId: params.id,
          seatId: seat.id,
          seatCode: seat.seatCode,
          status: 'available',
        });
      }
    });

    return HttpResponse.json({ success: true, releasedSeatIds: seatIds });
  }),

  // Smart Seat Recommendation Algorithm
  http.post('/api/showtimes/:id/smart-seat', async ({ params, request }) => {
    const body = (await request.json()) as {
      count: number;
      preferences?: {
        zone?: 'vip' | 'standard' | 'couple' | 'center' | 'back' | 'front';
        together?: boolean;
      };
    };

    const count = Math.min(Math.max(body.count || 2, 1), 8);
    const zonePref = body.preferences?.zone || 'center';
    const seats = getSeatsForShowtime(params.id as string);

    // Group available seats by row
    const available = seats.filter((s) => s.status === 'available');

    if (available.length < count) {
      return HttpResponse.json(
        { message: 'Not enough available seats for this request' },
        { status: 400 }
      );
    }

    const rowsGrouped: Record<string, ShowtimeSeat[]> = {};
    available.forEach((s) => {
      if (!rowsGrouped[s.row]) rowsGrouped[s.row] = [];
      rowsGrouped[s.row].push(s);
    });

    // Score and rank rows based on preference
    const rowKeys = Object.keys(rowsGrouped);
    const midRowIdx = Math.floor(rowKeys.length / 2);

    let bestSeatGroup: ShowtimeSeat[] | null = null;

    // Try finding contiguous seats in each row
    for (const r of rowKeys) {
      const rowSeats = rowsGrouped[r].sort((a, b) => a.col - b.col);
      for (let i = 0; i <= rowSeats.length - count; i++) {
        let isContiguous = true;
        for (let j = 0; j < count - 1; j++) {
          if (rowSeats[i + j + 1].col !== rowSeats[i + j].col + 1) {
            isContiguous = false;
            break;
          }
        }
        if (isContiguous) {
          const candidate = rowSeats.slice(i, i + count);
          // Check matching preference
          if (zonePref === 'vip' && candidate.some((s) => s.type === 'vip')) {
            bestSeatGroup = candidate;
            break;
          } else if (zonePref === 'standard' && candidate.every((s) => s.type === 'standard')) {
            bestSeatGroup = candidate;
            break;
          } else if (!bestSeatGroup) {
            bestSeatGroup = candidate;
          }
        }
      }
      if (bestSeatGroup && zonePref !== 'vip') break;
    }

    // Fallback: pick any available seats
    if (!bestSeatGroup) {
      bestSeatGroup = available.slice(0, count);
    }

    return HttpResponse.json({
      recommendedSeats: bestSeatGroup,
      seatCodes: bestSeatGroup.map((s) => s.seatCode),
      totalPrice: bestSeatGroup.reduce((sum, s) => sum + s.price, 0),
    });
  }),

  // ===================== FOOD ITEMS =====================
  http.get('/api/food-items', () => {
    return HttpResponse.json(foodItems.filter((f) => f.isActive));
  }),

  // ===================== ORDERS & PAYMENT =====================
  http.post('/api/orders', async ({ request }) => {
    const user = getAuthUser(request);
    if (!user) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      showtimeId: string;
      seatIds: string[];
      foodItems?: { foodId: string; quantity: number }[];
    };

    const showtime = showtimes.find((st) => st.id === body.showtimeId) || showtimes[0];
    const seats = getSeatsForShowtime(body.showtimeId);
    const chosenSeats = seats.filter((s) => body.seatIds.includes(s.id));

    const selectedFood = (body.foodItems || [])
      .map((item) => {
        const food = foodItems.find((f) => f.id === item.foodId);
        if (!food) return null;
        return {
          foodId: food.id,
          name: food.name,
          quantity: item.quantity,
          unitPrice: food.price,
        };
      })
      .filter(Boolean) as any[];

    const totalSeatPrice = chosenSeats.reduce((sum, s) => sum + s.price, 0);
    const totalFoodPrice = selectedFood.reduce((sum, f) => sum + f.quantity * f.unitPrice, 0);
    const finalTotal = totalSeatPrice + totalFoodPrice;

    const newBooking: Booking = {
      id: `ord_${Date.now()}`,
      orderCode: `CG-${Math.floor(100000 + Math.random() * 900000)}`,
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      showtimeId: showtime.id,
      movie: {
        id: showtime.movieId,
        title: showtime.movieTitle,
        posterUrl: showtime.moviePoster,
        ageRating: showtime.ageRating,
      },
      cinema: {
        id: showtime.cinemaId,
        name: showtime.cinemaName,
        roomName: showtime.roomName,
      },
      showtime: {
        startTime: showtime.startTime,
        endTime: showtime.endTime,
      },
      seats: chosenSeats.map((s) => ({
        id: s.id,
        seatCode: s.seatCode,
        type: s.type,
        price: s.price,
      })),
      foodItems: selectedFood,
      totalSeatPrice,
      totalFoodPrice,
      discountAmount: 0,
      finalTotal,
      status: 'pending',
      paymentMethod: 'credit_card',
      qrToken: `TICKET-CINEGO-${Date.now()}`,
      checkInStatus: 'valid',
      createdAt: new Date().toISOString(),
    };

    bookings.unshift(newBooking);
    return HttpResponse.json(newBooking, { status: 201 });
  }),

  // Simulated Payment
  http.post('/api/orders/:id/pay', async ({ params, request }) => {
    const body = (await request.json()) as {
      paymentMethod: 'credit_card' | 'momo' | 'vnpay' | 'bank_transfer';
      simulateOutcome?: 'success' | 'failure' | 'timeout';
    };

    const booking = bookings.find((b) => b.id === params.id);
    if (!booking) {
      return HttpResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const outcome = body.simulateOutcome || 'success';

    if (outcome === 'failure') {
      return HttpResponse.json(
        {
          success: false,
          error: 'SIMULATED_PAYMENT_DECLINED',
          message: 'Simulated payment was declined by the test bank. You can retry with another method.',
        },
        { status: 402 }
      );
    }

    if (outcome === 'timeout') {
      return HttpResponse.json(
        {
          success: false,
          error: 'SIMULATED_TIMEOUT',
          message: 'Payment gateway timed out. Please try again.',
        },
        { status: 504 }
      );
    }

    // Success: mark booking paid, mark seats sold!
    booking.status = 'paid';
    booking.paymentMethod = body.paymentMethod;

    // Permanently mark seats as SOLD
    const seats = getSeatsForShowtime(booking.showtimeId);
    booking.seats.forEach((bookedSeat) => {
      const seat = seats.find((s) => s.id === bookedSeat.id || s.seatCode === bookedSeat.seatCode);
      if (seat) {
        seat.status = 'sold';
        seat.lockedByUserId = undefined;
        seat.lockedUntil = undefined;

        socketManager.emitMockEvent('seat:update', {
          showtimeId: booking.showtimeId,
          seatId: seat.id,
          seatCode: seat.seatCode,
          status: 'sold',
        });
      }
    });

    return HttpResponse.json({
      success: true,
      booking,
      message: 'Simulated payment approved successfully! Your tickets are ready.',
    });
  }),

  // Get User's orders
  http.get('/api/orders', ({ request }) => {
    const user = getAuthUser(request);
    if (!user) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const myOrders = bookings.filter((b) => b.userId === user.id);
    return HttpResponse.json(myOrders);
  }),

  http.get('/api/orders/:id', ({ params }) => {
    const booking = bookings.find((b) => b.id === params.id);
    if (!booking) {
      return HttpResponse.json({ message: 'Order not found' }, { status: 404 });
    }
    return HttpResponse.json(booking);
  }),

  http.get('/api/tickets/:id', ({ params }) => {
    const booking = bookings.find((b) => b.id === params.id || b.qrToken === params.id);
    if (!booking) {
      return HttpResponse.json({ message: 'Ticket not found' }, { status: 404 });
    }
    return HttpResponse.json(booking);
  }),

  // ===================== STAFF CHECK-IN =====================
  http.post('/api/checkin', async ({ request }) => {
    const user = getAuthUser(request);
    const body = (await request.json()) as { token: string };
    const { token } = body;

    const cleanToken = token.trim();
    const ticket = bookings.find(
      (b) => b.qrToken === cleanToken || b.orderCode.toLowerCase() === cleanToken.toLowerCase()
    );

    if (!ticket) {
      return HttpResponse.json({
        status: 'invalid',
        message: 'Invalid ticket QR code or booking reference. No ticket found.',
      });
    }

    if (ticket.checkInStatus === 'used') {
      return HttpResponse.json({
        status: 'already_used',
        message: `This ticket has ALREADY been used for check-in on ${new Date(
          ticket.checkedInAt || Date.now()
        ).toLocaleString()}${ticket.checkedInBy ? ` by ${ticket.checkedInBy}` : ''}. Duplicate entry rejected!`,
        ticket,
        checkedInAt: ticket.checkedInAt,
      });
    }

    if (ticket.status !== 'paid') {
      return HttpResponse.json({
        status: 'invalid',
        message: 'Order status is pending or unpaid. Entry not allowed.',
        ticket,
      });
    }

    // Check if showtime has expired (> 3 hours past start)
    const startTime = new Date(ticket.showtime.startTime).getTime();
    if (Date.now() - startTime > 3 * 3600 * 1000) {
      return HttpResponse.json({
        status: 'wrong_showtime',
        message: 'This showtime has ended. Ticket is expired.',
        ticket,
      });
    }

    // Success check-in!
    ticket.checkInStatus = 'used';
    ticket.checkedInAt = new Date().toISOString();
    ticket.checkedInBy = `${user?.fullName || 'Sarah Jenkins'} (Staff)`;

    return HttpResponse.json({
      status: 'valid',
      message: 'Ticket verified successfully! Customer admitted.',
      ticket,
      checkedInAt: ticket.checkedInAt,
    });
  }),

  // ===================== ADMIN APIS =====================
  // Admin Stats
  http.get('/api/admin/stats', () => {
    const paidOrders = bookings.filter((b) => b.status === 'paid');
    const totalRevenue = paidOrders.reduce((sum, b) => sum + b.finalTotal, 0);
    const totalTicketsSold = paidOrders.reduce((sum, b) => sum + b.seats.length, 0);
    const totalOrders = paidOrders.length;
    const averageOccupancyRate = 72.4; // %

    // Chart data: revenue over last 7 days
    const revenueByDate = [
      { date: 'Mon', revenue: 320, tickets: 24 },
      { date: 'Tue', revenue: 450, tickets: 32 },
      { date: 'Wed', revenue: 610, tickets: 45 },
      { date: 'Thu', revenue: 580, tickets: 40 },
      { date: 'Fri', revenue: 1120, tickets: 82 },
      { date: 'Sat', revenue: 1840, tickets: 130 },
      { date: 'Sun', revenue: 1450, tickets: 104 },
    ];

    const topMovies = [
      { movieId: 'mov_1', title: 'Dune: Part Two', revenue: 2340, ticketsSold: 162 },
      { movieId: 'mov_2', title: 'Oppenheimer', revenue: 1980, ticketsSold: 146 },
      { movieId: 'mov_4', title: 'Deadpool & Wolverine', revenue: 1650, ticketsSold: 114 },
      { movieId: 'mov_5', title: 'Interstellar: 10th Anniv', revenue: 1210, ticketsSold: 76 },
    ];

    const occupancyByShowtime = [
      { showtimeId: 'st_1', movieTitle: 'Dune: Part Two', occupancyRate: 78, cinemaRoom: 'Grand Central / Aud 1' },
      { showtimeId: 'st_4', movieTitle: 'Oppenheimer', occupancyRate: 67, cinemaRoom: 'Grand Central / Aud 2' },
      { showtimeId: 'st_3', movieTitle: 'Dune: Part Two', occupancyRate: 75, cinemaRoom: 'Downtown / Hall A' },
      { showtimeId: 'st_7', movieTitle: 'Deadpool & Wolverine', occupancyRate: 88, cinemaRoom: 'Grand Central / Aud 1' },
    ];

    return HttpResponse.json({
      totalRevenue,
      totalTicketsSold,
      totalOrders,
      averageOccupancyRate,
      revenueByDate,
      topMovies,
      occupancyByShowtime,
    });
  }),

  // Admin Movies CRUD
  http.get('/api/admin/movies', () => {
    return HttpResponse.json(movies);
  }),

  http.post('/api/admin/movies', async ({ request }) => {
    const body = (await request.json()) as Omit<Movie, 'id'>;
    const newMovie: Movie = {
      ...body,
      id: `mov_${Date.now()}`,
      isActive: true,
      rating: 8.5,
      reviewCount: 0,
    };
    movies.unshift(newMovie);
    return HttpResponse.json(newMovie, { status: 201 });
  }),

  http.put('/api/admin/movies/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Movie>;
    const idx = movies.findIndex((m) => m.id === params.id);
    if (idx !== -1) {
      movies[idx] = { ...movies[idx], ...body };
      return HttpResponse.json(movies[idx]);
    }
    return HttpResponse.json({ message: 'Movie not found' }, { status: 404 });
  }),

  http.delete('/api/admin/movies/:id', ({ params }) => {
    // Soft-deactivate if referenced
    const hasShowtimes = showtimes.some((st) => st.movieId === params.id);
    const idx = movies.findIndex((m) => m.id === params.id);
    if (idx !== -1) {
      if (hasShowtimes) {
        movies[idx].isActive = false;
        return HttpResponse.json({
          message: 'Movie is referenced by active showtimes. Soft-deactivated instead of deleted.',
          movie: movies[idx],
        });
      }
      movies.splice(idx, 1);
      return HttpResponse.json({ success: true, message: 'Movie permanently deleted.' });
    }
    return HttpResponse.json({ message: 'Movie not found' }, { status: 404 });
  }),

  // Admin Rooms CRUD
  http.get('/api/admin/rooms', () => {
    return HttpResponse.json(rooms);
  }),

  http.post('/api/admin/rooms', async ({ request }) => {
    const body = (await request.json()) as Omit<Room, 'id'>;
    const newRoom: Room = {
      ...body,
      id: `room_${Date.now()}`,
      isActive: true,
    };
    rooms.push(newRoom);
    return HttpResponse.json(newRoom, { status: 201 });
  }),

  http.put('/api/admin/rooms/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Room>;
    const idx = rooms.findIndex((r) => r.id === params.id);
    if (idx !== -1) {
      rooms[idx] = { ...rooms[idx], ...body };
      return HttpResponse.json(rooms[idx]);
    }
    return HttpResponse.json({ message: 'Room not found' }, { status: 404 });
  }),

  http.delete('/api/admin/rooms/:id', ({ params }) => {
    const hasShowtimes = showtimes.some((st) => st.roomId === params.id);
    const idx = rooms.findIndex((r) => r.id === params.id);
    if (idx !== -1) {
      if (hasShowtimes) {
        rooms[idx].isActive = false;
        return HttpResponse.json({
          message: 'Room has scheduled showtimes. Soft-deactivated instead of deleted.',
          room: rooms[idx],
        });
      }
      rooms.splice(idx, 1);
      return HttpResponse.json({ success: true });
    }
    return HttpResponse.json({ message: 'Room not found' }, { status: 404 });
  }),

  // Admin Showtimes CRUD (Rejects overlapping showtimes in same room!)
  http.get('/api/admin/showtimes', () => {
    return HttpResponse.json(showtimes);
  }),

  http.post('/api/admin/showtimes', async ({ request }) => {
    const body = (await request.json()) as Omit<Showtime, 'id'>;
    const newStart = new Date(body.startTime).getTime();
    const newEnd = new Date(body.endTime).getTime();

    // Check overlap in the same room
    const hasOverlap = showtimes.some((st) => {
      if (st.roomId !== body.roomId || st.status === 'cancelled') return false;
      const existingStart = new Date(st.startTime).getTime();
      const existingEnd = new Date(st.endTime).getTime();
      return (newStart < existingEnd && newEnd > existingStart);
    });

    if (hasOverlap) {
      return HttpResponse.json(
        {
          error: 'ROOM_SCHEDULE_CONFLICT',
          message: 'Schedule conflict detected! This room already has a scheduled showtime during this time window.',
        },
        { status: 409 }
      );
    }

    const movie = movies.find((m) => m.id === body.movieId);
    const room = rooms.find((r) => r.id === body.roomId);

    const newShowtime: Showtime = {
      ...body,
      id: `st_${Date.now()}`,
      movieTitle: movie?.title || body.movieTitle,
      moviePoster: movie?.posterUrl || '',
      ageRating: movie?.ageRating || 'T13',
      durationMinutes: movie?.durationMinutes || 120,
      roomName: room?.name || body.roomName,
      availableSeats: room?.totalSeats || 80,
      totalSeats: room?.totalSeats || 80,
      status: 'scheduled',
    };

    showtimes.push(newShowtime);
    return HttpResponse.json(newShowtime, { status: 201 });
  }),

  http.put('/api/admin/showtimes/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Showtime>;
    const idx = showtimes.findIndex((st) => st.id === params.id);
    if (idx !== -1) {
      showtimes[idx] = { ...showtimes[idx], ...body };
      return HttpResponse.json(showtimes[idx]);
    }
    return HttpResponse.json({ message: 'Showtime not found' }, { status: 404 });
  }),

  http.delete('/api/admin/showtimes/:id', ({ params }) => {
    const hasBookings = bookings.some((b) => b.showtimeId === params.id);
    const idx = showtimes.findIndex((st) => st.id === params.id);
    if (idx !== -1) {
      if (hasBookings) {
        showtimes[idx].status = 'cancelled';
        return HttpResponse.json({
          message: 'Showtime has active bookings. Status set to cancelled instead of hard delete.',
          showtime: showtimes[idx],
        });
      }
      showtimes.splice(idx, 1);
      return HttpResponse.json({ success: true });
    }
    return HttpResponse.json({ message: 'Showtime not found' }, { status: 404 });
  }),

  // Admin Food CRUD
  http.get('/api/admin/food', () => {
    return HttpResponse.json(foodItems);
  }),

  http.post('/api/admin/food', async ({ request }) => {
    const body = (await request.json()) as Omit<FoodItem, 'id'>;
    const newItem: FoodItem = {
      ...body,
      id: `food_${Date.now()}`,
      isActive: true,
    };
    foodItems.push(newItem);
    return HttpResponse.json(newItem, { status: 201 });
  }),

  http.put('/api/admin/food/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<FoodItem>;
    const idx = foodItems.findIndex((f) => f.id === params.id);
    if (idx !== -1) {
      foodItems[idx] = { ...foodItems[idx], ...body };
      return HttpResponse.json(foodItems[idx]);
    }
    return HttpResponse.json({ message: 'Food item not found' }, { status: 404 });
  }),

  http.delete('/api/admin/food/:id', ({ params }) => {
    const idx = foodItems.findIndex((f) => f.id === params.id);
    if (idx !== -1) {
      foodItems[idx].isActive = false;
      return HttpResponse.json({ message: 'Food item deactivated.', item: foodItems[idx] });
    }
    return HttpResponse.json({ message: 'Food item not found' }, { status: 404 });
  }),

  // Admin Bookings
  http.get('/api/admin/bookings', () => {
    return HttpResponse.json(bookings);
  }),

  http.put('/api/admin/bookings/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<Booking>;
    const idx = bookings.findIndex((b) => b.id === params.id);
    if (idx !== -1) {
      bookings[idx] = { ...bookings[idx], ...body };
      return HttpResponse.json(bookings[idx]);
    }
    return HttpResponse.json({ message: 'Booking not found' }, { status: 404 });
  }),

  // Admin Users
  http.get('/api/admin/users', () => {
    return HttpResponse.json(users);
  }),

  http.post('/api/admin/users', async ({ request }) => {
    const body = (await request.json()) as Omit<User, 'id'>;
    const newUser: User = {
      ...body,
      id: `usr_${Date.now()}`,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    return HttpResponse.json(newUser, { status: 201 });
  }),

  http.put('/api/admin/users/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<User>;
    const idx = users.findIndex((u) => u.id === params.id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...body };
      return HttpResponse.json(users[idx]);
    }
    return HttpResponse.json({ message: 'User not found' }, { status: 404 });
  }),

  http.delete('/api/admin/users/:id', ({ params }) => {
    const idx = users.findIndex((u) => u.id === params.id);
    if (idx !== -1) {
      users[idx].isActive = false;
      return HttpResponse.json({ message: 'User deactivated.', user: users[idx] });
    }
    return HttpResponse.json({ message: 'User not found' }, { status: 404 });
  }),
];
