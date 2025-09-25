import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// User Context
import { UserProvider, useUser } from './contexts/UserContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/routing/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';

// Pages
import HomePage from './pages/HomePage';
import ItemsPage from './pages/ItemsPage';
import LoansPage from './pages/LoansPage';
import ReservationsPage from './pages/ReservationsPage';
import TicketsPage from './pages/TicketsPage';

// Admin Pages
import AdminDashboardPage from './pages/admin/DashboardPage';
import AdminUsersPage from './pages/admin/UsersPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
// Registration removed - using predefined users only

// Error Pages
import UnauthorizedPage from './pages/UnauthorizedPage';

const NotFoundPage = () => (
  <div className="container mt-5 text-center">
    <div className="alert alert-warning p-5">
      <h1><i className="bi bi-question-circle-fill me-3"></i>404: Page Not Found</h1>
      <p className="lead mt-3">The page you're looking for doesn't exist.</p>
    </div>
  </div>
);

// AppContent component to access user context
const AppContent = () => {
  const { user, loading } = useUser();

  // Show loading indicator while checking authentication
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {user.isAuthenticated && <Navbar />}
      <main className="py-4">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            user.isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
          } />
          {/* Registration route removed */}

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/loans" element={<LoansPage />} />
            <Route path="/reservations" element={<ReservationsPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="items" element={<Navigate to="/admin" replace />} /> {/* Placeholder */}
              <Route path="loans" element={<Navigate to="/admin" replace />} /> {/* Placeholder */}
              <Route path="reservations" element={<Navigate to="/admin" replace />} /> {/* Placeholder */}
              <Route path="tickets" element={<Navigate to="/admin" replace />} /> {/* Placeholder */}
              <Route path="reports" element={<Navigate to="/admin" replace />} /> {/* Placeholder */}
              <Route path="settings" element={<Navigate to="/admin" replace />} /> {/* Placeholder */}
            </Route>
          </Route>

          {/* Error Routes */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
};

function App() {
  return (
    <Router>
      <UserProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </UserProvider>
    </Router>
  );
}

export default App;
