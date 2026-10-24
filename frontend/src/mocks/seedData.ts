import { User, Movie, Cinema, Room, Showtime, FoodItem, Booking, ShowtimeSeat, SeatType, SeatStatus } from '@/types';

export const SEED_USERS: User[] = [
  {
    id: 'usr_customer_1',
    email: 'customer@cinego.com',
    fullName: 'Alex Rivera',
    phone: '+1 (555) 234-5678',
    role: 'customer',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    isActive: true,
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'usr_staff_1',
    email: 'staff@cinego.com',
    fullName: 'Sarah Jenkins',
    phone: '+1 (555) 876-5432',
    role: 'staff',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    isActive: true,
    createdAt: '2026-01-05T09:00:00Z',
  },
  {
    id: 'usr_admin_1',
    email: 'admin@cinego.com',
    fullName: 'Marcus Vance',
    phone: '+1 (555) 999-1234',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

export const SEED_CINEMAS: Cinema[] = [
  {
    id: 'cin_1',
    name: 'CineGo Grand Central IMAX',
    address: '42nd St & Park Ave, New York, NY',
    city: 'New York',
    phone: '(212) 555-0101',
    totalRooms: 4,
    isActive: true,
  },
  {
    id: 'cin_2',
    name: 'CineGo Downtown Megamall',
    address: '100 Broadway, New York, NY',
    city: 'New York',
    phone: '(212) 555-0102',
    totalRooms: 3,
    isActive: true,
  },
  {
    id: 'cin_3',
    name: 'CineGo Waterfront Plaza',
    address: '88 River Street, Brooklyn, NY',
    city: 'Brooklyn',
    phone: '(718) 555-0103',
    totalRooms: 2,
    isActive: true,
  },
];

export const SEED_ROOMS: Room[] = [
  {
    id: 'room_1',
    cinemaId: 'cin_1',
    cinemaName: 'CineGo Grand Central IMAX',
    name: 'Auditorium 1 (IMAX Laser)',
    totalRows: 8,
    totalCols: 10,
    totalSeats: 80,
    isActive: true,
    seatLayout: generateRoomLayout(8, 10),
  },
  {
    id: 'room_2',
    cinemaId: 'cin_1',
    cinemaName: 'CineGo Grand Central IMAX',
    name: 'Auditorium 2 (Dolby Atmos)',
    totalRows: 6,
    totalCols: 8,
    totalSeats: 48,
    isActive: true,
    seatLayout: generateRoomLayout(6, 8),
  },
  {
    id: 'room_3',
    cinemaId: 'cin_2',
    cinemaName: 'CineGo Downtown Megamall',
    name: 'Hall A (Cinema 4DX)',
    totalRows: 6,
    totalCols: 10,
    totalSeats: 60,
    isActive: true,
    seatLayout: generateRoomLayout(6, 10),
  },
];

function generateRoomLayout(rows: number, cols: number) {
  const layout = [];
  const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'];
  for (let r = 0; r < rows; r++) {
    const rowChar = rowLetters[r];
    for (let c = 1; c <= cols; c++) {
      let type: SeatType = 'standard';
      if (r >= rows - 1) {
        type = 'couple';
      } else if (r >= Math.floor(rows / 2)) {
        type = 'vip';
      }
      layout.push({
        id: `seat_${rowChar}${c}`,
        row: rowChar,
        col: c,
        seatCode: `${rowChar}${c}`,
        type,
      });
    }
  }
  return layout;
}

export const SEED_MOVIES: Movie[] = [
  {
    id: 'mov_1',
    title: 'Dune: Part Two',
    originalTitle: 'Dune: Part Two',
    synopsis: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he endeavors to prevent a terrible future only he can foresee.',
    director: 'Denis Villeneuve',
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Javier Bardem', 'Austin Butler'],
    durationMinutes: 166,
    genres: ['Sci-Fi', 'Adventure', 'Action'],
    ageRating: 'T16',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=Way9Dexny3w',
    releaseDate: '2026-03-01',
    status: 'now_showing',
    rating: 8.8,
    reviewCount: 4210,
    isActive: true,
  },
  {
    id: 'mov_2',
    title: 'Oppenheimer',
    originalTitle: 'Oppenheimer',
    synopsis: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II, exploring the moral and political consequences of his scientific creation.',
    director: 'Christopher Nolan',
    cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon', 'Robert Downey Jr.', 'Florence Pugh'],
    durationMinutes: 180,
    genres: ['Biography', 'Drama', 'History'],
    ageRating: 'T18',
    posterUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
    releaseDate: '2026-02-15',
    status: 'now_showing',
    rating: 8.9,
    reviewCount: 5320,
    isActive: true,
  },
  {
    id: 'mov_3',
    title: 'Inside Out 2',
    originalTitle: 'Inside Out 2',
    synopsis: "Joy, Sadness, Anger, Fear and Disgust have been running a successful operation by all accounts. However, when Anxiety, Envy, Ennui and Embarrassment show up, headquarters undergoes a sudden demolition to make room for unexpected new emotions.",
    director: 'Kelsey Mann',
    cast: ['Amy Poehler', 'Maya Hawke', 'Kensington Tallman', 'Liza Lapira', 'Tony Hale'],
    durationMinutes: 96,
    genres: ['Animation', 'Adventure', 'Comedy', 'Family'],
    ageRating: 'P',
    posterUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=LEjhY15eCx0',
    releaseDate: '2026-06-14',
    status: 'now_showing',
    rating: 7.9,
    reviewCount: 2890,
    isActive: true,
  },
  {
    id: 'mov_4',
    title: 'Deadpool & Wolverine',
    originalTitle: 'Deadpool & Wolverine',
    synopsis: 'A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary Deadpool behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit up again alongside a battle-scarred Wolverine.',
    director: 'Shawn Levy',
    cast: ['Ryan Reynolds', 'Hugh Jackman', 'Emma Corrin', 'Matthew Macfadyen'],
    durationMinutes: 128,
    genres: ['Action', 'Comedy', 'Sci-Fi'],
    ageRating: 'T18',
    posterUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=73_1biulkYk',
    releaseDate: '2026-07-26',
    status: 'now_showing',
    rating: 8.1,
    reviewCount: 3840,
    isActive: true,
  },
  {
    id: 'mov_5',
    title: 'Interstellar: 10th Anniversary IMAX',
    originalTitle: 'Interstellar',
    synopsis: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans through a mysterious wormhole near Saturn.',
    director: 'Christopher Nolan',
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'],
    durationMinutes: 169,
    genres: ['Sci-Fi', 'Adventure', 'Drama'],
    ageRating: 'T13',
    posterUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
    releaseDate: '2026-09-20',
    status: 'now_showing',
    rating: 8.7,
    reviewCount: 6710,
    isActive: true,
  },
  {
    id: 'mov_6',
    title: 'Gladiator II',
    originalTitle: 'Gladiator II',
    synopsis: 'Years after witnessing the death of the revered hero Maximus at the hands of his uncle, Lucius must enter the Colosseum after his home is conquered by the tyrannical Emperors who now lead Rome with an iron fist.',
    director: 'Ridley Scott',
    cast: ['Paul Mescal', 'Pedro Pascal', 'Denzel Washington', 'Connie Nielsen'],
    durationMinutes: 148,
    genres: ['Action', 'Drama', 'Adventure'],
    ageRating: 'T16',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1200&auto=format&fit=crop&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=4rgYUipGJNo',
    releaseDate: '2026-11-22',
    status: 'coming_soon',
    rating: 8.4,
    reviewCount: 1420,
    isActive: true,
  },
  {
    id: 'mov_7',
    title: 'Avatar: Fire and Ash',
    originalTitle: 'Avatar: Fire and Ash',
    synopsis: 'Jake Sully and Neytiri encounter a new, aggressive tribe of Na\'vi known as the Ash People who inhabit volcanic regions of Pandora, testing the fragile peace and unity of the planet.',
    director: 'James Cameron',
    cast: ['Sam Worthington', 'Zoe Saldaña', 'Sigourney Weaver', 'Stephen Lang'],
    durationMinutes: 195,
    genres: ['Action', 'Adventure', 'Fantasy', 'Sci-Fi'],
    ageRating: 'T13',
    posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=d9MyW72ELq0',
    releaseDate: '2026-12-19',
    status: 'coming_soon',
    rating: 8.9,
    reviewCount: 950,
    isActive: true,
  },
];

// Helper to generate ISO time relative to today
const getShowtimeDates = () => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const dayAfterStr = dayAfter.toISOString().split('T')[0];

  return { todayStr, tomorrowStr, dayAfterStr };
};

const dates = getShowtimeDates();

export const SEED_SHOWTIMES: Showtime[] = [
  {
    id: 'st_1',
    movieId: 'mov_1',
    movieTitle: 'Dune: Part Two',
    moviePoster: SEED_MOVIES[0].posterUrl,
    ageRating: 'T16',
    durationMinutes: 166,
    cinemaId: 'cin_1',
    cinemaName: 'CineGo Grand Central IMAX',
    roomId: 'room_1',
    roomName: 'Auditorium 1 (IMAX Laser)',
    startTime: `${dates.todayStr}T18:30:00`,
    endTime: `${dates.todayStr}T21:16:00`,
    priceBase: 14.50,
    availableSeats: 62,
    totalSeats: 80,
    status: 'scheduled',
  },
  {
    id: 'st_2',
    movieId: 'mov_1',
    movieTitle: 'Dune: Part Two',
    moviePoster: SEED_MOVIES[0].posterUrl,
    ageRating: 'T16',
    durationMinutes: 166,
    cinemaId: 'cin_1',
    cinemaName: 'CineGo Grand Central IMAX',
    roomId: 'room_1',
    roomName: 'Auditorium 1 (IMAX Laser)',
    startTime: `${dates.todayStr}T21:45:00`,
    endTime: `${dates.tomorrowStr}T00:31:00`,
    priceBase: 14.50,
    availableSeats: 74,
    totalSeats: 80,
    status: 'scheduled',
  },
  {
    id: 'st_3',
    movieId: 'mov_1',
    movieTitle: 'Dune: Part Two',
    moviePoster: SEED_MOVIES[0].posterUrl,
    ageRating: 'T16',
    durationMinutes: 166,
    cinemaId: 'cin_2',
    cinemaName: 'CineGo Downtown Megamall',
    roomId: 'room_3',
    roomName: 'Hall A (Cinema 4DX)',
    startTime: `${dates.todayStr}T19:00:00`,
    endTime: `${dates.todayStr}T21:46:00`,
    priceBase: 13.00,
    availableSeats: 45,
    totalSeats: 60,
    status: 'scheduled',
  },
  {
    id: 'st_4',
    movieId: 'mov_2',
    movieTitle: 'Oppenheimer',
    moviePoster: SEED_MOVIES[1].posterUrl,
    ageRating: 'T18',
    durationMinutes: 180,
    cinemaId: 'cin_1',
    cinemaName: 'CineGo Grand Central IMAX',
    roomId: 'room_2',
    roomName: 'Auditorium 2 (Dolby Atmos)',
    startTime: `${dates.todayStr}T17:00:00`,
    endTime: `${dates.todayStr}T20:00:00`,
    priceBase: 13.50,
    availableSeats: 32,
    totalSeats: 48,
    status: 'scheduled',
  },
  {
    id: 'st_5',
    movieId: 'mov_2',
    movieTitle: 'Oppenheimer',
    moviePoster: SEED_MOVIES[1].posterUrl,
    ageRating: 'T18',
    durationMinutes: 180,
    cinemaId: 'cin_1',
    cinemaName: 'CineGo Grand Central IMAX',
    roomId: 'room_2',
    roomName: 'Auditorium 2 (Dolby Atmos)',
    startTime: `${dates.todayStr}T20:30:00`,
    endTime: `${dates.todayStr}T23:30:00`,
    priceBase: 13.50,
    availableSeats: 18,
    totalSeats: 48,
    status: 'scheduled',
  },
  {
    id: 'st_6',
    movieId: 'mov_3',
    movieTitle: 'Inside Out 2',
    moviePoster: SEED_MOVIES[2].posterUrl,
    ageRating: 'P',
    durationMinutes: 96,
    cinemaId: 'cin_1',
    cinemaName: 'CineGo Grand Central IMAX',
    roomId: 'room_2',
    roomName: 'Auditorium 2 (Dolby Atmos)',
    startTime: `${dates.todayStr}T14:30:00`,
    endTime: `${dates.todayStr}T16:06:00`,
    priceBase: 11.00,
    availableSeats: 0,
    totalSeats: 48,
    status: 'completed', // Sold out / passed
  },
  {
    id: 'st_7',
    movieId: 'mov_4',
    movieTitle: 'Deadpool & Wolverine',
    moviePoster: SEED_MOVIES[3].posterUrl,
    ageRating: 'T18',
    durationMinutes: 128,
    cinemaId: 'cin_1',
    cinemaName: 'CineGo Grand Central IMAX',
    roomId: 'room_1',
    roomName: 'Auditorium 1 (IMAX Laser)',
    startTime: `${dates.tomorrowStr}T18:00:00`,
    endTime: `${dates.tomorrowStr}T20:08:00`,
    priceBase: 14.50,
    availableSeats: 70,
    totalSeats: 80,
    status: 'scheduled',
  },
  {
    id: 'st_8',
    movieId: 'mov_5',
    movieTitle: 'Interstellar: 10th Anniversary IMAX',
    moviePoster: SEED_MOVIES[4].posterUrl,
    ageRating: 'T13',
    durationMinutes: 169,
    cinemaId: 'cin_1',
    cinemaName: 'CineGo Grand Central IMAX',
    roomId: 'room_1',
    roomName: 'Auditorium 1 (IMAX Laser)',
    startTime: `${dates.tomorrowStr}T20:45:00`,
    endTime: `${dates.tomorrowStr}T23:34:00`,
    priceBase: 16.00,
    availableSeats: 58,
    totalSeats: 80,
    status: 'scheduled',
  },
];

export const SEED_FOOD_ITEMS: FoodItem[] = [
  {
    id: 'food_1',
    name: 'CineGo Solo Combo',
    description: '1 Large Warm Caramel Popcorn + 1 Medium Coca-Cola (22oz)',
    category: 'combo',
    price: 8.50,
    imageUrl: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=300&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    id: 'food_2',
    name: 'Couple Romance Combo',
    description: '1 Super Large Sweet/Salt Popcorn + 2 Large Drinks + 1 Crispy M&Ms pack',
    category: 'combo',
    price: 14.00,
    imageUrl: 'https://images.unsplash.com/photo-1572177812156-58036aae439c?w=300&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    id: 'food_3',
    name: 'Family Blockbuster Feast',
    description: '2 Jumbo Popcorns (Caramel & Cheese) + 4 Large Drinks + 1 Deluxe Nachos',
    category: 'combo',
    price: 24.50,
    imageUrl: 'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=300&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    id: 'food_4',
    name: 'Hot Cheese Nachos Supreme',
    description: 'Crispy corn tortilla chips topped with rich warm cheddar cheese and jalapeños',
    category: 'snack',
    price: 6.50,
    imageUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=300&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    id: 'food_5',
    name: 'Caramel Butter Popcorn (L)',
    description: 'Crispy popped corn glazed with rich golden caramel butter',
    category: 'popcorn',
    price: 5.50,
    imageUrl: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=300&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    id: 'food_6',
    name: 'Coca-Cola Zero Sugar (32oz)',
    description: 'Ice-cold refreshing zero-calorie fountain beverage',
    category: 'drink',
    price: 3.50,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    id: 'food_7',
    name: 'Pure Spring Water (500ml)',
    description: 'Chilled natural mineral spring water bottle',
    category: 'drink',
    price: 2.50,
    imageUrl: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=300&auto=format&fit=crop&q=80',
    isActive: true,
  },
];

export const SEED_BOOKINGS: Booking[] = [
  {
    id: 'ord_1001',
    orderCode: 'CG-984210',
    userId: 'usr_customer_1',
    userName: 'Alex Rivera',
    userEmail: 'customer@cinego.com',
    showtimeId: 'st_1',
    movie: {
      id: 'mov_1',
      title: 'Dune: Part Two',
      posterUrl: SEED_MOVIES[0].posterUrl,
      ageRating: 'T16',
    },
    cinema: {
      id: 'cin_1',
      name: 'CineGo Grand Central IMAX',
      roomName: 'Auditorium 1 (IMAX Laser)',
    },
    showtime: {
      startTime: `${dates.todayStr}T18:30:00`,
      endTime: `${dates.todayStr}T21:16:00`,
    },
    seats: [
      { id: 'st_1_E5', seatCode: 'E5', type: 'vip', price: 18.50 },
      { id: 'st_1_E6', seatCode: 'E6', type: 'vip', price: 18.50 },
    ],
    foodItems: [
      { foodId: 'food_1', name: 'CineGo Solo Combo', quantity: 1, unitPrice: 8.50 },
    ],
    totalSeatPrice: 37.00,
    totalFoodPrice: 8.50,
    discountAmount: 0,
    finalTotal: 45.50,
    status: 'paid',
    paymentMethod: 'credit_card',
    qrToken: 'TICKET-CINEGO-VALID-001',
    checkInStatus: 'valid',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'ord_1002',
    orderCode: 'CG-452189',
    userId: 'usr_customer_1',
    userName: 'Alex Rivera',
    userEmail: 'customer@cinego.com',
    showtimeId: 'st_4',
    movie: {
      id: 'mov_2',
      title: 'Oppenheimer',
      posterUrl: SEED_MOVIES[1].posterUrl,
      ageRating: 'T18',
    },
    cinema: {
      id: 'cin_1',
      name: 'CineGo Grand Central IMAX',
      roomName: 'Auditorium 2 (Dolby Atmos)',
    },
    showtime: {
      startTime: `${dates.todayStr}T17:00:00`,
      endTime: `${dates.todayStr}T20:00:00`,
    },
    seats: [
      { id: 'st_4_D4', seatCode: 'D4', type: 'standard', price: 13.50 },
    ],
    foodItems: [],
    totalSeatPrice: 13.50,
    totalFoodPrice: 0,
    discountAmount: 0,
    finalTotal: 13.50,
    status: 'paid',
    paymentMethod: 'momo',
    qrToken: 'TICKET-CINEGO-USED-002',
    checkInStatus: 'used',
    checkedInAt: `${dates.todayStr}T16:45:00Z`,
    checkedInBy: 'Sarah Jenkins (Staff)',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

// Helper to generate dynamic seats state for a showtime
export function generateShowtimeSeats(showtime: Showtime): ShowtimeSeat[] {
  const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'];
  const totalRows = showtime.roomId === 'room_1' ? 8 : 6;
  const totalCols = showtime.roomId === 'room_1' ? 10 : 8;
  const seats: ShowtimeSeat[] = [];

  // Seeded occupied seats for realism
  const preSold = new Set(['C4', 'C5', 'D6', 'D7', 'E3', 'E4', 'F5', 'F6', 'H1', 'H2']);

  for (let r = 0; r < totalRows; r++) {
    const rowChar = rowLetters[r];
    for (let c = 1; c <= totalCols; c++) {
      const seatCode = `${rowChar}${c}`;
      let type: SeatType = 'standard';
      let price = showtime.priceBase;

      if (r >= totalRows - 1) {
        type = 'couple';
        price = showtime.priceBase * 1.8;
      } else if (r >= Math.floor(totalRows / 2)) {
        type = 'vip';
        price = showtime.priceBase + 4.0;
      }

      let status: SeatStatus = 'available';
      if (preSold.has(seatCode)) {
        status = 'sold';
      }

      seats.push({
        id: `${showtime.id}_${seatCode}`,
        showtimeId: showtime.id,
        row: rowChar,
        col: c,
        seatCode,
        type,
        status,
        price,
      });
    }
  }

  return seats;
}
