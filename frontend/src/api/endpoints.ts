export const ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    ME: '/me',
  },
  MOVIES: {
    LIST: '/movies',
    DETAIL: (id: string) => `/movies/${id}`,
    SHOWTIMES: (id: string) => `/movies/${id}/showtimes`,
  },
  SHOWTIMES: {
    SEATS: (id: string) => `/showtimes/${id}/seats`,
    LOCK_SEATS: (id: string) => `/showtimes/${id}/seats/lock`,
    UNLOCK_SEATS: (id: string) => `/showtimes/${id}/seats/unlock`,
    SMART_SEAT: (id: string) => `/showtimes/${id}/smart-seat`,
  },
  FOOD: {
    LIST: '/food-items',
  },
  ORDERS: {
    CREATE: '/orders',
    PAY: (id: string) => `/orders/${id}/pay`,
    MY_ORDERS: '/orders',
    DETAIL: (id: string) => `/orders/${id}`,
  },
  TICKETS: {
    DETAIL: (id: string) => `/tickets/${id}`,
  },
  CHECKIN: {
    VERIFY: '/checkin',
  },
  ADMIN: {
    MOVIES: '/admin/movies',
    MOVIE_DETAIL: (id: string) => `/admin/movies/${id}`,
    ROOMS: '/admin/rooms',
    ROOM_DETAIL: (id: string) => `/admin/rooms/${id}`,
    SHOWTIMES: '/admin/showtimes',
    SHOWTIME_DETAIL: (id: string) => `/admin/showtimes/${id}`,
    FOOD: '/admin/food',
    FOOD_DETAIL: (id: string) => `/admin/food/${id}`,
    BOOKINGS: '/admin/bookings',
    BOOKING_DETAIL: (id: string) => `/admin/bookings/${id}`,
    USERS: '/admin/users',
    USER_DETAIL: (id: string) => `/admin/users/${id}`,
    STATS: '/admin/stats',
  },
} as const;

export const SOCKET_EVENTS = {
  JOIN_SHOWTIME: (showtimeId: string) => `showtime:${showtimeId}`,
  SEAT_UPDATE: 'seat:update',
  LOCK_EXPIRED: 'lock:expired',
} as const;
