const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const db = require('../db');
const { auth } = require('../middleware/auth');

// Use environment JWT secret or fallback to development secret
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-for-testing-only-not-for-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Registration removed - users are predefined in the database

/**
 * @route   POST api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail().normalizeEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        error: 'Validation Error',
        message: 'Please check your input',
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    try {
      // Get user from database - now using plain password field
      const result = await db.query(
        'SELECT user_id, first_name, last_name, email, role, password, phone FROM users WHERE email = $1', 
        [email]
      );

      if (result.rows.length === 0) {
        // Use consistent "Invalid credentials" message to not leak user existence
        return res.status(401).json({ 
          success: false,
          error: 'Unauthorized',
          message: 'Invalid credentials'
        });
      }

      const user = result.rows[0];
      
      // Simple direct password comparison
      const isMatch = password === user.password;
      
      if (!isMatch) {
        return res.status(401).json({ 
          success: false,
          error: 'Unauthorized',
          message: 'Invalid credentials'
        });
      }

      // Create JWT payload with user_id and role
      const payload = {
        user: {
          id: user.user_id,
          role: user.role,
          email: user.email
        }
      };

      // Get technician information if applicable
      let techInfo = {};
      if (user.role === 'technician') {
        const techResult = await db.query(
          'SELECT specialization, notes FROM technicians WHERE technician_id = $1',
          [user.user_id]
        );
        
        if (techResult.rows.length > 0) {
          techInfo = techResult.rows[0];
        }
      }

      // Update last_login timestamp
      await db.query(
        'UPDATE users SET last_login = NOW() WHERE user_id = $1',
        [user.user_id]
      ).catch(err => console.error('Failed to update last login timestamp:', err));

      // Log login activity
      await db.query(
        'INSERT INTO user_activity_log (user_id, activity, ip_address) VALUES ($1, $2, $3)',
        [user.user_id, 'login', req.ip]
      ).catch(err => console.error('Failed to log login activity:', err));

      // Sign and return JWT token
      jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN },
        (err, token) => {
          if (err) {
            console.error('JWT Sign error:', err);
            return res.status(500).json({
              success: false,
              error: 'Server Error',
              message: 'Could not generate authentication token'
            });
          }
          
          // Return user info without password
          delete user.password;
          
          res.json({ 
            success: true,
            token, 
            user: {
              user_id: user.user_id,
              role: user.role,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
              phone: user.phone,
              ...techInfo
            }
          });
        }
      );
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Server error during login'
      });
    }
  }
);

/**
 * @route   GET api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', auth, async (req, res) => {
  try {
    // Get basic user info
    const result = await db.query(
      'SELECT user_id, role, first_name, last_name, email, phone, created_at FROM users WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Not Found',
        message: 'User not found' 
      });
    }

    const user = result.rows[0];

    // Get additional data based on role
    if (user.role === 'technician') {
      const techResult = await db.query(
        'SELECT specialization, notes FROM technicians WHERE technician_id = $1',
        [req.user.id]
      );
      
      if (techResult.rows.length > 0) {
        Object.assign(user, techResult.rows[0]);
      }
    }

    // Get user's activity stats
    const statsQuery = await db.query(
      `SELECT 
        (SELECT COUNT(*) FROM loans WHERE user_id = $1) AS total_loans,
        (SELECT COUNT(*) FROM loans WHERE user_id = $1 AND return_at IS NULL) AS active_loans,
        (SELECT COUNT(*) FROM reservations WHERE user_id = $1) AS total_reservations,
        (SELECT COUNT(*) FROM maintenance_tickets WHERE opened_by = $1) AS tickets_submitted
      `,
      [req.user.id]
    );

    // Log activity
    await db.query(
      'INSERT INTO user_activity_log (user_id, activity, ip_address) VALUES ($1, $2, $3)',
      [req.user.id, 'profile_access', req.ip]
    ).catch(err => console.error('Failed to log profile activity:', err));

    res.json({
      success: true,
      user,
      stats: statsQuery.rows[0]
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Error retrieving user profile'
    });
  }
});

module.exports = router;