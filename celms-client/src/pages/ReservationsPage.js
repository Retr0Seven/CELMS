import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ReservationsPage = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setLoading(true);
        const data = await api.reservations.getAll();
        setReservations(data || []);
        setError(null);
      } catch (err) {
        setError('Failed to fetch reservations');
        console.error('Error fetching reservations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, []);

  return (
    <div className="container mt-4">
      <h2>Equipment Reservations</h2>
      
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
                <th>Requester</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reservations.length > 0 ? (
                reservations.map(reservation => (
                  <tr key={reservation.id}>
                    <td>{reservation.id}</td>
                    <td>{reservation.item_name}</td>
                    <td>{reservation.user_name || "You"}</td>
                    <td>{new Date(reservation.start_at).toLocaleDateString()}</td>
                    <td>{new Date(reservation.end_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${reservation.status === 'pending' ? 'bg-warning' : 
                                               reservation.status === 'approved' ? 'bg-success' : 
                                               reservation.status === 'denied' ? 'bg-danger' : 'bg-secondary'}`}>
                        {reservation.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center">No reservations found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReservationsPage;
