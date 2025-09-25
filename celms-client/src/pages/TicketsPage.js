import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useUser } from '../contexts/UserContext';
import moment from 'moment';

const TicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    technicianId: '',
  });
  const { user } = useUser();
  const [technicians, setTechnicians] = useState([]);

  // Determine if user can create tickets
  const canCreateTicket = user?.role !== 'guest';

  // Determine if user can see all tickets or only their own
  const canSeeAllTickets = ['admin', 'technician', 'staff'].includes(user?.role);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);

        // Fetch technicians if admin or technician
        if (['admin', 'technician'].includes(user?.role)) {
          try {
            const techResponse = await api.users.getAll({ role: 'technician' });
            // Make sure technicians is always an array
            setTechnicians(Array.isArray(techResponse) ? techResponse : []);
          } catch (err) {
            console.error('Error fetching technicians:', err);
            setTechnicians([]); // Set empty array on error
          }
        }

        // Fetch tickets with filters
        const queryParams = { ...filters };

        // If not admin/technician/staff, only show user's tickets
        if (!canSeeAllTickets) {
          queryParams.userId = user?.id;
        }

        // Remove empty filters
        Object.keys(queryParams).forEach(key =>
          !queryParams[key] && delete queryParams[key]
        );

        // Use the tickets.getAll method instead of direct api.get
        const response = await api.tickets.getAll();
        setTickets(response || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching tickets:', err);
        setError('Failed to load tickets. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [user, filters, canSeeAllTickets]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      priority: '',
      technicianId: '',
    });
  };

  // Status badge color helper
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'open': return 'bg-danger';
      case 'in_progress': return 'bg-warning text-dark';
      case 'on_hold': return 'bg-info text-dark';
      case 'closed': return 'bg-success';
      case 'resolved': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  // Priority badge color helper
  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'urgent': case 'high': return 'bg-danger';
      case 'medium': return 'bg-warning text-dark';
      case 'low': return 'bg-info text-dark';
      default: return 'bg-secondary';
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Maintenance Tickets</h1>
        {canCreateTicket && (
          <Link to="/tickets/new" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i>
            Create Ticket
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Filters</h5>
          <div className="row g-3">
            <div className="col-md-4">
              <label htmlFor="status" className="form-label">Status</label>
              <select
                id="status"
                name="status"
                className="form-select"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="col-md-4">
              <label htmlFor="priority" className="form-label">Priority</label>
              <select
                id="priority"
                name="priority"
                className="form-select"
                value={filters.priority}
                onChange={handleFilterChange}
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {(user?.role === 'admin' || user?.role === 'technician') && (
              <div className="col-md-4">
                <label htmlFor="technicianId" className="form-label">Assigned To</label>
                <select
                  id="technicianId"
                  name="technicianId"
                  className="form-select"
                  value={filters.technicianId}
                  onChange={handleFilterChange}
                >
                  <option value="">All Technicians</option>
                  <option value="unassigned">Unassigned</option>
                  {technicians.map(tech => (
                    <option key={tech.user_id || tech.id} value={tech.user_id || tech.id}>
                      {tech.first_name} {tech.last_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="d-flex justify-content-end mt-3">
            <button className="btn btn-secondary" onClick={resetFilters}>
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && tickets.length === 0 && (
        <div className="alert alert-info">
          <i className="bi bi-info-circle-fill me-2"></i>
          No tickets found matching your criteria.
        </div>
      )}

      {/* Tickets List */}
      {!loading && !error && tickets.length > 0 && (
        <div className="row row-cols-1 g-4">
          {tickets.map(ticket => (
            <div key={ticket.id || ticket.ticket_id} className="col">
              <div className="card shadow-sm h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <span className="text-muted"># {ticket.id || ticket.ticket_id}</span> - {ticket.asset_tag || ticket.item_name}: {ticket.model_name || ticket.description.substring(0, 30)}
                  </h5>
                  <div>
                    {ticket.priority && (
                      <span className={`badge me-2 ${getPriorityBadgeClass(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    )}
                    <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between mb-2">
                    <small className="text-muted">
                      <i className="bi bi-calendar me-1"></i>
                      Opened: {moment(ticket.created_at).format('MMM D, YYYY')}
                    </small>
                    <small className="text-muted">
                      <i className="bi bi-person me-1"></i>
                      By: {ticket.opener_first_name || ticket.reporter_name || 'Unknown'}
                    </small>
                  </div>

                  <p className="card-text mb-3">{ticket.description.substring(0, 150)}
                    {ticket.description.length > 150 ? '...' : ''}
                  </p>

                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      {ticket.assigned_to || ticket.technician ? (
                        <span className="badge bg-info text-dark">
                          <i className="bi bi-person-badge me-1"></i>
                          Assigned to: {ticket.tech_first_name || ticket.technician || 'Technician'}
                        </span>
                      ) : (
                        <span className="badge bg-secondary">
                          <i className="bi bi-person-x me-1"></i>
                          Unassigned
                        </span>
                      )}
                    </div>
                    <Link to={`/tickets/${ticket.id || ticket.ticket_id}`} className="btn btn-sm btn-outline-primary">
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TicketsPage;
