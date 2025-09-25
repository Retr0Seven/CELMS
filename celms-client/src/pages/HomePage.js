import React, { useState, useEffect } from 'react';
import api from '../services/api';

const HomePage = () => {
  const [healthStatus, setHealthStatus] = useState({ ok: false, dbTime: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        setLoading(true);
        const health = await api.system.checkHealth();
        setHealthStatus(health);
        setError(null);
      } catch (err) {
        setError('Could not connect to API server');
        console.error('Health check error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
  }, []);

  return (
    <div className="container mt-5">
      <div className="row">
        <div className="col-md-8 mx-auto">
          <div className="card shadow">
            <div className="card-body text-center">
              <h2 className="card-title">Welcome to CELMS</h2>
              <h5 className="card-subtitle mb-3">Campus Equipment Loan Management System</h5>
              <p className="card-text">
                Use the navigation menu to manage items, loans, reservations, and support tickets.
              </p>
              
              <div className="mt-4 p-3 bg-light rounded">
                <h4>System Status</h4>
                {loading ? (
                  <p>Checking system status...</p>
                ) : error ? (
                  <div className="alert alert-danger">{error}</div>
                ) : (
                  <div>
                    <div className={`alert ${healthStatus.ok ? 'alert-success' : 'alert-warning'}`}>
                      API Status: {healthStatus.ok ? 'Online' : 'Issue Detected'}
                    </div>
                    {healthStatus.dbTime && (
                      <p>Database Time: {new Date(healthStatus.dbTime).toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
