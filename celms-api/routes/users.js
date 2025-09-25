const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const db = require('../db');

/**
 * @route   GET api/users
 * @desc    Get all users
 * @access  Private/Admin
 */
router.get('/', auth, checkRole(['admin', 'technician']), async (req, res) => {
  try {
    // Optional query parameters for filtering
    const { role, search } = req.query;
    
    let query = 'SELECT user_id, first_name, last_name, email, role, phone, created_at FROM users';
    const params = [];
    
    // Apply filters if provided
    const filters = [];
    if (role) {
      params.push(role);
      filters.push(`role = $${params.length}`);
    }
    
    if (search) {
      params.push(`%${search}%`);
      filters.push(`(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    
    if (filters.length > 0) {
      query += ' WHERE ' + filters.join(' AND ');
    }
    
    query += ' ORDER BY last_name, first_name';
    
    const result = await db.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      users: result.rows
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
    });
  }
});

/**
 * @route   GET api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    // Users can only view their own profile unless they're an admin or technician
    if (req.user.id !== req.params.id && !['admin', 'technician'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden', 
        message: 'You are not authorized to view this user profile' 
      });
    }

    // Validate UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        error: 'Bad Request',
        message: 'Invalid user ID format' 
      });
    }

    const result = await db.query(
      'SELECT user_id, first_name, last_name, email, role, phone, created_at FROM users WHERE user_id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Not Found',
        message: 'User not found' 
      });
    }

    // Get additional technician info if applicable
    let userData = result.rows[0];
    if (userData.role === 'technician') {
      const techResult = await db.query(
        'SELECT specialization, notes FROM technicians WHERE technician_id = $1',
        [req.params.id]
      );
      
      if (techResult.rows.length > 0) {
        userData = { ...userData, ...techResult.rows[0] };
      }
    }

    res.json({
      success: true,
      user: userData
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to retrieve user information'
    });
  }
});

/**
 * @route   PUT api/users/:id
 * @desc    Update user
 * @access  Private
 */
router.put('/:id', auth, async (req, res) => {
  try {
    // Users can only update their own profile unless they're an admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Forbidden', 
        message: 'You are not authorized to update this user profile' 
      });
    }

    // Validate UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        error: 'Bad Request',
        message: 'Invalid user ID format' 
      });
    }

    // Extract and validate the fields
    const { first_name, last_name, phone, email } = req.body;
    
    if (!first_name || !last_name) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'First name and last name are required'
      });
    }
    
    // Start transaction for data consistency
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Check if user exists
      const userCheck = await client.query(
        'SELECT user_id, role FROM users WHERE user_id = $1',
        [req.params.id]
      );
      
      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'User not found'
        });
      }
      
      const user = userCheck.rows[0];
      let updateFields = ['first_name = $1', 'last_name = $2', 'phone = $3'];
      let params = [first_name, last_name, phone];
      let paramIndex = 4;
      
      // Admin can update email and role
      if (req.user.role === 'admin') {
        if (email) {
          updateFields.push(`email = $${paramIndex}`);
          params.push(email);
          paramIndex++;
        }
        
        // Update role if provided and admin is updating another user (not themselves)
        const { role } = req.body;
        if (role && req.user.id !== req.params.id) {
          if (!['student', 'staff', 'technician', 'admin'].includes(role)) {
            await client.query('ROLLBACK');
            return res.status(400).json({
              success: false,
              error: 'Bad Request',
              message: 'Invalid role provided'
            });
          }
          
          updateFields.push(`role = $${paramIndex}`);
          params.push(role);
          paramIndex++;
          
          // Handle technician role changes
          if (role === 'technician' && user.role !== 'technician') {
            // Add technician record if becoming technician
            await client.query(
              'INSERT INTO technicians (technician_id) VALUES ($1) ON CONFLICT DO NOTHING',
              [req.params.id]
            );
          } else if (role !== 'technician' && user.role === 'technician') {
            // Remove technician record if no longer technician
            await client.query(
              'DELETE FROM technicians WHERE technician_id = $1',
              [req.params.id]
            );
          }
        }
      }
      
      params.push(req.params.id);
      
      // Update user
      const result = await client.query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex} 
         RETURNING user_id, first_name, last_name, email, role, phone, created_at`,
        params
      );
      
      // Update technician-specific fields if applicable
      if (user.role === 'technician' || result.rows[0].role === 'technician') {
        const { specialization, notes } = req.body;
        
        if (specialization !== undefined || notes !== undefined) {
          await client.query(
            `INSERT INTO technicians (technician_id, specialization, notes) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (technician_id) DO UPDATE 
             SET specialization = EXCLUDED.specialization, notes = EXCLUDED.notes`,
            [req.params.id, specialization || null, notes || null]
          );
        }
        
        // Get updated technician data
        const techResult = await client.query(
          'SELECT specialization, notes FROM technicians WHERE technician_id = $1',
          [req.params.id]
        );
        
        if (techResult.rows.length > 0) {
          Object.assign(result.rows[0], techResult.rows[0]);
        }
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'User updated successfully',
        user: result.rows[0]
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('Error updating user:', err);
    
    // Handle constraint violations
    if (err.code === '23505') { // unique_violation
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'Email address is already in use'
      });
    }
    
    // Handle check constraints
    if (err.code === '23514') { // check_violation
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid data provided. Please check email format and role values.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to update user'
    });
  }
});

