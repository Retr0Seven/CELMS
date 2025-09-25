import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import moment from 'moment';

const LoanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [returningLoan, setReturningLoan] = useState(false);
  const [returnData, setReturnData] = useState({
    damaged: false,
    return_condition: ''
  });

  const isAdmin = user?.role === 'admin';
  const isTechnician = user?.role === 'technician';
  const canReturn = isAdmin || isTechnician;

  // Fetch loan data
  useEffect(() => {
    const fetchLoan = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/loans/${id}`);
        setLoan(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching loan details:', err);
        setError('Failed to load loan details');
        toast.error('Failed to load loan details');
      } finally {
        setLoading(false);
      }
    };

    fetchLoan();
  }, [id]);

  const handleReturnLoan = async () => {
    try {
      setReturningLoan(true);
      await api.put(`/loans/${id}/return`, returnData);
      toast.success('Item returned successfully');

      // Refresh loan data
      const response = await api.get(`/loans/${id}`);
      setLoan(response.data);

      // Reset return form
      setReturnData({
        damaged: false,
        return_condition: ''
      });
    } catch (err) {
      console.error('Error returning loan:', err);
      toast.error(err.response?.data?.message || 'Failed to return item');
    } finally {
      setReturningLoan(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setReturnData({
      ...returnData,
      [name]: type === 'checkbox' ? checked : value
    });
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
        <button className="btn btn-primary" onClick={() => navigate('/loans')}>
          <i className="bi bi-arrow-left me-2"></i>
          Back to Loans
        </button>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Loan Details</h2>
        <div>
          <button className="btn btn-outline-primary" onClick={() => navigate('/loans')}>
            <i className="bi bi-arrow-left me-1"></i> Back to Loans
          </button>
        </div>
      </div>

      {loan && (
        <div className="row">
          <div className="col-lg-8">
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Loan #{loan.loan_id}</h5>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <p><strong>Borrower:</strong> {loan.first_name} {loan.last_name}</p>
                    <p><strong>Email:</strong> {loan.email}</p>
                    <p><strong>Checkout Date:</strong> {moment(loan.checkout_at).format('MMM D, YYYY')}</p>
                    <p><strong>Due Date:</strong> {moment(loan.due_at).format('MMM D, YYYY')}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Status:</strong> {loan.return_at ? 'Returned' : 'Checked Out'}</p>
                    {loan.return_at && (
                      <>
                        <p><strong>Return Date:</strong> {moment(loan.return_at).format('MMM D, YYYY')}</p>
                        <p>
                          <strong>Condition:</strong> {
                            loan.damaged
                              ? <span className="text-danger">Damaged</span>
                              : <span className="text-success">Good</span>
                          }
                        </p>
                        {loan.return_condition && (
                          <p><strong>Return Notes:</strong> {loan.return_condition}</p>
                        )}
                      </>
                    )}
                    {!loan.return_at && (
                      <p>
                        <strong>Overdue:</strong> {
                          moment().isAfter(moment(loan.due_at))
                            ? <span className="text-danger">Yes</span>
                            : <span className="text-success">No</span>
                        }
                      </p>
                    )}
                  </div>
                </div>

                {loan.reservation_id && (
                  <div className="alert alert-info mb-3">
                    <i className="bi bi-calendar-event me-2"></i>
                    This loan is associated with Reservation #{loan.reservation_id}
                    <Link to={`/reservations/${loan.reservation_id}`} className="ms-2 alert-link">
                      View Reservation
                    </Link>
                  </div>
                )}

                <hr />

                <h6 className="mb-3">Equipment Details</h6>
                <div className="row">
                  <div className="col-md-6">
                    <p><strong>Asset Tag:</strong> {loan.asset_tag}</p>
                    <p><strong>Model:</strong> {loan.model_name}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Category:</strong> {loan.category_name}</p>
                    <Link to={`/items/${loan.item_id}`} className="btn btn-sm btn-outline-primary">
                      View Item Details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            {/* Return Item Panel (for admins/technicians) */}
            {canReturn && !loan.return_at && (
              <div className="card shadow-sm mb-4">
                <div className="card-header bg-warning text-dark">
                  <h5 className="mb-0">Return Item</h5>
                </div>
                <div className="card-body">
                  <form>
                    <div className="mb-3 form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="damaged"
                        name="damaged"
                        checked={returnData.damaged}
                        onChange={handleInputChange}
                      />
                      <label className="form-check-label" htmlFor="damaged">
                        Item is damaged
                      </label>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="return_condition" className="form-label">Condition Notes</label>
                      <textarea
                        className="form-control"
                        id="return_condition"
                        name="return_condition"
                        rows="3"
                        value={returnData.return_condition}
                        onChange={handleInputChange}
                        placeholder="Describe the condition of the returned item"
                      />
                    </div>

                    <div className="d-grid">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleReturnLoan}
                        disabled={returningLoan}
                      >
                        {returningLoan ? (
                          <span>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Processing Return...
                          </span>
                        ) : 'Return Item'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-light">
                <h5 className="mb-0">Actions</h5>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <Link to={`/tickets/new?loan=${loan.loan_id}&item=${loan.item_id}`} className="btn btn-outline-warning">
                    <i className="bi bi-tools me-1"></i> Report Issue
                  </Link>

                  {isAdmin && (
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to extend this loan?')) {
                          api.put(`/loans/${loan.loan_id}/extend`, {
                            days: 7
                          }).then(() => {
                            toast.success('Loan extended by 7 days');
                            // Refresh loan data
                            api.get(`/loans/${id}`).then(res => setLoan(res.data));
                          }).catch(err => {
                            toast.error(err.response?.data?.message || 'Failed to extend loan');
                          });
                        }
                      }}
                    >
                      <i className="bi bi-calendar-plus me-1"></i> Extend Loan
                    </button>
                  )}

                  {loan.return_at && isAdmin && (
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => navigate(`/penalties/new?loan=${loan.loan_id}`)}
                    >
                      <i className="bi bi-exclamation-triangle me-1"></i> Add Penalty
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanDetail;