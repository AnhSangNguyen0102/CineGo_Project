import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from './ProtectedRoute';

// Public pages
import { MovieCatalogPage } from '@/features/movies/MovieCatalogPage';
import { MovieDetailPage } from '@/features/movies/MovieDetailPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ProfilePage } from '@/features/auth/ProfilePage';

// Booking & Customer pages
import { SeatSelectionPage } from '@/features/booking/SeatSelectionPage';
import { OrderFoodPage } from '@/features/booking/OrderFoodPage';
import { PaymentPage } from '@/features/booking/PaymentPage';
import { BookingHistoryPage } from '@/features/tickets/BookingHistoryPage';
import { TicketDetailPage } from '@/features/tickets/TicketDetailPage';

// Staff pages
import { StaffCheckinPage } from '@/features/checkin/StaffCheckinPage';

// Admin pages
import { AdminLayout } from '@/features/admin/AdminLayout';
import { AdminDashboardPage } from '@/features/admin/AdminDashboardPage';
import { AdminMoviesPage } from '@/features/admin/AdminMoviesPage';
import { AdminRoomsPage } from '@/features/admin/AdminRoomsPage';
import { AdminShowtimesPage } from '@/features/admin/AdminShowtimesPage';
import { AdminFoodPage } from '@/features/admin/AdminFoodPage';
import { AdminBookingsPage } from '@/features/admin/AdminBookingsPage';
import { AdminUsersPage } from '@/features/admin/AdminUsersPage';
import { Button } from '@/components/ui/Button';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public & Customer Layout */}
      <Route element={<Layout />}>
        <Route path="/" element={<MovieCatalogPage />} />
        <Route path="/movies/:id" element={<MovieDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Seat Selection */}
        <Route path="/showtimes/:id/seats" element={<SeatSelectionPage />} />

        {/* Customer Protected Routes */}
        <Route
          path="/booking/order"
          element={
            <ProtectedRoute allowedRoles={['customer', 'admin']}>
              <OrderFoodPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/booking/payment/:id"
          element={
            <ProtectedRoute allowedRoles={['customer', 'admin']}>
              <PaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <ProtectedRoute allowedRoles={['customer', 'admin']}>
              <BookingHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <ProtectedRoute allowedRoles={['customer', 'staff', 'admin']}>
              <TicketDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={['customer', 'staff', 'admin']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Staff Check-in Page */}
        <Route
          path="/staff/checkin"
          element={
            <ProtectedRoute allowedRoles={['staff', 'admin']}>
              <StaffCheckinPage />
            </ProtectedRoute>
          }
        />
        <Route path="/checkin" element={<Navigate to="/staff/checkin" replace />} />
      </Route>

      {/* Admin Desktop-First Layout */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="movies" element={<AdminMoviesPage />} />
        <Route path="rooms" element={<AdminRoomsPage />} />
        <Route path="showtimes" element={<AdminShowtimesPage />} />
        <Route path="food" element={<AdminFoodPage />} />
        <Route path="bookings" element={<AdminBookingsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
      </Route>

      {/* 404 Fallback */}
      <Route
        path="*"
        element={
          <div className="min-h-screen bg-cinema-darker flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-6xl font-black text-brand-500 mb-2">404</h1>
            <h2 className="text-xl font-bold text-white mb-2">Page Not Found</h2>
            <p className="text-xs text-slate-400 max-w-sm mb-6">
              The page or screening link you are looking for does not exist or has been moved.
            </p>
            <Link to="/">
              <Button variant="primary">Return to Movies Catalog</Button>
            </Link>
          </div>
        }
      />
    </Routes>
  );
};
