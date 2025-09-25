import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

// Create the context
const UserContext = createContext();

// Custom hook to use the user context
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// Provider component
export const UserProvider = ({ children }) => {
  // State for user data and loading status
  const [user, setUser] = useState({
    id: null,
    firstName: null,
    lastName: null,
    email: null,
    role: null,
    isAuthenticated: false,
  });
  const [loading, setLoading] = useState(true);

  // Check token on mount and initialize user
  useEffect(() => {
    const verifyToken = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        // Verify token expiration
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          logout();
          setLoading(false);
          return;
        }
        
        // Fetch current user data
        const userData = await api.auth.getCurrentUser();
        
        if (userData) {
          setUser({
            id: userData.user_id,
            firstName: userData.first_name,
            lastName: userData.last_name,
            email: userData.email,
            role: userData.role,
            isAuthenticated: true
          });
        }
      } catch (error) {
        console.error('Error verifying token:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };
    
    verifyToken();
  }, []);

  // Function to handle login
  const login = async (email, password) => {
    try {
      const response = await api.auth.login(email, password);
      const { token, user: userData } = response;
      
      // Save token
      localStorage.setItem('token', token);
      
      // Update user state
      setUser({
        id: userData.user_id,
        firstName: userData.first_name,
        lastName: userData.last_name,
        email: userData.email,
        role: userData.role,
        isAuthenticated: true
      });
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.message || 'Invalid credentials'
      };
    }
  };
  
  // Function to log out a user
  const logout = () => {
    localStorage.removeItem('token');
    setUser({
      id: null,
      firstName: null,
      lastName: null,
      email: null,
      role: null,
      isAuthenticated: false
    });
  };

  // Function to register a new user
  const register = async (userData) => {
    try {
      const response = await api.auth.register(userData);
      return { 
        success: true,
        message: 'Registration successful. Please login.'
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.message || 'Registration failed. Please try again.'
      };
    }
  };

  // Helper to check if user has specific role(s)
  const hasRole = (roles) => {
    if (!user.isAuthenticated) return false;
    if (!roles) return true;
    
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  // Check if user is admin
  const isAdmin = () => hasRole('admin');
  
  // Check if user is technician
  const isTechnician = () => hasRole('technician');
  
  // Check if user is admin or technician
  const isAdminOrTech = () => hasRole(['admin', 'technician']);

  // Values to be provided by the context
  const value = {
    user,
    loading,
    login,
    logout,
    register,
    hasRole,
    isAdmin,
    isTechnician,
    isAdminOrTech
  };

  return (
    <UserContext.Provider value={value}>
      {loading ? (
        <div className="app-loading">Loading...</div>
      ) : (
        children
      )}
    </UserContext.Provider>
  );
};

export default UserContext;
