import { useState, useCallback } from 'react';
import errorHandler from '../services/errorHandler';

/**
 * Custom hook for handling API calls with loading, error, and success states
 * @param {Function} apiFunction - The API function to call
 * @param {Object} options - Options for configuring the hook behavior
 * @returns {Object} - Returns loading state, error state, data, execute function, and reset function
 */
const useApiOperation = (apiFunction, options = {}) => {
  const {
    initialLoading = false,
    initialData = null,
    onSuccess = null,
    onError = null,
    successMessage = null,
    errorMessage = null,
    showSuccessToast = true,
    showErrorToast = true,
    resetOnSuccess = false,
  } = options;

  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState(null);
  const [data, setData] = useState(initialData);

  /**
   * Execute the API call with parameters
   * @param {...any} params - Parameters to pass to the API function
   * @returns {Object} - The result of the API call
   */
  const execute = useCallback(async (...params) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFunction(...params);

      if (showSuccessToast && successMessage) {
        errorHandler.handleSuccess(
          typeof successMessage === 'function' ? successMessage(response.data) : successMessage
        );
      }

      setData(response.data);

      if (onSuccess) {
        onSuccess(response.data);
      }

      if (resetOnSuccess) {
        setData(initialData);
      }

      return { success: true, data: response.data };
    } catch (err) {
      const errorMsg =
        typeof errorMessage === 'function' ? errorMessage(err) :
          errorMessage || err?.response?.data?.message || 'Operation failed';

      if (showErrorToast) {
        errorHandler.handleError(err, errorMsg);
      }

      setError(err);

      if (onError) {
        onError(err);
      }

      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, [
    apiFunction,
    successMessage,
    errorMessage,
    onSuccess,
    onError,
    showSuccessToast,
    showErrorToast,
    initialData,
    resetOnSuccess
  ]);

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setLoading(initialLoading);
    setError(null);
    setData(initialData);
  }, [initialLoading, initialData]);

  return { loading, error, data, execute, reset };
};

export default useApiOperation;