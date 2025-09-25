import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import moment from 'moment';

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loans, setLoans] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [tickets, setTickets] = useState([]);

  const isAdmin = user?.role === 'admin';
  const isTechnician = user?.role === 'technician';

  // Fetch item data
  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);

        // Fetch item details
        const response = await api.get(`/items/${id}`);
        setItem(response.data);

        // Fetch related data
        const [loansRes, reservationsRes, ticketsRes] = await Promise.all([
          api.get(`/items/${id}/loans`),
          api.get(`/items/${id}/reservations`),
          api.get(`/items/${id}/tickets`)
        ]);

        setLoans(loansRes.data);
        setReservations(reservationsRes.data);
        setTickets(ticketsRes.data);

        setError(null);
      } catch (err) {
        console.error('Error fetching item details:', err);
        setError('Failed to load item details');
        toast.error('Failed to load item details');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  const handleDeleteItem = async () => {
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      try {
        await api.delete(`/items/${id}`);
        toast.success('Item deleted successfully');
        navigate('/items');
      } catch (err) {
        console.error('Error deleting item:', err);
        toast.error(err.response?.data?.message || 'Failed to delete item');
      }
    }
  };

  const statusBadgeClass = (status) => {
    switch (status) {
      case 'available': return 'bg-success';
      case 'checked_out': return 'bg-warning text-dark';
      case 'out_of_service': return 'bg-danger';
      case 'retired': return 'bg-secondary';
      case 'under_repair': return 'bg-info';
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
        <button className="btn btn-primary" onClick={() => navigate('/items')}>
          <i className="bi bi-arrow-left me-2"></i>
          Back to Items
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Item Details</h2>
        <div>
          <button className="btn btn-outline-primary me-2" onClick={() => navigate('/items')}>
            <i className="bi bi-arrow-left me-1"></i> Back
          </button>

          {(isAdmin || isTechnician) && (
            <>
              <Link to={`/items/${id}/edit`} className="btn btn-outline-primary me-2">
                <i className="bi bi-pencil me-1"></i> Edit
              </Link>
              {isAdmin && (
                <button className="btn btn-outline-danger" onClick={handleDeleteItem}>
                  <i className="bi bi-trash me-1"></i> Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {item && (
        <div className="row">
          <div className="col-lg-8">
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-primary text-white">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    {item.brand} {item.model_name}
                  </h5>
                  <span className={`badge ${statusBadgeClass(item.status)}`}>
                    {item.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <p><strong>Asset Tag:</strong> {item.asset_tag}</p>
                    <p><strong>Category:</strong> {item.category_name}</p>
                    <p><strong>Location:</strong> {item.location}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Purchase Date:</strong> {item.purchase_date ? moment(item.purchase_date).format('MMM D, YYYY') : 'N/A'}</p>
                    <p><strong>Last Serviced:</strong> {item.last_serviced ? moment(item.last_serviced).format('MMM D, YYYY') : 'Never'}</p>
                  </div>
                </div>

                {item.spec_json && (
                  <div className="mt-3">
                    <h6>Specifications</h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <tbody>
                          {Object.entries(item.spec_json).map(([key, value]) => (
                            <tr key={key}>
                              <th>{key}</th>
                              <td>{typeof value === 'object' ? JSON.stringify(value) : value.toString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {item.notes && (
                  <div className="mt-3">
                    <h6>Notes</h6>
                    <p className="mb-0">{item.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            {(isAdmin || isTechnician) && (
              <div className="card shadow-sm mb-4">
                <div className="card-header">
                  <h5 className="mb-0">Quick Actions</h5>
                </div>
                <div className="card-body">
                  <div className="d-flex flex-wrap gap-2">
                    <Link to={`/loans/new?item=${id}`} className="btn btn-outline-primary">
                      <i className="bi bi-box-arrow-right me-1"></i> Create Loan
                    </Link>
                    <Link to={`/tickets/new?item=${id}`} className="btn btn-outline-warning">
                      <i className="bi bi-tools me-1"></i> Create Ticket
                    </Link>
                    <button
                      className="btn btn-outline-info"
                      onClick={() => {
                        api.put(`/items/${id}`, {
                          ...item,
                          last_serviced: new Date().toISOString().split('T')[0]
                        }).then(() => {
                          toast.success('Maintenance date updated');
                          // Refresh item data
                          api.get(`/items/${id}`).then(res => setItem(res.data));
                        });
                      }}
                    >
                      <i className="bi bi-calendar-check me-1"></i> Mark as Serviced
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="col-lg-4">
            {/* Current Loan */}
            {loans.filter(loan => !loan.return_at).length > 0 && (
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-warning text-dark">
                  <h5 className="mb-0">Current Loan</h5>
                </div>
                <div className="card-body">
                  {loans.filter(loan => !loan.return_at).map(loan => (
                    <div key={loan.loan_id}>
                      <p><strong>Checked out:</strong> {moment(loan.checkout_at).format('MMM D, YYYY')}</p>
                      <p><strong>Due:</strong> {moment(loan.due_at).format('MMM D, YYYY')}</p>
                      <p><strong>Borrower:</strong> {loan.first_name} {loan.last_name}</p>
                      <Link to={`/loans/${loan.loan_id}`} className="btn btn-outline-primary btn-sm">
                        View Loan Details
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Open Reservations */}
            {reservations.length > 0 && (
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-info text-white">
                  <h5 className="mb-0">Upcoming Reservations</h5>
                </div>
                <div className="card-body">
                  <div className="list-group list-group-flush">
                    {reservations.map(res => {
                      const startDate = new Date(res.period.slice(1).split(',')[0]);
                      const endDate = new Date(res.period.split(',')[1].slice(0, -1));

                      return (
                        <Link
                          key={res.reservation_id}
                          to={`/reservations/${res.reservation_id}`}
                          className="list-group-item list-group-item-action"
                        >
                          <div className="d-flex w-100 justify-content-between">
                            <h6 className="mb-1">{res.first_name} {res.last_name}</h6>
                            <span className={`badge ${res.status === 'approved' ? 'bg-success' :
                                res.status === 'pending' ? 'bg-warning text-dark' : 'bg-secondary'
                              }`}>
                              {res.status}
                            </span>
                          </div>
                          <p className="mb-1">
                            {moment(startDate).format('MMM D')} - {moment(endDate).format('MMM D, YYYY')}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Open Tickets */}
            {tickets.length > 0 && (
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-danger text-white">
                  <h5 className="mb-0">Maintenance Tickets</h5>
                </div>
                <div className="card-body">
                  <div className="list-group list-group-flush">
                    {tickets.filter(t => t.status !== 'closed').map(ticket => (
                      <Link
                        key={ticket.ticket_id}
                        to={`/tickets/${ticket.ticket_id}`}
                        className="list-group-item list-group-item-action"
                      >
                        <div className="d-flex w-100 justify-content-between">
                          <h6 className="mb-1">Ticket #{ticket.ticket_id}</h6>
                          <span className={`badge ${ticket.severity === 'critical' ? 'bg-danger' :
                              ticket.severity === 'high' ? 'bg-warning text-dark' :
                                ticket.severity === 'medium' ? 'bg-info' : 'bg-secondary'
                            }`}>
                            {ticket.severity}
                          </span>
                        </div>
                        <p className="mb-1">
                          Status: <span className="fw-bold">{ticket.status.replace('_', ' ')}</span>
                        </p>
                        <small>
                          Opened: {moment(ticket.created_at).format('MMM D, YYYY')}
                        </small>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemDetail;