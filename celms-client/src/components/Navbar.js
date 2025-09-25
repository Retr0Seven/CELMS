import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useUser } from '../contexts/UserContext';
import { toast } from 'react-toastify';

// Bootstrap JS for dropdown functionality
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

const Navbar = () => {
  const { user, logout, isAdmin, isTechnician, isAdminOrTech } = useUser();
  const navigate = useNavigate();
  const [navExpanded, setNavExpanded] = useState(false);

  // Function to collapse navbar when a link is clicked
  const closeNavbar = () => {
    if (navExpanded) {
      setNavExpanded(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    toast.info('You have been logged out');
    navigate('/login');
  };

  // Load Bootstrap dropdown functionality
  useEffect(() => {
    // This is a workaround for bootstrap dropdown in React
    const dropdownElementList = document.querySelectorAll('.dropdown-toggle');
    if (dropdownElementList.length > 0 && typeof window.bootstrap !== 'undefined') {
      dropdownElementList.forEach(dropdownToggleEl => {
        new window.bootstrap.Dropdown(dropdownToggleEl);
      });
    }
  }, []);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <Link className="navbar-brand" to="/">CELMS</Link>
        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setNavExpanded(!navExpanded)}
          aria-controls="navbarNav"
          aria-expanded={navExpanded}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className={`collapse navbar-collapse ${navExpanded ? 'show' : ''}`} id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/" onClick={closeNavbar}>Home</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/items" onClick={closeNavbar}>Items</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/loans" onClick={closeNavbar}>Loans</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/reservations" onClick={closeNavbar}>Reservations</Link>
            </li>
            {/* Show Tickets tab only for admins and technicians */}
            {isAdminOrTech() && (
              <li className="nav-item">
                <Link className="nav-link" to="/tickets" onClick={closeNavbar}>Tickets</Link>
              </li>
            )}
            {/* Admin-only links */}
            {isAdmin() && (
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="adminDropdown"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Admin
                </a>
                <ul className="dropdown-menu" aria-labelledby="adminDropdown">
                  <li><Link className="dropdown-item" to="/admin" onClick={closeNavbar}>Admin Dashboard</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><Link className="dropdown-item" to="/admin/users" onClick={closeNavbar}>Manage Users</Link></li>
                  <li><Link className="dropdown-item" to="/admin/items" onClick={closeNavbar}>Manage Inventory</Link></li>
                  <li><Link className="dropdown-item" to="/admin/loans" onClick={closeNavbar}>Manage Loans</Link></li>
                  <li><Link className="dropdown-item" to="/admin/reservations" onClick={closeNavbar}>Manage Reservations</Link></li>
                  <li><Link className="dropdown-item" to="/admin/tickets" onClick={closeNavbar}>Manage Tickets</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><Link className="dropdown-item" to="/admin/reports" onClick={closeNavbar}>Reports</Link></li>
                  <li><Link className="dropdown-item" to="/admin/settings" onClick={closeNavbar}>System Settings</Link></li>
                </ul>
              </li>
            )}
          </ul>

          <div className="ms-auto d-flex align-items-center">
            {user && user.isAuthenticated ? (
              <div className="dropdown">
                <button
                  className="btn btn-outline-light dropdown-toggle"
                  type="button"
                  id="userDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-person-circle me-2"></i>
                  {`${user.firstName} ${user.lastName}`} ({user.role})
                </button>
                <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                  <li><span className="dropdown-item-text">Role: {user.role}</span></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><Link className="dropdown-item" to="/profile" onClick={closeNavbar}>Profile</Link></li>
                  <li><Link className="dropdown-item" to="/settings" onClick={closeNavbar}>Settings</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><button className="dropdown-item" onClick={handleLogout}>Logout</button></li>
                </ul>
              </div>
            ) : (
              <Link to="/login" className="btn btn-outline-light">Login</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
