import React, { useState, useEffect } from 'react';
import api from '../services/api';

const LoansPage = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        setLoading(true);
        const data = await api.loans.getAll();
        setLoans(data || []);
        setError(null);
      } catch (err) {
        setError('Failed to fetch loans');
        console.error('Error fetching loans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLoans();
  }, []);

  return (
    <div className="container mt-4">
      <h2>Active Loans</h2>
      
      {loading ? (
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Item</th>
                <th>Borrower</th>
                <th>Check Out Date</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.length > 0 ? (
                loans.map(loan => (
                  <tr key={loan.id}>
                    <td>{loan.id}</td>
                    <td>{loan.item_name}</td>
                    <td>{loan.borrower_name}</td>
                    <td>{new Date(loan.checkout_at).toLocaleDateString()}</td>
                    <td>{new Date(loan.due_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${loan.status === 'active' ? 'bg-primary' : 
                                              loan.status === 'overdue' ? 'bg-danger' : 
                                              loan.status === 'returned' ? 'bg-success' : 'bg-secondary'}`}>
                        {loan.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center">No loans found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LoansPage;
