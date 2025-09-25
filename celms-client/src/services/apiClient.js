/**
 * CELMS API Client
 * A service for making requests to the CELMS API with proper authorization
 */
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Make a request to the API with authorization headers
 * @param {string} endpoint - The API endpoint (e.g., '/items')
 * @param {object} options - Request options (method, body, etc.)
 * @returns {Promise} - Promise resolving to the response data
 */
export const apiRequest = async (endpoint, options = {}) => {
  
  // Set up headers with auth token
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['x-auth-token'] = token;
  }

  // Make the actual request
  try {
    const url = `${API_URL}/api${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Send cookies if present
    });

    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: errorData.message || 'An error occurred',
        code: errorData.code,
        details: errorData
      };
    }

    // For 204 No Content responses
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    // Format error and rethrow
    console.error('API Request failed:', error);
    throw error;
  }
};

/**
 * Convenience methods for different HTTP verbs
 */
export const apiClient = {
  get: (endpoint, options = {}) => 
    apiRequest(endpoint, { ...options, method: 'GET' }),
    
  post: (endpoint, data, options = {}) => 
    apiRequest(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    }),
    
  put: (endpoint, data, options = {}) => 
    apiRequest(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    
  patch: (endpoint, data, options = {}) => 
    apiRequest(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    
  delete: (endpoint, options = {}) => 
    apiRequest(endpoint, { ...options, method: 'DELETE' }),
};

export default apiClient;