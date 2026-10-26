CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name varchar(120) NOT NULL,
    email varchar(320) NOT NULL UNIQUE,
    phone varchar(32),
    password_hash varchar(255) NOT NULL,
    role varchar(16) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin')),
    status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'locked')),
    failed_login_count integer NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
    locked_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_users_email ON users (email);

CREATE TABLE auth_sessions (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_auth_sessions_user_id ON auth_sessions (user_id);
CREATE INDEX ix_auth_sessions_expires_at ON auth_sessions (expires_at);

CREATE TABLE websocket_tickets (
    token_hash char(64) PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz
);
CREATE INDEX ix_websocket_tickets_user_id ON websocket_tickets (user_id);
CREATE INDEX ix_websocket_tickets_expires_at ON websocket_tickets (expires_at);

CREATE TABLE movies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title varchar(240) NOT NULL,
    description text,
    director varchar(160),
    cast text,
    genre varchar(120),
    duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
    language varchar(80),
    age_rating varchar(20),
    trailer_url varchar(2048),
    poster_url varchar(2048),
    status varchar(20) NOT NULL DEFAULT 'coming_soon' CHECK (status IN ('now_showing', 'coming_soon', 'inactive')),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_movies_title ON movies (title);
CREATE INDEX ix_movies_genre ON movies (genre);
CREATE INDEX ix_movies_status ON movies (status);

CREATE TABLE cinemas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(160) NOT NULL,
    address varchar(500) NOT NULL,
    status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE halls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cinema_id uuid NOT NULL REFERENCES cinemas(id) ON DELETE RESTRICT,
    name varchar(100) NOT NULL,
    hall_type varchar(60) NOT NULL,
    rows_count integer NOT NULL CHECK (rows_count > 0),
    columns_count integer NOT NULL CHECK (columns_count > 0),
    status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    UNIQUE (cinema_id, name)
);
CREATE INDEX ix_halls_cinema_id ON halls (cinema_id);

CREATE TABLE seats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hall_id uuid NOT NULL REFERENCES halls(id) ON DELETE RESTRICT,
    row_label varchar(8) NOT NULL,
    seat_number integer NOT NULL CHECK (seat_number > 0),
    seat_type varchar(20) NOT NULL DEFAULT 'standard' CHECK (seat_type IN ('standard', 'vip', 'couple', 'accessible')),
    price_modifier numeric(10,2) NOT NULL DEFAULT 0 CHECK (price_modifier >= 0),
    status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    UNIQUE (hall_id, row_label, seat_number)
);
CREATE INDEX ix_seats_hall_id ON seats (hall_id);

CREATE TABLE showtimes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id uuid NOT NULL REFERENCES movies(id) ON DELETE RESTRICT,
    hall_id uuid NOT NULL REFERENCES halls(id) ON DELETE RESTRICT,
    start_at timestamptz NOT NULL,
    end_at timestamptz NOT NULL CHECK (end_at > start_at),
    base_price numeric(10,2) NOT NULL CHECK (base_price >= 0),
    language varchar(80),
    status varchar(16) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed'))
);
CREATE INDEX ix_showtimes_movie_id ON showtimes (movie_id);
CREATE INDEX ix_showtimes_hall_id ON showtimes (hall_id);
CREATE INDEX ix_showtimes_start_at ON showtimes (start_at);
CREATE INDEX ix_showtimes_hall_start_end ON showtimes (hall_id, start_at, end_at);
ALTER TABLE showtimes ADD CONSTRAINT ex_showtimes_hall_no_overlap
    EXCLUDE USING gist (
        hall_id WITH =,
        tstzrange(start_at, end_at, '[)') WITH &&
    ) WHERE (status = 'scheduled');

CREATE TABLE food_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(160) NOT NULL,
    category varchar(80) NOT NULL,
    price numeric(10,2) NOT NULL CHECK (price >= 0),
    stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url varchar(2048),
    status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE vouchers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(40) NOT NULL UNIQUE,
    voucher_type varchar(16) NOT NULL CHECK (voucher_type IN ('fixed', 'percent')),
    value numeric(10,2) NOT NULL CHECK (value > 0),
    min_order numeric(10,2) NOT NULL DEFAULT 0 CHECK (min_order >= 0),
    max_discount numeric(10,2) NOT NULL DEFAULT 0 CHECK (max_discount >= 0),
    starts_at timestamptz,
    ends_at timestamptz,
    usage_limit integer CHECK (usage_limit IS NULL OR usage_limit >= 0),
    usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
    status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    CHECK (voucher_type != 'percent' OR value <= 100)
);

CREATE TABLE orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code varchar(24) NOT NULL UNIQUE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    showtime_id uuid NOT NULL REFERENCES showtimes(id) ON DELETE RESTRICT,
    voucher_id uuid REFERENCES vouchers(id) ON DELETE RESTRICT,
    subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
    discount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total numeric(12,2) NOT NULL CHECK (total >= 0),
    payment_status varchar(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    order_status varchar(24) NOT NULL DEFAULT 'pending_payment' CHECK (order_status IN ('pending_payment', 'confirmed', 'cancelled', 'expired')),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_orders_user_id ON orders (user_id);
CREATE INDEX ix_orders_showtime_id ON orders (showtime_id);
CREATE INDEX ix_orders_created_at ON orders (created_at);

CREATE TABLE seat_holds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    showtime_id uuid NOT NULL REFERENCES showtimes(id) ON DELETE RESTRICT,
    seat_id uuid NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
    expires_at timestamptz NOT NULL,
    released_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_active_seat_hold ON seat_holds (showtime_id, seat_id) WHERE released_at IS NULL;
CREATE INDEX ix_seat_holds_expiry ON seat_holds (expires_at) WHERE released_at IS NULL;
CREATE INDEX ix_seat_holds_user_id ON seat_holds (user_id);

CREATE TABLE order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_type varchar(16) NOT NULL CHECK (item_type IN ('food', 'combo')),
    ref_id uuid NOT NULL REFERENCES food_items(id) ON DELETE RESTRICT,
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
    amount numeric(12,2) NOT NULL CHECK (amount >= 0)
);
CREATE INDEX ix_order_items_order_id ON order_items (order_id);

CREATE TABLE payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    idempotency_key varchar(80) NOT NULL UNIQUE,
    amount numeric(12,2) NOT NULL CHECK (amount >= 0),
    payment_method varchar(32) NOT NULL,
    status varchar(16) NOT NULL CHECK (status IN ('succeeded', 'failed')),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_payments_order_id ON payments (order_id);

CREATE TABLE tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    showtime_id uuid NOT NULL REFERENCES showtimes(id) ON DELETE RESTRICT,
    seat_id uuid NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
    ticket_code varchar(24) NOT NULL UNIQUE,
    status varchar(16) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'checked_in', 'cancelled', 'expired')),
    checked_in_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (showtime_id, seat_id)
);
CREATE INDEX ix_tickets_order_id ON tickets (order_id);
CREATE INDEX ix_tickets_showtime_id ON tickets (showtime_id);

CREATE TABLE password_reset_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash char(64) NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_password_reset_tokens_user_id ON password_reset_tokens (user_id);
CREATE INDEX ix_password_reset_tokens_expires_at ON password_reset_tokens (expires_at);

-- The application is the only data-access layer; Supabase Data API clients receive no row policies.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE websocket_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cinemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE showtimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
