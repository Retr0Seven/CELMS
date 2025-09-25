import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useApiOperation from '../../hooks/useApiOperation';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import { useUser } from '../../contexts/UserContext';

/**
 * AdminDashboard component displays admin-specific statistics and quick actions
 */
const AdminDashboard = () => {
  const { user } = useUser();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalItems: 0,
    activeLoans: 0,
    pendingReservations: 0,
    openTickets: 0,
    overdueLoans: 0,
    itemsUnderMaintenance: 0,
  });

  // Fetch admin dashboard stats
  const {
    loading,
    error,
    execute: fetchStats
  } = useApiOperation(
    () => api.get('/admin/dashboard/stats'),
    {
      showSuccessToast: false,
      errorMessage: 'Failed to load admin dashboard data'
    }
  );

  // Fetch data on component mount
  useEffect(() => {
    fetchStats().then(result => {
      if (result.success) {
        setStats(result.data);
      }
    });
  }, [fetchStats]);

  if (loading) {
    return <LoadingSpinner fullPage message="Loading admin dashboard..." />;
  }

  if (error) {
    return (
      <div className="container mt-4">
        <ErrorDisplay
          error={error}
          title="Dashboard Error"
          onRetry={fetchStats}
          backLink="/"
          backText="Return to Home"
        />
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        <div className="col-12">
          <div className="card mb-4 bg-primary text-white">
            <div className="card-body">
              <h2>Administration Dashboard</h2>
              <p className="mb-0">
                Welcome, {user?.first_name} {user?.last_name}! Here's an overview of your system.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="row g-4 mb-4">
        {/* Users */}
        <div className="col-xl-3 col-md-6">
          <div className="card bg-light h-100 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="me-3 bg-primary text-white p-3 rounded">
                  <i className="bi bi-people fs-3"></i>
                </div>
                <div>
                  <h3 className="mb-0">{stats.totalUsers}</h3>
                  <div className="text-muted">Registered Users</div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-top-0">
              <Link to="/admin/users" className="btn btn-sm btn-primary w-100">
                Manage Users
              </Link>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="col-xl-3 col-md-6">
          <div className="card bg-light h-100 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="me-3 bg-success text-white p-3 rounded">
                  <i className="bi bi-box-seam fs-3"></i>
                </div>
                <div>
                  <h3 className="mb-0">{stats.totalItems}</h3>
                  <div className="text-muted">Equipment Items</div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-top-0">
              <Link to="/admin/items" className="btn btn-sm btn-success w-100">
                Manage Inventory
              </Link>
            </div>
          </div>
        </div>

        {/* Active Loans */}
        <div className="col-xl-3 col-md-6">
          <div className="card bg-light h-100 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="me-3 bg-info text-white p-3 rounded">
                  <i className="bi bi-clipboard-check fs-3"></i>
                </div>
                <div>
                  <h3 className="mb-0">{stats.activeLoans}</h3>
                  <div className="text-muted">Active Loans</div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-top-0">
              <Link to="/admin/loans" className="btn btn-sm btn-info w-100 text-white">
                View Active Loans
              </Link>
            </div>
          </div>
        </div>

        {/* Pending Reservations */}
        <div className="col-xl-3 col-md-6">
          <div className="card bg-light h-100 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="me-3 bg-warning text-white p-3 rounded">
                  <i className="bi bi-calendar-check fs-3"></i>
                </div>
                <div>
                  <h3 className="mb-0">{stats.pendingReservations}</h3>
                  <div className="text-muted">Pending Reservations</div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-transparent border-top-0">
              <Link to="/admin/reservations" className="btn btn-sm btn-warning w-100">
                Manage Reservations
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Sections */}
      <div className="row g-4 mb-4">
        {/* Overdue Loans */}
        <div className="col-xl-4 col-md-6">
          <div className="card border-danger h-100 shadow-sm">
            <div className="card-header bg-danger text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Overdue Loans</h5>
              <span className="badge bg-light text-danger">{stats.overdueLoans}</span>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-center">
                <i className="bi bi-exclamation-triangle-fill text-danger fs-1 me-3"></i>
                <div>
                  {stats.overdueLoans > 0 ? (
                    <p className="mb-0">
                      There are <strong>{stats.overdueLoans}</strong> overdue loans that require your attention.
                    </p>
                  ) : (
                    <p className="mb-0 text-success">
                      <i className="bi bi-check-circle me-1"></i>
                      No overdue loans at the moment.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="card-footer">
              <Link to="/admin/loans?status=overdue" className="btn btn-sm btn-outline-danger w-100">
                View Overdue Loans
              </Link>
            </div>
          </div>
        </div>

        {/* Open Tickets */}
        <div className="col-xl-4 col-md-6">
          <div className="card border-primary h-100 shadow-sm">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Open Maintenance Tickets</h5>
              <span className="badge bg-light text-primary">{stats.openTickets}</span>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-center">
                <i className="bi bi-tools text-primary fs-1 me-3"></i>
                <div>
                  {stats.openTickets > 0 ? (
                    <p className="mb-0">
                      There are <strong>{stats.openTickets}</strong> open maintenance tickets to address.
                    </p>
                  ) : (
                    <p className="mb-0 text-success">
                      <i className="bi bi-check-circle me-1"></i>
                      All maintenance tickets are resolved.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="card-footer">
              <Link to="/admin/tickets?status=open" className="btn btn-sm btn-outline-primary w-100">
                View Open Tickets
              </Link>
            </div>
          </div>
        </div>

        {/* Items Under Maintenance */}
        <div className="col-xl-4 col-md-6">
          <div className="card border-warning h-100 shadow-sm">
            <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Items Under Maintenance</h5>
              <span className="badge bg-light text-warning">{stats.itemsUnderMaintenance}</span>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-center">
                <i className="bi bi-wrench text-warning fs-1 me-3"></i>
                <div>
                  {stats.itemsUnderMaintenance > 0 ? (
                    <p className="mb-0">
                      <strong>{stats.itemsUnderMaintenance}</strong> items are currently under maintenance.
                    </p>
                  ) : (
                    <p className="mb-0 text-success">
                      <i className="bi bi-check-circle me-1"></i>
                      No items are currently under maintenance.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="card-footer">
              <Link to="/admin/items?status=under_maintenance" className="btn btn-sm btn-outline-warning w-100">
                View Maintenance Items
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header bg-light">
              <h5 className="mb-0">Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-lg-3 col-md-4 col-sm-6">
                  <Link to="/admin/users/new" className="btn btn-outline-secondary w-100 py-3">
                    <i className="bi bi-person-plus fs-4 d-block mb-2"></i>
                    Add New User
                  </Link>
                </div>
                <div className="col-lg-3 col-md-4 col-sm-6">
                  <Link to="/admin/items/new" className="btn btn-outline-secondary w-100 py-3">
                    <i className="bi bi-box-seam fs-4 d-block mb-2"></i>
                    Add New Item
                  </Link>
                </div>
                <div className="col-lg-3 col-md-4 col-sm-6">
                  <Link to="/admin/categories" className="btn btn-outline-secondary w-100 py-3">
                    <i className="bi bi-tags fs-4 d-block mb-2"></i>
                    Manage Categories
                  </Link>
                </div>
                <div className="col-lg-3 col-md-4 col-sm-6">
                  <Link to="/admin/reports" className="btn btn-outline-secondary w-100 py-3">
                    <i className="bi bi-bar-chart fs-4 d-block mb-2"></i>
                    Generate Reports
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;