import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import moment from 'moment';

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [ticket, setTicket] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Form states
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  const isAdmin = user?.role === 'admin';
  const isTechnician = user?.role === 'technician';
  const canManage = isAdmin || isTechnician;

  // Fetch ticket data and technicians
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch ticket details
        const ticketResponse = await api.get(`/tickets/${id}`);
        setTicket(ticketResponse.data);

        // Set initial form values
        setSelectedStatus(ticketResponse.data.status);
        setSelectedPriority(ticketResponse.data.priority || '');
        setSelectedTechnician(ticketResponse.data.assigned_to || '');

        // Fetch technicians if admin/technician
        if (canManage) {
          const techResponse = await api.get('/users?role=technician');
          setTechnicians(techResponse.data);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching ticket details:', err);
        setError('Failed to load ticket details');
        toast.error('Failed to load ticket details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, canManage]);

  const handleAssignTechnician = async () => {
    try {
      setProcessing(true);
      await api.put(`/tickets/${id}/assign`, {
        technician_id: selectedTechnician || null
      });

      toast.success(selectedTechnician ? 'Ticket assigned successfully' : 'Ticket unassigned');

      // Refresh ticket data
      const response = await api.get(`/tickets/${id}`);
      setTicket(response.data);
    } catch (err) {
      console.error('Error assigning ticket:', err);
      toast.error(err.response?.data?.message || 'Failed to assign ticket');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateStatus = async () => {
    try {
      setProcessing(true);
      await api.put(`/tickets/${id}/status`, {
        status: selectedStatus,
        priority: selectedPriority || null
      });

      toast.success('Ticket status updated');

      // Refresh ticket data
      const response = await api.get(`/tickets/${id}`);
      setTicket(response.data);
    } catch (err) {
      console.error('Error updating ticket status:', err);
      toast.error(err.response?.data?.message || 'Failed to update ticket');
    } finally {
      setProcessing(false);
    }
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-danger';
      case 'high': return 'bg-warning text-dark';
      case 'medium': return 'bg-info text-dark';
      case 'low': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'open': return 'bg-danger';
      case 'in_progress': return 'bg-warning text-dark';
      case 'on_hold': return 'bg-info text-dark';
      case 'closed': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  if (loading) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tickets')}>
          <i className="bi bi-arrow-left me-2"></i>
          Back to Tickets
        </button>
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Maintenance Ticket #{ticket.ticket_id}</h2>
        <div>
          <button className="btn btn-outline-primary" onClick={() => navigate('/tickets')}>
            <i className="bi bi-arrow-left me-1"></i> Back to Tickets
          </button>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Ticket Details</h5>
                <div>
                  <span className={`badge me-2 ${getSeverityBadgeClass(ticket.severity)}`}>
                    {ticket.severity}
                  </span>
                  <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Opened By:</strong> {ticket.opener_first_name} {ticket.opener_last_name}</p>
                  <p><strong>Email:</strong> {ticket.opener_email}</p>
                  <p><strong>Created:</strong> {moment(ticket.created_at).format('MMM D, YYYY')}</p>
                  {ticket.assigned_to && (
                    <p>
                      <strong>Assigned To:</strong> {ticket.tech_first_name} {ticket.tech_last_name}
                    </p>
                  )}
                </div>
                <div className="col-md-6">
                  {ticket.priority && (
                    <p><strong>Priority:</strong> {ticket.priority}</p>
                  )}
                  {ticket.status === 'closed' && ticket.closed_at && (
                    <p><strong>Closed:</strong> {moment(ticket.closed_at).format('MMM D, YYYY')}</p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <h6 className="mb-2">Description</h6>
                <div className="p-3 bg-light rounded">
                  <p className="mb-0">{ticket.description}</p>
                </div>
              </div>

              <hr />

              <h6 className="mb-3">Equipment Details</h6>
              <div className="row">
                <div className="col-md-6">
                  <p><strong>Asset Tag:</strong> {ticket.asset_tag}</p>
                  <p><strong>Model:</strong> {ticket.model_name}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Category:</strong> {ticket.category_name}</p>
                  <p>
                    <strong>Status:</strong> {' '}
                    <span className={`badge ${ticket.item_status === 'available' ? 'bg-success' :
                        ticket.item_status === 'checked_out' ? 'bg-warning text-dark' :
                          ticket.item_status === 'under_repair' ? 'bg-danger' :
                            'bg-secondary'
                      }`}>
                      {ticket.item_status?.replace('_', ' ')}
                    </span>
                  </p>
                  <Link to={`/items/${ticket.item_id}`} className="btn btn-sm btn-outline-primary">
                    View Item Details
                  </Link>
                </div>
              </div>

              {ticket.loan_id && (
                <div className="alert alert-info mt-3 mb-0">
                  <i className="bi bi-box me-2"></i>
                  This ticket is associated with Loan #{ticket.loan_id}
                  <Link to={`/loans/${ticket.loan_id}`} className="ms-2 alert-link">
                    View Loan
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          {/* Admin/Technician Actions */}
          {canManage && (
            <>
              {/* Assign Technician */}
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-info text-dark">
                  <h5 className="mb-0">Assign Technician</h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <select
                      className="form-select"
                      value={selectedTechnician}
                      onChange={(e) => setSelectedTechnician(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {technicians.map(tech => (
                        <option key={tech.user_id} value={tech.user_id}>
                          {tech.first_name} {tech.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="d-grid">
                    <button
                      className="btn btn-primary"
                      onClick={handleAssignTechnician}
                      disabled={processing}
                    >
                      {processing ? (
                        <span>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Processing...
                        </span>
                      ) : selectedTechnician ? 'Assign Technician' : 'Unassign Technician'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Update Status */}
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-warning text-dark">
                  <h5 className="mb-0">Update Status</h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label htmlFor="status" className="form-label">Status</label>
                    <select
                      id="status"
                      className="form-select"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="on_hold">On Hold</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="priority" className="form-label">Priority (optional)</label>
                    <select
                      id="priority"
                      className="form-select"
                      value={selectedPriority}
                      onChange={(e) => setSelectedPriority(e.target.value)}
                    >
                      <option value="">Not Set</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="d-grid">
                    <button
                      className="btn btn-primary"
                      onClick={handleUpdateStatus}
                      disabled={processing}
                    >
                      {processing ? (
                        <span>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Updating...
                        </span>
                      ) : 'Update Status'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;