// Error handling service to work with the API service
import { toast } from 'react-toastify';

// Default error messages by status code
const DEFAULT_ERROR_MESSAGES = {
  400: 'Invalid request. Please check your inputs and try again.',
  401: 'Authentication required. Please login to continue.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'Conflict with current state of the resource.',
  422: 'Validation error. Please check your inputs.',
  500: 'Server error. Please try again later.',
  503: 'Service unavailable. Please try again later.',
};

// Error levels for different status codes
const ERROR_LEVELS = {
  400: 'warning',
  401: 'error',
  403: 'error',
  404: 'warning',
  409: 'warning',
  422: 'warning',
  500: 'error',
  503: 'error',
};

/**
 * Format and display an error notification
 * @param {Error} error - The error object
 * @param {string} customMessage - Optional custom message to display instead of default
 * @param {Object} options - Additional toast options
 */
export const handleError = (error, customMessage = null, options = {}) => {
  // Get the error response from axios
  const response = error?.response || {};
  const status = response?.status || 0;
  const data = response?.data || {};

  // Determine the message to show
  let message = customMessage;

  if (!message) {
    // Try to get message from API response
    message = data.message || data.error;

    // Fall back to default message for status code
    if (!message) {
      message = DEFAULT_ERROR_MESSAGES[status] || 'An unexpected error occurred.';
    }
  }

  // Log detailed error for debugging
  console.error('API Error:', {
    status,
    message: data.message || data.error,
    data,
    originalError: error,
  });

  // Determine notification level based on status code
  const level = ERROR_LEVELS[status] || 'error';

  // Show toast notification with the error message
  toast[level](message, {
    position: 'top-right',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    ...options
  });

  return { success: false, message, status };
};

/**
 * Format and display a success notification
 * @param {string} message - The success message to display
 * @param {Object} options - Additional toast options
 */
export const handleSuccess = (message, options = {}) => {
  toast.success(message, {
    position: 'top-right',
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    ...options
  });

  return { success: true, message };
};

/**
 * Handle API responses with consistent format
 * @param {Promise} apiCall - The API call promise
 * @param {Object} options - Options for handling response/errors
 * @returns {Promise} - Returns a promise with the formatted response
 */
export const handleApiResponse = async (apiCall, options = {}) => {
  const {
    successMessage = null,
    errorMessage = null,
    showSuccessToast = true,
    showErrorToast = true,
  } = options;

  try {
    const response = await apiCall;

    if (showSuccessToast && successMessage) {
      handleSuccess(successMessage);
    }

    return {
      success: true,
      data: response.data,
      message: successMessage || 'Operation completed successfully',
    };
  } catch (error) {
    if (showErrorToast) {
      handleError(error, errorMessage);
    }

    return {
      success: false,
      error,
      message: errorMessage || (error?.response?.data?.message || 'Operation failed'),
      data: error?.response?.data || null,
    };
  }
};

// Export a default object with all functions
const errorHandlerService = {
  handleError,
  handleSuccess,
  handleApiResponse,
};

export default errorHandlerService;