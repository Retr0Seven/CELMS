import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import LoadingSpinner from '../common/LoadingSpinner';

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, loading, hasRole } = useUser();

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner />;
  }

  // Check if user is authenticated
  if (!user.isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles array is empty, allow all authenticated users
  if (allowedRoles.length === 0) {
    return <Outlet />;
  }

  // Check if user has one of the allowed roles using the hasRole utility
  if (hasRole(allowedRoles)) {
    return <Outlet />;
  }

  // Redirect to unauthorized page
  return <Navigate to="/unauthorized" replace />;
};

export default ProtectedRoute;