/**
 * @route   DELETE api/users/:id
 * @desc    Delete user
 * @access  Private/Admin
 */
router.delete('/:id', auth, checkRole(['admin']), async (req, res) => {
  try {
    // Don't allow admin to delete themselves
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Administrators cannot delete their own account'
      });
    }
    
    // Validate UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        error: 'Bad Request',
        message: 'Invalid user ID format' 
      });
    }
    
    // Start a transaction
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Check if user has any active loans or reservations
      const activeCheck = await client.query(
        `SELECT 
          (SELECT COUNT(*) FROM loans WHERE borrower_user_id = $1 AND return_date IS NULL) as active_loans,
          (SELECT COUNT(*) FROM reservations WHERE borrower_user_id = $1 AND status = 'approved') as active_reservations`,
        [req.params.id]
      );
      
      const { active_loans, active_reservations } = activeCheck.rows[0];
      
      if (parseInt(active_loans) > 0 || parseInt(active_reservations) > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          error: 'Conflict',
          message: 'User cannot be deleted because they have active loans or reservations',
          details: { active_loans, active_reservations }
        });
      }
      
      // Check if user is the last admin
      const adminCheck = await client.query(
        "SELECT COUNT(*) FROM users WHERE role = 'admin'",
      );
      
      const isLastAdmin = parseInt(adminCheck.rows[0].count) <= 1;
      
      // Check if we're trying to delete the last admin
      if (isLastAdmin) {
        const userCheck = await client.query(
          "SELECT role FROM users WHERE user_id = $1 AND role = 'admin'",
          [req.params.id]
        );
        
        if (userCheck.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({
            success: false,
            error: 'Conflict',
            message: 'Cannot delete the last administrator account'
          });
        }
      }
      
      // Delete the user - cascade will handle related records
      const result = await client.query(
        'DELETE FROM users WHERE user_id = $1 RETURNING user_id, email, role',
        [req.params.id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'User not found'
        });
      }
      
      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'User successfully removed',
        user: {
          id: result.rows[0].user_id,
          email: result.rows[0].email,
          role: result.rows[0].role
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error deleting user:', err);
    
    // Handle foreign key violations
    if (err.code === '23503') { // foreign_key_violation
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'Cannot delete user because they have related records in the system'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to delete user'
    });
  }
});

/**
 * @route   PATCH api/users/:id/role
 * @desc    Update user role (admin only)
 * @access  Private/Admin
 */
router.patch('/:id/role', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { role } = req.body;
    
    // Validate role
    if (!role || !['student', 'staff', 'technician', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Valid role is required (student, staff, technician, or admin)'
      });
    }
    
    // Don't allow admins to demote themselves
    if (req.user.id === req.params.id && role !== 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Administrators cannot demote their own account'
      });
    }
    
    // Validate UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        error: 'Bad Request',
        message: 'Invalid user ID format' 
      });
    }
    
    // Start transaction
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Check if user exists and get current role
      const userCheck = await client.query(
        'SELECT user_id, role FROM users WHERE user_id = $1',
        [req.params.id]
      );
      
      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'User not found'
        });
      }
      
      const currentRole = userCheck.rows[0].role;
      
      // Check if this is the last admin
      if (currentRole === 'admin' && role !== 'admin') {
        const adminCount = await client.query(
          "SELECT COUNT(*) FROM users WHERE role = 'admin'"
        );
        
        if (parseInt(adminCount.rows[0].count) <= 1) {
          await client.query('ROLLBACK');
          return res.status(409).json({
            success: false,
            error: 'Conflict',
            message: 'Cannot demote the last administrator account'
          });
        }
      }
      
      // Update user role
      const result = await client.query(
        'UPDATE users SET role = $1 WHERE user_id = $2 RETURNING user_id, first_name, last_name, email, role',
        [role, req.params.id]
      );
      
      // Handle technician role
      if (role === 'technician' && currentRole !== 'technician') {
        // Add to technicians table
        await client.query(
          'INSERT INTO technicians (technician_id) VALUES ($1) ON CONFLICT DO NOTHING',
          [req.params.id]
        );
      } else if (role !== 'technician' && currentRole === 'technician') {
        // Remove from technicians table
        await client.query(
          'DELETE FROM technicians WHERE technician_id = $1',
          [req.params.id]
        );
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: `User role updated from ${currentRole} to ${role}`,
        user: result.rows[0]
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to update user role'
    });
  }
});

/**
 * @route   POST api/users/:id/reset-password
 * @desc    Reset user password (admin only)
 * @access  Private/Admin
 */
router.post('/:id/reset-password', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'New password must be at least 6 characters long'
      });
    }
    
    // Validate UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(req.params.id)) {
      return res.status(400).json({ 
        success: false,
        error: 'Bad Request',
        message: 'Invalid user ID format' 
      });
    }
    
    // Get bcrypt for password hashing
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);
    
    // Update user password
    const result = await db.query(
      'UPDATE users SET password_hash = $1 WHERE user_id = $2 RETURNING user_id, email',
      [password_hash, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Password has been reset successfully',
      user: {
        id: result.rows[0].user_id,
        email: result.rows[0].email
      }
    });
    
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Failed to reset password'
    });
  }
});

module.exports = router;