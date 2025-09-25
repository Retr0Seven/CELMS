import React from 'react';

/**
 * A reusable loading spinner component with various sizes and styles
 * @param {Object} props - Component props
 * @param {string} props.size - Size of spinner: 'sm', 'md', 'lg'
 * @param {string} props.color - Bootstrap color: 'primary', 'secondary', etc.
 * @param {string} props.message - Optional loading message to display
 * @param {boolean} props.fullPage - Whether to display as a full page overlay
 * @param {boolean} props.overlay - Whether to display as an overlay on parent
 * @param {string} props.className - Additional CSS classes
 */
const LoadingSpinner = ({
  size = 'md',
  color = 'primary',
  message = 'Loading...',
  fullPage = false,
  overlay = false,
  className = '',
}) => {
  // Determine size class
  const sizeClass = size === 'sm'
    ? 'spinner-border-sm'
    : size === 'lg'
      ? 'spinner-border-lg'
      : '';

  // Base spinner element
  const spinner = (
    <div className={`spinner-border text-${color} ${sizeClass}`} role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  );

  // Full page overlay
  if (fullPage) {
    return (
      <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75" style={{ zIndex: 1050 }}>
        <div className="text-center">
          {spinner}
          {message && <div className="mt-3">{message}</div>}
        </div>
      </div>
    );
  }

  // Overlay on parent element (parent must have position: relative)
  if (overlay) {
    return (
      <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-50" style={{ zIndex: 5 }}>
        <div className="text-center">
          {spinner}
          {message && <div className="mt-3">{message}</div>}
        </div>
      </div>
    );
  }

  // Standard spinner with optional message
  return (
    <div className={`d-flex align-items-center ${className}`}>
      {spinner}
      {message && <div className="ms-2">{message}</div>}
    </div>
  );
};

export default LoadingSpinner;