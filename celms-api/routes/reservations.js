const express = require('express');
const router = express.Router();
const { auth, checkRole, isAdminOrTech } = require('../middleware/auth');
const db = require('../db');

/**
 * @route   GET api/reservations
 * @desc    Get all reservations or user's reservations
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    let result;

    // If admin or technician, use the admin view
    if (req.user.role === 'admin' || req.user.role === 'technician') {
      result = await db.query(`
        SELECT * FROM v_reservations_admin
        ORDER BY requested_at DESC
      `);
    } else {
      // Regular users can only see their own reservations
      result = await db.query(`
        SELECT * FROM reservations
        WHERE user_id = $1
        ORDER BY requested_at DESC
      `, [req.user.id]);
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

/**
 * @route   GET api/reservations/:id
 * @desc    Get reservation by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    let query;
    let params;
    
    // Admin/tech can see any reservation details
    if (req.user.role === 'admin' || req.user.role === 'technician') {
      query = `SELECT * FROM v_reservations_admin WHERE reservation_id = $1`;
      params = [req.params.id];
    } else {
      // Users can only see their own reservations
      query = `SELECT * FROM reservations WHERE reservation_id = $1 AND user_id = $2`;
      params = [req.params.id, req.user.id];
    }
    
    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reservation not found or access denied' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

/**
 * @route   POST api/reservations
 * @desc    Create a new reservation using fn_request_reservation function
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { item_id, start, end } = req.body;
    
    // Validate required fields
    if (!item_id || !start || !end) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['item_id', 'start', 'end']
      });
    }

    // Call the database function for reservation creation
    const result = await db.query(
      `SELECT fn_request_reservation($1, $2, $3, $4) AS reservation_id`,
      [req.user.id, item_id, start, end]
    );

    // Check for successful creation
    if (result.rows[0].reservation_id) {
      const reservationId = result.rows[0].reservation_id;
      
      // Fetch the created reservation
      const reservation = await db.query(
        'SELECT * FROM reservations WHERE reservation_id = $1',
        [reservationId]
      );
      
      return res.status(201).json(reservation.rows[0]);
    } else {
      return res.status(500).json({ message: 'Failed to create reservation' });
    }
  } catch (err) {
    console.error('Reservation creation error:', err.message);
    
    // Handle specific error codes
    if (err.message.includes('Overlap with existing reservation')) {
      return res.status(409).json({ 
        code: 'RESERVATION_OVERLAP',
        message: 'Item is already reserved during this period' 
      });
    }
    
    if (err.message.includes('Start must be before end')) {
      return res.status(400).json({ message: 'Start date must be before end date' });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

/**
 * @route   POST api/reservations/:id/approve
 * @desc    Approve a reservation using fn_approve_reservation function
 * @access  Private/Admin,Technician
 */
router.post('/:id/approve', auth, isAdminOrTech, async (req, res) => {
  try {
    const { reason } = req.body;
    const reservationId = req.params.id;
    
    // Call the database function to approve reservation
    await db.query(
      `SELECT fn_approve_reservation($1, $2, $3)`,
      [req.user.id, reservationId, reason || null]
    );
    
    // Fetch updated reservation
    const result = await db.query(
      `SELECT * FROM v_reservations_admin WHERE reservation_id = $1`,
      [reservationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Reservation approval error:', err.message);
    
    // Handle specific errors
    if (err.message.includes('Overlap with existing reservation')) {
      return res.status(409).json({ 
        code: 'RESERVATION_OVERLAP',
        message: 'Cannot approve: overlaps with an existing reservation' 
      });
    }
    
    if (err.message.includes('cannot be approved from status')) {
      return res.status(400).json({ message: 'Reservation cannot be approved in its current state' });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

/**
 * @route   POST api/reservations/:id/deny
 * @desc    Deny a reservation using fn_deny_reservation function
 * @access  Private/Admin,Technician
 */
router.post('/:id/deny', auth, isAdminOrTech, async (req, res) => {
  try {
    const { reason } = req.body;
    const reservationId = req.params.id;
    
    if (!reason) {
      return res.status(400).json({ message: 'Reason is required when denying a reservation' });
    }
    
    // Call the database function to deny reservation
    await db.query(
      `SELECT fn_deny_reservation($1, $2, $3)`,
      [req.user.id, reservationId, reason]
    );
    
    // Fetch updated reservation
    const result = await db.query(
      `SELECT * FROM v_reservations_admin WHERE reservation_id = $1`,
      [reservationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Reservation denial error:', err.message);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

/**
 * @route   POST api/reservations/:id/cancel
 * @desc    Cancel a reservation using fn_cancel_reservation function
 * @access  Private - Owner only as enforced by the function
 */
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const reservationId = req.params.id;
    
    // Call the database function to cancel reservation (user-owned only)
    await db.query(
      `SELECT fn_cancel_reservation($1, $2)`,
      [req.user.id, reservationId]
    );
    
    // Fetch the updated reservation
    const result = await db.query(
      `SELECT * FROM reservations WHERE reservation_id = $1`,
      [reservationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Reservation cancellation error:', err.message);
    
    // Handle specific errors
    if (err.message.includes('Only owner can cancel')) {
      return res.status(403).json({ message: 'Only the reservation owner can cancel it' });
    }
    
    if (err.message.includes('Cannot cancel after start')) {
      return res.status(400).json({ message: 'Cannot cancel a reservation that has already started' });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

module.exports = router;

module.exports = router;