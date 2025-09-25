import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ItemsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const data = await api.items.getAll();
        setItems(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch items');
        console.error('Error fetching items:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  return (
    <div className="container mt-4">
      <h2>Equipment Items</h2>
      
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
                <th>Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Location</th>
                <th>Last Serviced</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map(item => (
                  <tr key={item.id}>
                    <td>{item.asset_tag}</td>
                    <td>{item.model}</td>
                    <td>{item.category}</td>
                    <td>
                      <span className={`badge ${item.status === 'available' ? 'bg-success' : 
                                               item.status === 'checked_out' ? 'bg-warning' :
                                               item.status === 'under_repair' ? 'bg-danger' : 'bg-secondary'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>{item.location}</td>
                    <td>{item.last_serviced ? new Date(item.last_serviced).toLocaleDateString() : 'Never'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center">No items found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ItemsPage;
