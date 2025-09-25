import React from 'react';
import { Link } from 'react-router-dom';

/**
 * UnauthorizedPage component displays when a user attempts to access a page
 * without proper permissions
 */
const UnauthorizedPage = () => {
  return (
    <div className="container text-center py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="p-5">
            <div className="mb-4">
              <i className="bi bi-shield-lock text-danger" style={{ fontSize: '5rem' }}></i>
            </div>
            <h1 className="h2 mb-4">Access Denied</h1>
            <p className="lead mb-4">
              You do not have permission to access this page. Please contact your system administrator
              if you believe this is an error.
            </p>
            <div className="d-grid gap-2 col-6 mx-auto">
              <Link to="/" className="btn btn-primary">
                <i className="bi bi-house-door me-2"></i>
                Return Home
              </Link>
              <button
                className="btn btn-outline-secondary"
                onClick={() => window.history.back()}
              >
                <i className="bi bi-arrow-left me-2"></i>
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;