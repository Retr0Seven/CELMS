import React from 'react';
import { Link } from 'react-router-dom';

/**
 * A reusable empty state component with customizable icon and message
 * @param {Object} props - Component props
 * @param {string} props.icon - Bootstrap icon class name without 'bi-' prefix
 * @param {string} props.message - Main message to display
 * @param {string} props.description - Optional secondary description
 * @param {Object} props.action - Optional action button { to, text, onClick }
 * @param {string} props.className - Additional CSS classes
 */
const EmptyState = ({
  icon = 'inbox',
  message = 'No data found',
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`text-center py-5 ${className}`}>
      <i className={`bi bi-${icon} fs-1 text-muted mb-3 d-block`}></i>
      <h5 className="fw-bold">{message}</h5>

      {description && (
        <p className="text-muted mb-4">{description}</p>
      )}

      {action && (
        action.to ? (
          <Link
            to={action.to}
            className={`btn btn-${action.variant || 'primary'}`}
          >
            {action.icon && <i className={`bi bi-${action.icon} me-2`}></i>}
            {action.text}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className={`btn btn-${action.variant || 'primary'}`}
            type="button"
          >
            {action.icon && <i className={`bi bi-${action.icon} me-2`}></i>}
            {action.text}
          </button>
        )
      )}
    </div>
  );
};

export default EmptyState;