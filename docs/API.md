# CELMS API Documentation

## Base URL

```
http://localhost:3001/api
```

## Authentication

Most endpoints require authentication using a JSON Web Token (JWT).

Include the token in the request header:

```
x-auth-token: <your_jwt_token>
```

### Auth Endpoints

#### Login

```
POST /auth/login
```

Request body:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 1,
    "role": "admin",
    "first_name": "Admin",
    "last_name": "User",
    "email": "admin@example.com"
  }
}
```

#### Get Current User

```
GET /auth/me
```

Response:

```json
{
  "success": true,
  "user": {
    "user_id": 1,
    "role": "admin",
    "first_name": "Admin",
    "last_name": "User",
    "email": "admin@example.com",
    "created_at": "2023-01-01T00:00:00.000Z"
  },
  "stats": {
    "total_loans": 5,
    "active_loans": 2,
    "total_reservations": 8,
    "tickets_submitted": 3
  }
}
```

## Items

### Get All Items

```
GET /items
```

Query parameters:

- `status`: Filter by status ("available", "in_use", "maintenance", "reserved")
- `category`: Filter by category ID
- `search`: Search in name and description

Response:

```json
{
  "success": true,
  "items": [
    {
      "item_id": 1,
      "name": "Laptop Dell XPS 13",
      "description": "High-performance laptop",
      "status": "available",
      "category_id": 1,
      "category_name": "Computers",
      "barcode": "ITEM001"
    }
  ]
}
```

### Get Item by ID

```
GET /items/:id
```

Response:

```json
{
  "success": true,
  "item": {
    "item_id": 1,
    "name": "Laptop Dell XPS 13",
    "description": "High-performance laptop",
    "status": "available",
    "category_id": 1,
    "category_name": "Computers",
    "barcode": "ITEM001",
    "created_at": "2023-01-01T00:00:00.000Z",
    "updated_at": "2023-01-01T00:00:00.000Z"
  }
}
```

### Create Item (Admin only)

```
POST /items
```

Request body:

```json
{
  "name": "Laptop Dell XPS 15",
  "description": "High-performance laptop",
  "category_id": 1,
  "barcode": "ITEM002"
}
```

### Update Item (Admin only)

```
PUT /items/:id
```

Request body:

```json
{
  "name": "Laptop Dell XPS 15 (Updated)",
  "description": "High-performance laptop with 32GB RAM",
  "status": "maintenance"
}
```

### Delete Item (Admin only)

```
DELETE /items/:id
```

## Loans

### Get User Loans

```
GET /loans
```

Query parameters:

- `status`: Filter by status ("active", "returned", "overdue")

Response:

```json
{
  "success": true,
  "loans": [
    {
      "loan_id": 1,
      "user_id": 1,
      "item_id": 1,
      "item_name": "Laptop Dell XPS 13",
      "checkout_date": "2023-01-01T00:00:00.000Z",
      "due_date": "2023-01-08T00:00:00.000Z",
      "return_date": null,
      "status": "active"
    }
  ]
}
```

### Create Loan

```
POST /loans
```

Request body:

```json
{
  "item_id": 1,
  "due_date": "2023-01-15T00:00:00.000Z"
}
```

### Return Item

```
PATCH /loans/:id/return
```

## Reservations

### Get User Reservations

```
GET /reservations
```

Query parameters:

- `status`: Filter by status ("pending", "approved", "denied", "cancelled", "expired")

Response:

```json
{
  "success": true,
  "reservations": [
    {
      "reservation_id": 1,
      "user_id": 1,
      "item_id": 1,
      "item_name": "Laptop Dell XPS 13",
      "start_date": "2023-01-15T00:00:00.000Z",
      "end_date": "2023-01-22T00:00:00.000Z",
      "status": "pending",
      "created_at": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

### Create Reservation

```
POST /reservations
```

Request body:

```json
{
  "item_id": 1,
  "start_date": "2023-01-15T00:00:00.000Z",
  "end_date": "2023-01-22T00:00:00.000Z"
}
```

### Update Reservation Status (Admin/Staff only)

```
PATCH /reservations/:id/status
```

Request body:

```json
{
  "status": "approved",
  "notes": "Approved for academic project"
}
```

## Tickets

### Get Tickets

```
GET /tickets
```

Query parameters:

- `status`: Filter by status ("open", "in_progress", "resolved", "closed")
- `assigned_to`: Filter by technician ID

Response:

```json
{
  "success": true,
  "tickets": [
    {
      "ticket_id": 1,
      "item_id": 1,
      "item_name": "Laptop Dell XPS 13",
      "opened_by": 1,
      "user_name": "John Doe",
      "assigned_to": 3,
      "technician_name": "Tech Support",
      "status": "open",
      "description": "Screen flickering",
      "created_at": "2023-01-01T00:00:00.000Z",
      "updated_at": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

### Create Ticket

```
POST /tickets
```

Request body:

```json
{
  "item_id": 1,
  "description": "Screen flickering when on battery power"
}
```

### Update Ticket (Admin/Technician only)

```
PATCH /tickets/:id
```

Request body:

```json
{
  "status": "in_progress",
  "assigned_to": 3,
  "notes": "Ordered replacement screen"
}
```

## Users (Admin only)

### Get All Users

```
GET /users
```

Query parameters:

- `role`: Filter by role ("admin", "staff", "student", "technician")

### Create User

```
POST /users
```

Request body:

```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "password": "password123",
  "role": "student"
}
```

### Update User

```
PUT /users/:id
```

### Delete User

```
DELETE /users/:id
```

## Error Responses

Error responses follow this format:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Descriptive error message",
  "details": {} // Optional additional error details
}
```

Common HTTP status codes:

- 400: Bad Request (invalid input)
- 401: Unauthorized (authentication required)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict
- 500: Server Error
