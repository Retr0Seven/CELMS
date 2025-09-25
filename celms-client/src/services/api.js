// API Service for the CELMS application
import apiClient from './apiClient';

// Error handling middleware for better UX
const handleApiError = (error) => {
  if (error.status) {
    // Handle specific error codes
    switch (error.status) {
      case 401:
        console.error('Authentication error:', error.message);
        // Clear user data from localStorage if authentication fails
        localStorage.removeItem('token');
        // Redirect to login page if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        break;
      case 403:
        console.error('Authorization error:', error.message);
        // Redirect to unauthorized page
        if (window.location.pathname !== '/unauthorized') {
          window.location.href = '/unauthorized';
        }
        break;
      case 404:
        console.error('Resource not found:', error.message);
        break;
      case 409:
        console.error('Conflict error:', error.message);
        break;
      default:
        console.error('API error:', error.message);
    }
  } else {
    console.error('Network error:', error);
  }

  return Promise.reject(error);
};

// Authentication Services
const auth = {
  login: async (email, password) => {
    try {
      return await apiClient.post('/auth/login', { email, password });
    } catch (error) {
      return handleApiError(error);
    }
  },

  register: async (userData) => {
    try {
      return await apiClient.post('/auth/register', userData);
    } catch (error) {
      return handleApiError(error);
    }
  },

  getCurrentUser: async () => {
    try {
      return await apiClient.get('/auth/me');
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// User Services
const users = {
  getAll: async (filters = {}) => {
    try {
      const response = await apiClient.get('/users');
      // Ensure we return an array even if the API doesn't
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return []; // Return empty array on error instead of rejecting
    }
  },

  getById: async (id) => {
    try {
      return await apiClient.get(`/users/${id}`);
    } catch (error) {
      return handleApiError(error);
    }
  },

  update: async (id, userData) => {
    try {
      return await apiClient.put(`/users/${id}`, userData);
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Item Services
const items = {
  getAll: async () => {
    try {
      const response = await apiClient.get('/items');
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error; // Let the component handle the error with its error state
    }
  },

  getById: async (id) => {
    try {
      return await apiClient.get(`/items/${id}`);
    } catch (error) {
      return handleApiError(error);
    }
  },

  create: async (itemData) => {
    try {
      return await apiClient.post('/items', itemData);
    } catch (error) {
      return handleApiError(error);
    }
  },

  update: async (id, itemData) => {
    try {
      return await apiClient.patch(`/items/${id}`, itemData);
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Loan Services
const loans = {
  getAll: async () => {
    try {
      return await apiClient.get('/loans');
    } catch (error) {
      return handleApiError(error);
    }
  },

  getById: async (id) => {
    try {
      return await apiClient.get(`/loans/${id}`);
    } catch (error) {
      return handleApiError(error);
    }
  },

  createFromReservation: async (reservation_id) => {
    try {
      return await apiClient.post('/loans/from-reservation', { reservation_id });
    } catch (error) {
      return handleApiError(error);
    }
  },

  createAdhoc: async (borrower_user_id, item_id) => {
    try {
      return await apiClient.post('/loans/adhoc', { borrower_user_id, item_id });
    } catch (error) {
      return handleApiError(error);
    }
  },

  returnLoan: async (id, returnData) => {
    try {
      return await apiClient.post(`/loans/${id}/return`, returnData);
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Reservation Services
const reservations = {
  getAll: async () => {
    try {
      return await apiClient.get('/reservations');
    } catch (error) {
      return handleApiError(error);
    }
  },

  getById: async (id) => {
    try {
      return await apiClient.get(`/reservations/${id}`);
    } catch (error) {
      return handleApiError(error);
    }
  },

  create: async (reservationData) => {
    try {
      return await apiClient.post('/reservations', reservationData);
    } catch (error) {
      return handleApiError(error);
    }
  },

  approve: async (id, reason) => {
    try {
      return await apiClient.post(`/reservations/${id}/approve`, { reason });
    } catch (error) {
      return handleApiError(error);
    }
  },

  deny: async (id, reason) => {
    try {
      return await apiClient.post(`/reservations/${id}/deny`, { reason });
    } catch (error) {
      return handleApiError(error);
    }
  },

  cancel: async (id) => {
    try {
      return await apiClient.post(`/reservations/${id}/cancel`);
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Ticket Services
const tickets = {
  getAll: async () => {
    try {
      const response = await apiClient.get('/tickets');
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error fetching tickets:', error);
      throw error; // Let the component handle the error with its error state
    }
  },

  getById: async (id) => {
    try {
      return await apiClient.get(`/tickets/${id}`);
    } catch (error) {
      return handleApiError(error);
    }
  },

  create: async (ticketData) => {
    try {
      return await apiClient.post('/tickets', ticketData);
    } catch (error) {
      return handleApiError(error);
    }
  },

  update: async (id, ticketData) => {
    try {
      return await apiClient.patch(`/tickets/${id}`, ticketData);
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Admin utilities
const admin = {
  expireReservations: async () => {
    try {
      return await apiClient.post('/admin/expire-reservations');
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// System services
const system = {
  checkHealth: async () => {
    try {
      return await apiClient.get('/health');
    } catch (error) {
      console.error('Health check failed:', error);
      return { ok: false, message: error.message };
    }
  }
};

// Export API methods
const api = {
  auth,
  users,
  items,
  loans,
  reservations,
  tickets,
  admin,
  system
};

export default api;
