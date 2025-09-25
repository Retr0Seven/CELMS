import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

/**
 * AdminDashboardPage serves as the landing page for the admin section
 * providing an overview of key metrics and recent activity
 */
const AdminDashboardPage = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalItems: 0,
    activeLoans: 0,
    pendingReservations: 0,
    openTickets: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch dashboard data
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // In a real application, you'd have a dedicated API endpoint for this
        // For now, we'll simulate with individual requests

        const [
          usersResponse,
          itemsResponse,
          loansResponse,
          reservationsResponse,
          ticketsResponse,
          activityResponse
        ] = await Promise.all([
          api.get('/users?limit=1'), // Just to get the count
          api.get('/items?limit=1'),
          api.get('/loans?status=active&limit=1'),
          api.get('/reservations?status=pending&limit=1'),
          api.get('/tickets?status=open&limit=1'),
          api.get('/activity?limit=10') // Recent activity
        ]);

        setStats({
          totalUsers: usersResponse.data.total || usersResponse.data.length || 0,
          totalItems: itemsResponse.data.total || itemsResponse.data.length || 0,
          activeLoans: loansResponse.data.total || loansResponse.data.length || 0,
          pendingReservations: reservationsResponse.data.total || reservationsResponse.data.length || 0,
          openTickets: ticketsResponse.data.total || ticketsResponse.data.length || 0
        });

        setRecentActivity(activityResponse.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');

        // Set mock data for development/preview
        setStats({
          totalUsers: 124,
          totalItems: 532,
          activeLoans: 47,
          pendingReservations: 18,
          openTickets: 9
        });

        setRecentActivity([
          {
            id: 1,
            type: 'loan',
            action: 'created',
            user: 'John Doe',
            item: 'Dell XPS 15 Laptop',
            timestamp: new Date().toISOString()
          },
          {
            id: 2,
            type: 'reservation',
            action: 'cancelled',
            user: 'Jane Smith',
            item: 'Meeting Room 3B',
            timestamp: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: 3,
            type: 'ticket',
            action: 'resolved',
            user: 'Robert Brown',
            item: 'Printer maintenance',
            timestamp: new Date(Date.now() - 7200000).toISOString()
          },
          {
            id: 4,
            type: 'user',
            action: 'created',
            user: 'Sarah Johnson',
            item: null,
            timestamp: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: 5,
            type: 'item',
            action: 'updated',
            user: 'Admin',
            item: 'Projector P3000',
            timestamp: new Date(Date.now() - 172800000).toISOString()
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Format timestamp to readable date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get appropriate icon and color for activity type
  const getActivityIcon = (type) => {
    switch (type) {
      case 'loan':
        return { icon: 'bi-box-arrow-right', color: 'primary' };
      case 'reservation':
        return { icon: 'bi-calendar-check', color: 'info' };
      case 'ticket':
        return { icon: 'bi-tools', color: 'warning' };
      case 'user':
        return { icon: 'bi-person', color: 'success' };
      case 'item':
        return { icon: 'bi-box-seam', color: 'secondary' };
      default:
        return { icon: 'bi-activity', color: 'dark' };
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h2">Admin Dashboard</h1>
        <div>
          <button className="btn btn-outline-secondary me-2">
            <i className="bi bi-file-earmark-arrow-down me-2"></i>
            Export Report
          </button>
          <button className="btn btn-outline-primary">
            <i className="bi bi-arrow-repeat me-2"></i>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
          <button
            type="button"
            className="btn-close float-end"
            onClick={() => setError(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="row mb-4">
            <div className="col-xl-2 col-md-4 col-sm-6 mb-4">
              <div className="card border-left-primary h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                        Total Users
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">{stats.totalUsers}</div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-people fs-2 text-gray-300"></i>
                    </div>
                  </div>
                </div>
                <div className="card-footer bg-transparent border-0">
                  <Link to="/admin/users" className="text-decoration-none small text-primary">
                    View Details <i className="bi bi-arrow-right"></i>
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-xl-2 col-md-4 col-sm-6 mb-4">
              <div className="card border-left-success h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                        Inventory Items
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">{stats.totalItems}</div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-box-seam fs-2 text-gray-300"></i>
                    </div>
                  </div>
                </div>
                <div className="card-footer bg-transparent border-0">
                  <Link to="/admin/items" className="text-decoration-none small text-success">
                    View Details <i className="bi bi-arrow-right"></i>
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-xl-2 col-md-4 col-sm-6 mb-4">
              <div className="card border-left-info h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                        Active Loans
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">{stats.activeLoans}</div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-clipboard-check fs-2 text-gray-300"></i>
                    </div>
                  </div>
                </div>
                <div className="card-footer bg-transparent border-0">
                  <Link to="/admin/loans" className="text-decoration-none small text-info">
                    View Details <i className="bi bi-arrow-right"></i>
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 col-sm-6 mb-4">
              <div className="card border-left-warning h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                        Pending Reservations
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">{stats.pendingReservations}</div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-calendar-check fs-2 text-gray-300"></i>
                    </div>
                  </div>
                </div>
                <div className="card-footer bg-transparent border-0">
                  <Link to="/admin/reservations" className="text-decoration-none small text-warning">
                    View Details <i className="bi bi-arrow-right"></i>
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 col-sm-6 mb-4">
              <div className="card border-left-danger h-100 py-2">
                <div className="card-body">
                  <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                      <div className="text-xs font-weight-bold text-danger text-uppercase mb-1">
                        Open Tickets
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">{stats.openTickets}</div>
                    </div>
                    <div className="col-auto">
                      <i className="bi bi-tools fs-2 text-gray-300"></i>
                    </div>
                  </div>
                </div>
                <div className="card-footer bg-transparent border-0">
                  <Link to="/admin/tickets" className="text-decoration-none small text-danger">
                    View Details <i className="bi bi-arrow-right"></i>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Content Row */}
          <div className="row">
            {/* Recent Activity */}
            <div className="col-lg-8 mb-4">
              <div className="card shadow mb-4">
                <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                  <h6 className="m-0 font-weight-bold">Recent Activity</h6>
                  <div className="dropdown no-arrow">
                    <button className="btn btn-link btn-sm" type="button" id="activityDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                      <i className="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="activityDropdown">
                      <li><a className="dropdown-item" href="#!">All Activity</a></li>
                      <li><a className="dropdown-item" href="#!">Loans Only</a></li>
                      <li><a className="dropdown-item" href="#!">Reservations Only</a></li>
                      <li><hr className="dropdown-divider" /></li>
                      <li><a className="dropdown-item" href="#!">Export Activity Log</a></li>
                    </ul>
                  </div>
                </div>
                <div className="card-body">
                  <div className="activity-feed">
                    {recentActivity.length === 0 ? (
                      <p className="text-center text-muted my-3">No recent activity found</p>
                    ) : (
                      recentActivity.map((activity) => {
                        const { icon, color } = getActivityIcon(activity.type);

                        return (
                          <div key={activity.id} className="d-flex mb-3 pb-3 border-bottom">
                            <div className={`bg-${color} bg-opacity-25 p-2 rounded me-3`}>
                              <i className={`bi ${icon} text-${color} fs-5`}></i>
                            </div>
                            <div className="flex-grow-1">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <h6 className="mb-0">
                                  {activity.user}
                                  <span className="text-muted ms-2 fw-normal fs-6">
                                    {activity.action} {activity.type}
                                    {activity.item && `: ${activity.item}`}
                                  </span>
                                </h6>
                                <small className="text-muted">{formatDate(activity.timestamp)}</small>
                              </div>
                              <Link to={`/admin/${activity.type}s`} className="btn btn-sm btn-outline-secondary mt-2">
                                View details
                              </Link>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                <div className="card-footer text-center">
                  <Link to="/admin/activity" className="text-decoration-none">
                    View All Activity
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="col-lg-4 mb-4">
              {/* Quick Actions */}
              <div className="card shadow mb-4">
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold">Quick Actions</h6>
                </div>
                <div className="card-body">
                  <div className="d-grid gap-2">
                    <Link to="/admin/users/new" className="btn btn-primary">
                      <i className="bi bi-person-plus me-2"></i>
                      Add New User
                    </Link>
                    <Link to="/admin/items/new" className="btn btn-success">
                      <i className="bi bi-box-seam me-2"></i>
                      Add Inventory Item
                    </Link>
                    <Link to="/admin/loans/new" className="btn btn-info">
                      <i className="bi bi-clipboard-plus me-2"></i>
                      Create New Loan
                    </Link>
                    <Link to="/admin/reports" className="btn btn-secondary">
                      <i className="bi bi-bar-chart me-2"></i>
                      Generate Reports
                    </Link>
                  </div>
                </div>
              </div>

              {/* System Status */}
              <div className="card shadow mb-4">
                <div className="card-header py-3">
                  <h6 className="m-0 font-weight-bold">System Status</h6>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Database</span>
                      <span className="text-success">Online</span>
                    </div>
                    <div className="progress">
                      <div className="progress-bar bg-success" role="progressbar" style={{ width: '95%' }} aria-valuenow="95" aria-valuemin="0" aria-valuemax="100">95%</div>
                    </div>
                    <small className="text-muted">Storage usage</small>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>API Server</span>
                      <span className="text-success">Online</span>
                    </div>
                    <div className="progress">
                      <div className="progress-bar bg-info" role="progressbar" style={{ width: '40%' }} aria-valuenow="40" aria-valuemin="0" aria-valuemax="100">40%</div>
                    </div>
                    <small className="text-muted">Server load</small>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span>File Storage</span>
                      <span className="text-warning">Warning</span>
                    </div>
                    <div className="progress">
                      <div className="progress-bar bg-warning" role="progressbar" style={{ width: '82%' }} aria-valuenow="82" aria-valuemin="0" aria-valuemax="100">82%</div>
                    </div>
                    <small className="text-muted">Storage usage</small>
                  </div>

                  <div className="mb-0">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Backup System</span>
                      <span className="text-success">Active</span>
                    </div>
                    <small className="text-muted">Last backup: Today 03:45 AM</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Styles for card borders */}
          <style jsx>{`
            .border-left-primary {
              border-left: 4px solid #4e73df !important;
            }
            .border-left-success {
              border-left: 4px solid #1cc88a !important;
            }
            .border-left-info {
              border-left: 4px solid #36b9cc !important;
            }
            .border-left-warning {
              border-left: 4px solid #f6c23e !important;
            }
            .border-left-danger {
              border-left: 4px solid #e74a3b !important;
            }
          `}</style>
        </>
      )}
    </div>
  );
};

export default AdminDashboardPage;