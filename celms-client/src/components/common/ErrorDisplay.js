import React from 'react';
import { Link } from 'react-router-dom';

/**
 * A reusable error display component
 * @param {Object} props - Component props
 * @param {Error|string} props.error - The error object or error message string
 * @param {string} props.title - Optional custom title for the error
 * @param {Function} props.onRetry - Optional retry function
 * @param {string} props.backLink - Optional back link URL
 * @param {string} props.backText - Optional text for back link
 * @param {string} props.className - Additional CSS classes
 */
const ErrorDisplay = ({
  error,
  title = 'An error occurred',
  onRetry,
  backLink,
  backText = 'Go Back',
  className = '',
}) => {
  // Extract error message
  let errorMessage = '';

  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error?.response?.data?.message) {
    errorMessage = error.response.data.message;
  } else if (error?.message) {
    errorMessage = error.message;
  } else if (error) {
    errorMessage = 'Unknown error occurred';
  }

  // Special case for network errors
  if (error?.networkError || error?.message?.includes('Network Error')) {
    title = 'Connection Error';
    errorMessage = 'Could not connect to the server. Please check your internet connection and try again.';
  }

  return (
    <div className={`alert alert-danger shadow-sm ${className}`}>
      <div className="d-flex align-items-center">
        <i className="bi bi-exclamation-triangle-fill fs-3 me-3"></i>
        <div>
          <h5 className="alert-heading mb-1">{title}</h5>
          <p className="mb-3">{errorMessage}</p>

          <div className="mt-3">
            {onRetry && (
              <button
                className="btn btn-outline-danger me-2"
                onClick={onRetry}
                type="button"
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Try Again
              </button>
            )}

            {backLink && (
              <Link to={backLink} className="btn btn-outline-secondary">
                <i className="bi bi-arrow-left me-1"></i>
                {backText}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;