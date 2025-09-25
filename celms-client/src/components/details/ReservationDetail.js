import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import moment from 'moment';

const ReservationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [reason, setReason] = useState('');

  const isAdmin = user?.role === 'admin';
  const isTechnician = user?.role === 'technician';
  const canApprove = isAdmin || isTechnician;
  const isOwner = user?.id === reservation?.user_id;

  // Format period dates
  const formatPeriod = (periodString) => {
    if (!periodString) return { start: null, end: null };

    try {
      const startStr = periodString.slice(1).split(',')[0];
      const endStr = periodString.split(',')[1].slice(0, -1);

      return {
        start: moment(startStr).toDate(),
        end: moment(endStr).toDate()
      };
    } catch (err) {
      console.error('Error parsing period string:', err);
      return { start: null, end: null };
    }
  };

  // Fetch reservation data
  useEffect(() => {
    const fetchReservation = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/reservations/${id}`);
        setReservation(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching reservation details:', err);
        setError('Failed to load reservation details');
        toast.error('Failed to load reservation details');
      } finally {
        setLoading(false);
      }
    };

    fetchReservation();
  }, [id]);

  const handleApprove = async () => {
    try {
      setProcessing(true);
      await api.put(`/reservations/${id}/approve`, { reason });
      toast.success('Reservation approved');

      // Refresh reservation data
      const response = await api.get(`/reservations/${id}`);
      setReservation(response.data);
      setReason('');
    } catch (err) {
      console.error('Error approving reservation:', err);
      toast.error(err.response?.data?.message || 'Failed to approve reservation');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for denying the reservation');
      return;
    }

    try {
      setProcessing(true);
      await api.put(`/reservations/${id}/deny`, { reason });
      toast.success('Reservation denied');

      // Refresh reservation data
      const response = await api.get(`/reservations/${id}`);
      setReservation(response.data);
      setReason('');
    } catch (err) {
      console.error('Error denying reservation:', err);
      toast.error(err.response?.data?.message || 'Failed to deny reservation');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      try {
        setProcessing(true);
        await api.put(`/reservations/${id}/cancel`);
        toast.success('Reservation cancelled');

        // Refresh reservation data
        const response = await api.get(`/reservations/${id}`);
        setReservation(response.data);
      } catch (err) {
        console.error('Error cancelling reservation:', err);
        toast.error(err.response?.data?.message || 'Failed to cancel reservation');
      } finally {
        setProcessing(false);
      }
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'bg-warning text-dark';
      case 'approved': return 'bg-success';
      case 'denied': return 'bg-danger';
      case 'cancelled': return 'bg-secondary';
      case 'expired': return 'bg-secondary';
      case 'confirmed': return 'bg-info';
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
        <button className="btn btn-primary" onClick={() => navigate('/reservations')}>
          <i className="bi bi-arrow-left me-2"></i>
          Back to Reservations
        </button>
      </div>
    );
  }

  if (!reservation) return null;

  const period = formatPeriod(reservation.period);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Reservation Details</h2>
        <div>
          <button className="btn btn-outline-primary" onClick={() => navigate('/reservations')}>
            <i className="bi bi-arrow-left me-1"></i> Back to Reservations
          </button>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Reservation #{reservation.reservation_id}</h5>
                <span className={`badge ${getStatusBadgeClass(reservation.status)}`}>
                  {reservation.status}
                </span>
              </div>
            </div>
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-6">
                  <p><strong>Requested by:</strong> {reservation.first_name} {reservation.last_name}</p>
                  <p><strong>Email:</strong> {reservation.email}</p>
                  <p><strong>Start Date:</strong> {moment(period.start).format('MMM D, YYYY')}</p>
                  <p><strong>End Date:</strong> {moment(period.end).format('MMM D, YYYY')}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Created:</strong> {moment(reservation.created_at).format('MMM D, YYYY')}</p>
                  {reservation.approved_by && (
                    <>
                      <p><strong>Reviewed by:</strong> {reservation.approver_first_name} {reservation.approver_last_name}</p>
                      <p><strong>Decision Date:</strong> {moment(reservation.decision_at).format('MMM D, YYYY')}</p>
                      {reservation.decision_reason && (
                        <p><strong>Reason:</strong> {reservation.decision_reason}</p>
                      )}
                    </>
                  )}
                  {reservation.cancelled_at && (
                    <p><strong>Cancelled:</strong> {moment(reservation.cancelled_at).format('MMM D, YYYY')}</p>
                  )}
                </div>
              </div>

              <hr />

              <h6 className="mb-3">Equipment Details</h6>
              <div className="row">
                <div className="col-md-6">
                  <p><strong>Asset Tag:</strong> {reservation.asset_tag}</p>
                  <p><strong>Model:</strong> {reservation.model_name}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Category:</strong> {reservation.category_name}</p>
                  <p>
                    <strong>Current Status:</strong> {' '}
                    <span className={`badge ${reservation.status === 'available' ? 'bg-success' :
                        reservation.status === 'checked_out' ? 'bg-warning text-dark' :
                          'bg-secondary'
                      }`}>
                      {reservation.status}
                    </span>
                  </p>
                  <Link to={`/items/${reservation.item_id}`} className="btn btn-sm btn-outline-primary">
                    View Item Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          {/* Admin/Technician Actions */}
          {canApprove && reservation.status === 'pending' && (
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-warning text-dark">
                <h5 className="mb-0">Review Reservation</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="reason" className="form-label">Notes/Reason (optional for approval, required for denial)</label>
                  <textarea
                    className="form-control"
                    id="reason"
                    rows="3"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter notes or reason for decision"
                  />
                </div>

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-success flex-grow-1"
                    onClick={handleApprove}
                    disabled={processing}
                  >
                    <i className="bi bi-check-circle me-1"></i> Approve
                  </button>
                  <button
                    className="btn btn-danger flex-grow-1"
                    onClick={handleDeny}
                    disabled={processing || !reason.trim()}
                  >
                    <i className="bi bi-x-circle me-1"></i> Deny
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User/Admin Actions */}
          {(isOwner || canApprove) && ['pending', 'approved'].includes(reservation.status) && (
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-light">
                <h5 className="mb-0">Actions</h5>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <button
                    className="btn btn-outline-danger"
                    onClick={handleCancel}
                    disabled={processing}
                  >
                    <i className="bi bi-x-circle me-1"></i> Cancel Reservation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Loan Button (for approved reservations) */}
          {canApprove && reservation.status === 'approved' && (
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">Item Pickup</h5>
              </div>
              <div className="card-body">
                <div className="d-grid">
                  <Link
                    to={`/loans/new?reservation=${reservation.reservation_id}`}
                    className="btn btn-primary"
                  >
                    <i className="bi bi-box-arrow-right me-1"></i> Create Loan from Reservation
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservationDetail;