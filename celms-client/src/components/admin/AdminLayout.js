import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';

/**
 * AdminLayout component provides a consistent layout for all admin pages
 * with a sidebar navigation and content area.
 */
const AdminLayout = () => {
  const { user } = useUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Make sure the user is an admin
  if (!user || user.role !== 'admin') {
    // Redirect to unauthorized page if not admin
    navigate('/unauthorized');
    return null;
  }

  // Toggle sidebar collapse
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Check if a nav item is active
  const isNavActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className="container-fluid">
      <div className="row">
        {/* Sidebar Navigation */}
        <div className={`admin-sidebar col-md-3 col-xl-2 p-0 bg-dark ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="d-flex flex-column position-sticky top-0 pt-3 pb-3 vh-100">
            {/* Sidebar Header */}
            <div className="d-flex align-items-center px-3 mb-3">
              <span className="fs-5 text-white">
                {!sidebarCollapsed && 'Admin Dashboard'}
              </span>
              <button
                type="button"
                className={`btn btn-sm ${sidebarCollapsed ? 'ms-auto' : 'ms-auto'} p-1 text-white`}
                onClick={toggleSidebar}
              >
                <i className={`bi bi-arrow-${sidebarCollapsed ? 'right' : 'left'}-circle fs-5`}></i>
              </button>
            </div>

            {/* Navigation Items */}
            <nav className="nav flex-column mb-auto">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `nav-link text-white py-3 px-3 ${isActive ? 'active bg-primary' : ''}`
                }
              >
                <i className="bi bi-speedometer2 me-2"></i>
                {!sidebarCollapsed && 'Dashboard'}
              </NavLink>

              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `nav-link text-white py-3 px-3 ${isNavActive('/admin/users') ? 'active bg-primary' : ''}`
                }
              >
                <i className="bi bi-people me-2"></i>
                {!sidebarCollapsed && 'Users'}
              </NavLink>

              <NavLink
                to="/admin/items"
                className={({ isActive }) =>
                  `nav-link text-white py-3 px-3 ${isNavActive('/admin/items') ? 'active bg-primary' : ''}`
                }
              >
                <i className="bi bi-box-seam me-2"></i>
                {!sidebarCollapsed && 'Inventory'}
              </NavLink>

              <NavLink
                to="/admin/loans"
                className={({ isActive }) =>
                  `nav-link text-white py-3 px-3 ${isNavActive('/admin/loans') ? 'active bg-primary' : ''}`
                }
              >
                <i className="bi bi-clipboard-check me-2"></i>
                {!sidebarCollapsed && 'Loans'}
              </NavLink>

              <NavLink
                to="/admin/reservations"
                className={({ isActive }) =>
                  `nav-link text-white py-3 px-3 ${isNavActive('/admin/reservations') ? 'active bg-primary' : ''}`
                }
              >
                <i className="bi bi-calendar-check me-2"></i>
                {!sidebarCollapsed && 'Reservations'}
              </NavLink>

              <NavLink
                to="/admin/tickets"
                className={({ isActive }) =>
                  `nav-link text-white py-3 px-3 ${isNavActive('/admin/tickets') ? 'active bg-primary' : ''}`
                }
              >
                <i className="bi bi-tools me-2"></i>
                {!sidebarCollapsed && 'Tickets'}
              </NavLink>

              {/* Divider */}
              <hr className="text-white-50 my-2" />

              <NavLink
                to="/admin/reports"
                className={({ isActive }) =>
                  `nav-link text-white py-3 px-3 ${isNavActive('/admin/reports') ? 'active bg-primary' : ''}`
                }
              >
                <i className="bi bi-bar-chart me-2"></i>
                {!sidebarCollapsed && 'Reports'}
              </NavLink>

              <NavLink
                to="/admin/settings"
                className={({ isActive }) =>
                  `nav-link text-white py-3 px-3 ${isNavActive('/admin/settings') ? 'active bg-primary' : ''}`
                }
              >
                <i className="bi bi-gear me-2"></i>
                {!sidebarCollapsed && 'Settings'}
              </NavLink>
            </nav>

            {/* Bottom Section */}
            <div className="mt-auto border-top pt-2 text-white-50 px-3">
              {!sidebarCollapsed && (
                <div className="small">
                  Logged in as: <span className="text-white">{user?.first_name} {user?.last_name}</span>
                </div>
              )}
              <div className="d-flex mt-2">
                <NavLink to="/" className="text-decoration-none text-white-50 small">
                  <i className="bi bi-house-door me-2"></i>
                  {!sidebarCollapsed && 'Back to Home'}
                </NavLink>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className={`col-md-${sidebarCollapsed ? '11' : '9'} col-xl-${sidebarCollapsed ? '11' : '10'} ms-auto px-md-4 py-4`}>
          <Outlet />
        </main>
      </div>

      {/* Admin Layout Styles */}
      <style jsx>{`
        .admin-sidebar {
          transition: all 0.3s ease;
          min-height: 100vh;
        }
        .admin-sidebar.collapsed {
          width: 60px;
          min-width: 60px;
        }
        .admin-sidebar .nav-link {
          border-radius: 0.25rem;
          margin-bottom: 0.25rem;
          transition: all 0.2s ease;
        }
        .admin-sidebar .nav-link:hover {
          background-color: rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;