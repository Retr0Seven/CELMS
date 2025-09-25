const express = require('express');
const router = express.Router();
const { auth, isAdminOrTech } = require('../middleware/auth');
const db = require('../db');

/**
 * @route   GET api/loans
 * @desc    Get all loans or user's loans
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    let result;

    // If admin or technician, get all loans from the view
    if (req.user.role === 'admin' || req.user.role === 'technician') {
      result = await db.query(`
        SELECT * FROM v_loans_with_status 
        ORDER BY checkout_at DESC
      `);
    } else {
      // Regular users can only see their own loans
      result = await db.query(`
        SELECT * FROM v_loans_with_status
        WHERE user_id = $1
        ORDER BY checkout_at DESC
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
 * @route   GET api/loans/:id
 * @desc    Get loan by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    let query;
    let params;
    
    // Admin/tech can see any loan details
    if (req.user.role === 'admin' || req.user.role === 'technician') {
      query = `SELECT * FROM v_loans_with_status WHERE loan_id = $1`;
      params = [req.params.id];
    } else {
      // Users can only see their own loans
      query = `SELECT * FROM v_loans_with_status WHERE loan_id = $1 AND user_id = $2`;
      params = [req.params.id, req.user.id];
    }
    
    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Loan not found or access denied' });
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
 * @route   POST api/loans/from-reservation
 * @desc    Create a loan from a reservation using fn_checkout_from_reservation function
 * @access  Private/Admin,Technician
 */
router.post('/from-reservation', auth, isAdminOrTech, async (req, res) => {
  try {
    const { reservation_id } = req.body;
    
    if (!reservation_id) {
      return res.status(400).json({ message: 'reservation_id is required' });
    }
    
    // Call the database function to create loan from reservation
    const result = await db.query(
      `SELECT fn_checkout_from_reservation($1, $2) AS loan_id`,
      [req.user.id, reservation_id]
    );
    
    const loanId = result.rows[0].loan_id;
    
    // Fetch the created loan with detailed info
    const loanResult = await db.query(
      `SELECT * FROM v_loans_with_status WHERE loan_id = $1`,
      [loanId]
    );
    
    res.status(201).json(loanResult.rows[0]);
  } catch (err) {
    console.error('Loan creation error:', err.message);
    
    // Handle specific errors
    if (err.message.includes('Item is currently checked out')) {
      return res.status(409).json({ 
        code: 'ITEM_UNAVAILABLE',
        message: 'Item is currently checked out' 
      });
    }
    
    if (err.message.includes('Item not available')) {
      return res.status(409).json({ 
        code: 'ITEM_UNAVAILABLE',
        message: 'Item is not available for checkout'
      });
    }
    
    if (err.message.includes('Reservation') && err.message.includes('not approved')) {
      return res.status(400).json({ message: 'Reservation is not in approved state' });
    }
    
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

/**
 * @route   POST api/loans/adhoc
 * @desc    Create an ad-hoc loan using fn_checkout_adhoc function
 * @access  Private/Admin,Technician
 */
router.post('/adhoc', auth, isAdminOrTech, async (req, res) => {
  try {
    const { borrower_user_id, item_id } = req.body;
    
    if (!borrower_user_id || !item_id) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['borrower_user_id', 'item_id']
      });
    }
    
    // Call the database function to create an ad-hoc loan
    const result = await db.query(
      `SELECT fn_checkout_adhoc($1, $2, $3) AS loan_id`,
      [req.user.id, borrower_user_id, item_id]
    );
    
    const loanId = result.rows[0].loan_id;
    
    // Fetch the created loan with detailed info
    const loanResult = await db.query(
      `SELECT * FROM v_loans_with_status WHERE loan_id = $1`,
      [loanId]
    );
    
    res.status(201).json(loanResult.rows[0]);
  } catch (err) {
    console.error('Ad-hoc loan creation error:', err.message);
    
    // Handle specific errors
    if (err.message.includes('Item is currently checked out')) {
      return res.status(409).json({ 
        code: 'ITEM_UNAVAILABLE',
        message: 'Item is currently checked out' 
      });
    }
    
    if (err.message.includes('Item not available')) {
      return res.status(409).json({ 
        code: 'ITEM_UNAVAILABLE',
        message: 'Item is not available for checkout'
      });
    }
    
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

/**
 * @route   POST api/loans/:id/return
 * @desc    Return a loan using fn_return_loan function
 * @access  Private - Admin/Tech or the borrower
 */
router.post('/:id/return', auth, async (req, res) => {
  try {
    const { damaged, condition } = req.body;
    const loanId = req.params.id;
    
    // Check if user has permission to return this loan
    let canReturn = false;
    
    // Admin or tech can return any loan
    if (req.user.role === 'admin' || req.user.role === 'technician') {
      canReturn = true;
    } else {
      // Regular users can only return their own loans
      const loanCheck = await db.query(
        'SELECT 1 FROM loans WHERE loan_id = $1 AND user_id = $2',
        [loanId, req.user.id]
      );
      canReturn = loanCheck.rows.length > 0;
    }
    
    if (!canReturn) {
      return res.status(403).json({ message: 'Not authorized to return this loan' });
    }
    
    // Call the database function to return the loan
    await db.query(
      `SELECT fn_return_loan($1, $2, $3, $4)`,
      [req.user.id, loanId, damaged || false, condition || null]
    );
    
    // Fetch the updated loan
    const result = await db.query(
      `SELECT * FROM v_loans_with_status WHERE loan_id = $1`,
      [loanId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Loan not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Loan return error:', err.message);
    
    // Handle specific errors
    if (err.message.includes('Loan already returned')) {
      return res.status(400).json({ message: 'This item has already been returned' });
    }
    
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

module.exports = router;