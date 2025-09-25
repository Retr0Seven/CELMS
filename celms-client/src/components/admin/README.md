# Admin Area Documentation

This document provides information about the Admin Area of the CELMS (Computer Equipment Loan Management System) application.

## Overview

The Admin Area is a restricted section of the application that provides administrative functions for managing users, inventory, loans, reservations, and system settings. Access to this section is limited to users with the "admin" role.

## Features

### User Management

- View all users in the system
- Add new users
- Edit user details and roles
- Deactivate/activate user accounts
- Delete user accounts

### Dashboard

The admin dashboard provides a quick overview of system status and key metrics:

- User statistics
- Inventory status
- Active loans and pending reservations
- Open tickets
- Recent system activity

### Access Control

The Admin Area is protected with role-based access control. Only users with the "admin" role can access these features.

## Implementation Details

### Routes Structure

Admin routes are organized in a nested structure under `/admin`:

- `/admin` - Dashboard (main admin landing page)
- `/admin/users` - User management
- `/admin/items` - Inventory management
- `/admin/loans` - Loan management
- `/admin/reservations` - Reservation management
- `/admin/tickets` - Ticket management
- `/admin/reports` - Reporting
- `/admin/settings` - System settings

### Components

- `AdminLayout.js` - Provides the consistent layout for all admin pages
- `DashboardPage.js` - Main admin dashboard with statistics
- `UsersPage.js` - User management interface

### Access Control Implementation

Access to admin routes is controlled through the `ProtectedRoute` component which checks if the current user has the required role.

## Development Notes

### Testing with Mock Data

For development and testing purposes, mock data is available through the `mockAdminData.js` utility:

```javascript
// Import at the top of your component or test file
import setupMockAdminData from '../utils/mockAdminData';

// Call this function to set up mock API responses
setupMockAdminData();
```

### Styling

Admin-specific styles are defined in `App.css` including:

- Sidebar navigation
- Dashboard cards
- Color-coded borders and indicators

## Best Practices

When extending or modifying the Admin Area, please follow these guidelines:

1. Maintain consistent styling with the existing admin components
2. Follow the role-based access control pattern for any new features
3. Use the established API service patterns in `api.js`
4. Keep error handling consistent with the rest of the application