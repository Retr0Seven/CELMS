# CELMS User Guide

## Introduction

This guide provides instructions for using the Campus Equipment Loan Management System (CELMS) based on your user role. CELMS allows users to browse available equipment, make loan requests, reserve items in advance, and submit maintenance tickets.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Student Guide](#student-guide)
3. [Staff Guide](#staff-guide)
4. [Technician Guide](#technician-guide)
5. [Administrator Guide](#administrator-guide)
6. [Common Tasks](#common-tasks)

## Getting Started

### Login

1. Access the CELMS application at http://localhost:3000
2. Click the "Login" button in the top right corner
3. Enter your email and password
4. Click "Log In"

![Login Screen](../screenshots/login.png)

### Navigation

The main navigation bar provides access to different sections based on your role:

- **Home**: Dashboard with summary information
- **Items**: Browse and search for equipment
- **Loans**: View your current and past loans
- **Reservations**: View and manage your reservations
- **Tickets**: Report and track maintenance issues
- **Admin**: (Admin-only) System administration

## Student Guide

As a student, you can borrow equipment, make reservations, and report issues.

### Borrowing Equipment

1. Go to the **Items** section
2. Browse or search for available equipment
3. Click on an item to view details
4. Click "Borrow Now" to create a loan request
5. Confirm the due date
6. Submit the loan request

### Making Reservations

1. Go to the **Items** section
2. Browse or search for equipment
3. Click on an item to view details
4. Click "Reserve" to create a reservation
5. Select your desired start and end dates
6. Submit the reservation request

### Reporting Issues

1. Go to the **Tickets** section
2. Click "New Ticket"
3. Select the problematic equipment
4. Describe the issue in detail
5. Submit the ticket

## Staff Guide

Staff members can perform all student actions plus approve reservations and manage loans.

### Approving Reservations

1. Go to the **Reservations** section
2. Filter for "Pending" reservations
3. Review the reservation details
4. Click "Approve" or "Deny"
5. Add any notes if needed

### Managing Loans

1. Go to the **Loans** section
2. View all active loans
3. Process returns by clicking "Mark Returned"
4. Handle overdue loans by sending notifications

## Technician Guide

Technicians handle maintenance tickets and equipment repairs.

### Managing Tickets

1. Go to the **Tickets** section
2. View all assigned tickets
3. Update ticket status:
   - "In Progress": When you start working on the issue
   - "Resolved": When the issue is fixed
4. Add technical notes to document the repair process

### Updating Equipment Status

1. Go to the **Items** section
2. Find the equipment being repaired
3. Update its status to "Maintenance" or "Available"
4. Add any relevant notes about the repair

## Administrator Guide

Administrators have full system access and can manage users, equipment, and system settings.

### User Management

1. Go to the **Admin > Users** section
2. View, add, edit, or deactivate user accounts
3. Assign or change user roles

### Equipment Management

1. Go to the **Admin > Items** section
2. Add new equipment with all relevant details
3. Update existing equipment information
4. Remove equipment from the system

### System Reports

1. Go to the **Admin > Dashboard** section
2. View system statistics and reports
3. Monitor equipment utilization
4. Track overdue loans

## Common Tasks

### Changing Your Password

1. Click on your username in the top right corner
2. Select "Profile"
3. Click "Change Password"
4. Enter your current and new passwords
5. Click "Submit"

### Viewing Loan History

1. Go to the **Loans** section
2. Click the "History" tab
3. View details of your past loans

### Extending a Loan

1. Go to the **Loans** section
2. Find the loan you want to extend
3. Click "Request Extension"
4. Propose a new due date
5. Submit the request for approval

### Cancelling a Reservation

1. Go to the **Reservations** section
2. Find the reservation you want to cancel
3. Click "Cancel Reservation"
4. Confirm the cancellation
