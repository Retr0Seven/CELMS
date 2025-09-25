import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useApiOperation from '../../hooks/useApiOperation';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import EmptyState from '../common/EmptyState';
import { useConfirm } from '../common/ConfirmDialog';
import { useNotification } from '../../contexts/NotificationContext';

/**
 * AdminUserManagement component for managing users in admin interface
 */
const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: '',
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const { confirm, confirmDialog } = useConfirm();
  const notification = useNotification();

  // Fetch users with search and filters
  const {
    loading,
    error,
    execute: fetchUsers,
  } = useApiOperation(
    (page, filters) => api.users.getAll({
      page,
      limit: pagination.itemsPerPage,
      ...filters,
    }),
    {
      showSuccessToast: false,
      errorMessage: 'Failed to load users',
    }
  );

  // Update user status (enable/disable)
  const {
    loading: statusLoading,
    execute: updateUserStatus,
  } = useApiOperation(
    (userId, status) => api.users.update(userId, { status }),
    {
      successMessage: (data) => `User ${status === 'active' ? 'enabled' : 'disabled'} successfully`,
      errorMessage: 'Failed to update user status',
      onSuccess: () => fetchUsers(pagination.currentPage, filters),
    }
  );

  // Update user role
  const {
    loading: roleLoading,
    execute: updateUserRole,
  } = useApiOperation(
    (userId, role) => api.users.updateRole(userId, role),
    {
      successMessage: 'User role updated successfully',
      errorMessage: 'Failed to update user role',
      onSuccess: () => fetchUsers(pagination.currentPage, filters),
    }
  );

  // Delete user
  const {
    loading: deleteLoading,
    execute: deleteUser,
  } = useApiOperation(
    (userId) => api.users.delete(userId),
    {
      successMessage: 'User deleted successfully',
      errorMessage: 'Failed to delete user',
      onSuccess: () => fetchUsers(pagination.currentPage, filters),
    }
  );

  // Load users on component mount and when filters or pagination change
  useEffect(() => {
    fetchUsers(pagination.currentPage, filters).then(result => {
      if (result.success) {
        setUsers(result.data.users || []);
        setPagination(prev => ({
          ...prev,
          totalPages: result.data.totalPages || 1,
          totalItems: result.data.totalItems || 0,
        }));
      }
    });
  }, [fetchUsers, pagination.currentPage, filters]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle search input
  const handleSearch = (e) => {
    e.preventDefault();
    const searchValue = e.target.search.value;
    setFilters(prev => ({ ...prev, search: searchValue }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters({
      role: '',
      status: '',
      search: '',
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    document.getElementById('searchForm').reset();
  };

  // Handle page change
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  // Handle status toggle
  const handleStatusToggle = (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'enable' : 'disable';

    confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      message: `Are you sure you want to ${action} ${user.first_name} ${user.last_name}?`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      confirmButtonClass: newStatus === 'active' ? 'btn-success' : 'btn-warning',
      onConfirm: () => {
        updateUserStatus(user.id, newStatus);
      },
    });
  };

  // Handle role change
  const handleRoleChange = (user, newRole) => {
    if (newRole === user.role) return;

    confirm({
      title: 'Change User Role',
      message: `Are you sure you want to change ${user.first_name} ${user.last_name}'s role to ${newRole}?`,
      confirmText: 'Change Role',
      confirmButtonClass: 'btn-primary',
      onConfirm: () => {
        updateUserRole(user.id, newRole);
      },
    });
  };

  // Handle delete user
  const handleDeleteUser = (user) => {
    confirm({
      title: 'Delete User',
      message: (
        <div>
          <p>Are you sure you want to delete the following user?</p>
          <div className="alert alert-danger">
            <strong>{user.first_name} {user.last_name}</strong> ({user.email})
          </div>
          <p className="text-danger mb-0">
            <i className="bi bi-exclamation-triangle me-1"></i>
            This action cannot be undone.
          </p>
        </div>
      ),
      confirmText: 'Delete',
      confirmButtonClass: 'btn-danger',
      onConfirm: () => {
        deleteUser(user.id);
      },
    });
  };

  // Render loading state
  if (loading && !users.length) {
    return (
      <div className="card p-5">
        <LoadingSpinner message="Loading users..." />
      </div>
    );
  }

  // Render error state
  if (error && !users.length) {
    return (
      <div className="card p-4">
        <ErrorDisplay
          error={error}
          title="Error Loading Users"
          onRetry={() => fetchUsers(pagination.currentPage, filters)}
        />
      </div>
    );
  }

  return (
    <div className="card shadow-sm">
      {/* Card Header with Title and Add User Button */}
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">User Management</h5>
        <Link to="/admin/users/new" className="btn btn-primary btn-sm">
          <i className="bi bi-person-plus me-1"></i>
          Add New User
        </Link>
      </div>

      {/* Filters Section */}
      <div className="card-body border-bottom">
        <div className="row g-3 align-items-end">
          {/* Search */}
          <div className="col-md-4">
            <form id="searchForm" onSubmit={handleSearch}>
              <label htmlFor="search" className="form-label">Search Users</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name or email"
                  name="search"
                  defaultValue={filters.search}
                />
                <button className="btn btn-outline-primary" type="submit">
                  <i className="bi bi-search"></i>
                </button>
              </div>
            </form>
          </div>

          {/* Role Filter */}
          <div className="col-md-3">
            <label htmlFor="role" className="form-label">Role</label>
            <select
              id="role"
              name="role"
              className="form-select"
              value={filters.role}
              onChange={handleFilterChange}
            >
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="staff">Staff</option>
              <option value="technician">Technician</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="col-md-3">
            <label htmlFor="status" className="form-label">Status</label>
            <select
              id="status"
              name="status"
              className="form-select"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending Approval</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="col-md-2">
            <button
              className="btn btn-outline-secondary w-100"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* User List Section */}
      <div className="card-body p-0">
        {users.length === 0 ? (
          <EmptyState
            icon="people"
            message="No Users Found"
            description="No users match your search criteria."
            action={{
              text: 'Clear Filters',
              onClick: handleClearFilters,
            }}
            className="py-5"
          />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="avatar-circle me-2 bg-primary text-white">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div>
                          {user.first_name} {user.last_name}
                          <div className="small text-muted">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <div className="dropdown">
                        <button
                          className={`btn btn-sm ${user.role === 'admin' ? 'btn-danger' :
                              user.role === 'technician' ? 'btn-warning' :
                                user.role === 'staff' ? 'btn-info' :
                                  'btn-secondary'
                            } dropdown-toggle`}
                          type="button"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                          disabled={roleLoading}
                        >
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </button>
                        <ul className="dropdown-menu">
                          <li>
                            <button
                              className="dropdown-item"
                              onClick={() => handleRoleChange(user, 'student')}
                            >
                              Student
                            </button>
                          </li>
                          <li>
                            <button
                              className="dropdown-item"
                              onClick={() => handleRoleChange(user, 'staff')}
                            >
                              Staff
                            </button>
                          </li>
                          <li>
                            <button
                              className="dropdown-item"
                              onClick={() => handleRoleChange(user, 'technician')}
                            >
                              Technician
                            </button>
                          </li>
                          <li>
                            <button
                              className="dropdown-item"
                              onClick={() => handleRoleChange(user, 'admin')}
                            >
                              Administrator
                            </button>
                          </li>
                        </ul>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${user.status === 'active' ? 'bg-success' :
                          user.status === 'inactive' ? 'bg-danger' :
                            'bg-warning'
                        }`}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex justify-content-center">
                        <Link
                          to={`/admin/users/${user.id}`}
                          className="btn btn-sm btn-outline-primary me-2"
                          title="View Details"
                        >
                          <i className="bi bi-eye"></i>
                        </Link>
                        <button
                          className={`btn btn-sm ${user.status === 'active' ? 'btn-outline-danger' : 'btn-outline-success'
                            } me-2`}
                          onClick={() => handleStatusToggle(user)}
                          disabled={statusLoading}
                          title={user.status === 'active' ? 'Disable User' : 'Enable User'}
                        >
                          <i className={`bi bi-${user.status === 'active' ? 'person-x' : 'person-check'}`}></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteUser(user)}
                          disabled={deleteLoading}
                          title="Delete User"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="card-footer bg-white">
          <div className="d-flex justify-content-between align-items-center">
            <div className="small text-muted">
              Showing {users.length} of {pagination.totalItems} users
            </div>
            <nav aria-label="User pagination">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${pagination.currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.currentPage === 1}
                  >
                    <i className="bi bi-chevron-double-left"></i>
                  </button>
                </li>
                <li className={`page-item ${pagination.currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                </li>

                {/* Page Numbers */}
                {[...Array(pagination.totalPages)].map((_, index) => {
                  const page = index + 1;

                  // Display current page, and neighbors +/- 2
                  if (
                    page === 1 ||
                    page === pagination.totalPages ||
                    Math.abs(page - pagination.currentPage) <= 1
                  ) {
                    return (
                      <li key={page} className={`page-item ${pagination.currentPage === page ? 'active' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(page)}
                          disabled={pagination.currentPage === page}
                        >
                          {page}
                        </button>
                      </li>
                    );
                  }

                  // Display dots for skipped pages
                  if (page === 2 || page === pagination.totalPages - 1) {
                    return (
                      <li key={page} className="page-item disabled">
                        <button className="page-link">...</button>
                      </li>
                    );
                  }

                  return null;
                })}

                <li className={`page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </li>
                <li className={`page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.currentPage === pagination.totalPages}
                  >
                    <i className="bi bi-chevron-double-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog}
    </div>
  );
};

export default AdminUserManagement;