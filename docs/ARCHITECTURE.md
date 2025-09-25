# CELMS Architecture

## Overview

CELMS follows a modern full-stack architecture with a clear separation of concerns between frontend and backend components. This document outlines the system architecture, data flow, and component interaction.

## System Architecture

![System Architecture](../screenshots/architecture.png)

### Client-side Architecture

The frontend is built with React and follows a component-based architecture:

- **Components**: Reusable UI elements
- **Pages**: Screen-level components combining multiple components
- **Contexts**: Global state management (UserContext, NotificationContext)
- **Services**: API communication layer
- **Hooks**: Custom hooks for shared logic (useApiOperation)

### Server-side Architecture

The backend follows a RESTful API design using Express.js:

- **Routes**: Define API endpoints and HTTP methods
- **Controllers**: Handle business logic and request processing
- **Middleware**: Authentication, error handling, logging
- **Database**: PostgreSQL with direct query execution
- **Services**: Shared utilities and business logic

## Database Schema

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Users    │     │    Items    │     │  Categories │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ user_id     │     │ item_id     │     │ category_id │
│ first_name  │     │ name        │     │ name        │
│ last_name   │     │ description │     │ description │
│ email       │     │ category_id │     └─────────────┘
│ password    │     │ status      │     
│ role        │     │ barcode     │     ┌─────────────┐
└─────────────┘     └─────────────┘     │ Technicians │
      │                   │             ├─────────────┤
      │                   │             │ tech_id     │
      │                   │             │ user_id     │
┌─────┴─────┐       ┌─────┴─────┐       │ specializ.  │
│   Loans   │       │Reservations│       └─────────────┘
├───────────┤       ├───────────┤              │
│ loan_id   │       │ res_id    │              │
│ user_id   │       │ user_id   │        ┌─────┴─────┐
│ item_id   │       │ item_id   │        │  Tickets  │
│ due_date  │       │ start_date│        ├───────────┤
│ return_date│       │ end_date  │        │ ticket_id │
└───────────┘       │ status    │        │ item_id   │
                   └───────────┘        │ opened_by  │
                                       │ assigned_to│
                                       │ status     │
                                       │ description│
                                       └───────────┘
```

## Authentication Flow

1. User submits login credentials
2. Server validates credentials against database
3. If valid, server generates JWT with user information
4. JWT is returned to client and stored in localStorage
5. Client includes JWT in Authorization header for authenticated requests
6. Server middleware verifies JWT for protected routes

## Request Flow

1. User interaction triggers API request
2. React component calls API service function
3. API service adds authentication headers and makes fetch request
4. Express router receives request
5. Authentication middleware validates JWT
6. Route handler processes request
7. Database query is executed
8. Response is formatted and returned
9. API service receives and parses response
10. React component updates UI with response data

## Error Handling

- Client-side errors are caught and displayed via Notification Context
- Server-side errors return appropriate HTTP status codes with error messages
- Global error handling middleware catches unhandled exceptions
- Custom error types for different scenarios (Authentication, Validation, etc.)

## Performance Considerations

- API responses are kept minimal to reduce payload size
- Frontend uses React's virtual DOM for efficient rendering
- Database queries are optimized with indexes
- Authentication tokens have expiration to maintain security