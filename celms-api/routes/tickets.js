const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const db = require('../db');

/**
 * @route   GET api/tickets
 * @desc    Get all maintenance tickets or user's tickets
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    let result;

    // If admin or technician, get all tickets
    // Otherwise, get only the user's tickets
    if (req.user.role === 'admin' || req.user.role === 'technician') {
      result = await db.query(`
        SELECT t.*, u.first_name as opener_first_name, u.last_name as opener_last_name,
               i.asset_tag, em.brand || ' ' || em.model_name as model_name,
               tech.first_name as tech_first_name, tech.last_name as tech_last_name
        FROM maintenance_tickets t
        JOIN users u ON t.opened_by = u.user_id
        JOIN equipment_items i ON t.item_id = i.item_id
        JOIN equipment_models em ON i.model_id = em.model_id
        LEFT JOIN users tech ON t.assigned_to = tech.user_id
        ORDER BY 
          CASE 
            WHEN t.status = 'open' THEN 0
            WHEN t.status = 'in_progress' THEN 1
            WHEN t.status = 'on_hold' THEN 2
            WHEN t.status = 'closed' THEN 3
          END,
          CASE 
            WHEN t.severity = 'critical' THEN 0
            WHEN t.severity = 'high' THEN 1
            WHEN t.severity = 'medium' THEN 2
            WHEN t.severity = 'low' THEN 3
          END,
          t.created_at DESC
      `);
    } else {
      result = await db.query(`
        SELECT t.*, u.first_name as opener_first_name, u.last_name as opener_last_name,
               i.asset_tag, em.brand || ' ' || em.model_name as model_name,
               tech.first_name as tech_first_name, tech.last_name as tech_last_name
        FROM maintenance_tickets t
        JOIN users u ON t.opened_by = u.user_id
        JOIN equipment_items i ON t.item_id = i.item_id
        JOIN equipment_models em ON i.model_id = em.model_id
        LEFT JOIN users tech ON t.assigned_to = tech.user_id
        WHERE t.opened_by = $1
        ORDER BY t.created_at DESC
      `, [req.user.id]);
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

/**
 * @route   GET api/tickets/:id
 * @desc    Get ticket by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*, u.first_name as opener_first_name, u.last_name as opener_last_name, u.email as opener_email,
             i.asset_tag, i.status as item_status, em.brand || ' ' || em.model_name as model_name,
             ec.name as category_name,
             tech.first_name as tech_first_name, tech.last_name as tech_last_name, tech.email as tech_email
      FROM maintenance_tickets t
      JOIN users u ON t.opened_by = u.user_id
      JOIN equipment_items i ON t.item_id = i.item_id
      JOIN equipment_models em ON i.model_id = em.model_id
      JOIN equipment_categories ec ON em.category_id = ec.category_id
      LEFT JOIN users tech ON t.assigned_to = tech.user_id
      WHERE t.ticket_id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticket = result.rows[0];

    // Check permission: Only admins, technicians, or the ticket opener can view
    if (req.user.role !== 'admin' && req.user.role !== 'technician' && req.user.id !== ticket.opened_by) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(ticket);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

/**
 * @route   POST api/tickets
 * @desc    Create a new maintenance ticket
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { item_id, loan_id, severity, description } = req.body;
    const opened_by = req.user.id;

    // Check if item exists
    const itemCheck = await db.query(
      'SELECT status FROM equipment_items WHERE item_id = $1',
      [item_id]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Create ticket
    const result = await db.query(
      `INSERT INTO maintenance_tickets 
       (item_id, loan_id, opened_by, severity, status, description) 
       VALUES ($1, $2, $3, $4, 'open', $5) 
       RETURNING *`,
      [item_id, loan_id || null, opened_by, severity, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

/**
 * @route   PUT api/tickets/:id/assign
 * @desc    Assign ticket to a technician
 * @access  Private/Admin,Technician
 */
router.put('/:id/assign', auth, checkRole(['admin', 'technician']), async (req, res) => {
  try {
    const { technician_id } = req.body;

    // Check if technician exists
    if (technician_id) {
      const techCheck = await db.query(
        'SELECT * FROM technicians WHERE technician_id = $1',
        [technician_id]
      );

      if (techCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Technician not found' });
      }
    }

    const result = await db.query(
      `UPDATE maintenance_tickets 
       SET assigned_to = $1, status = CASE WHEN $1 IS NULL THEN 'open' ELSE 'in_progress' END
       WHERE ticket_id = $2 
       RETURNING *`,
      [technician_id || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

/**
 * @route   PATCH api/tickets/:id
 * @desc    Update ticket (status, severity, assigned_to, description)
 * @access  Private/Admin,Technician
 */
router.patch('/:id', auth, checkRole(['admin', 'technician']), async (req, res) => {
  try {
    const { status, severity, assigned_to, description } = req.body;
    const ticketId = req.params.id;
    
    // Validate status if provided
    if (status && !['open', 'in_progress', 'on_hold', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Validate severity if provided
    if (severity && !['low', 'medium', 'high', 'critical'].includes(severity)) {
      return res.status(400).json({ message: 'Invalid severity' });
    }
    
    // Build dynamic update query based on provided fields
    let updateFields = [];
    let queryParams = [ticketId]; // Start with ticket_id as first param
    let paramIndex = 2; // Start param index at $2
    
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      queryParams.push(status);
      
      // Set closed_at when status becomes 'closed'
      if (status === 'closed') {
        updateFields.push(`closed_at = NOW()`);
      }
    }
    
    if (severity !== undefined) {
      updateFields.push(`severity = $${paramIndex++}`);
      queryParams.push(severity);
    }
    
    if (assigned_to !== undefined) {
      updateFields.push(`assigned_to = $${paramIndex++}`);
      queryParams.push(assigned_to);
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      queryParams.push(description);
    }
    
    // If no fields to update, return early
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update' });
    }
    
    // Execute update query
    const updateQuery = `
      UPDATE maintenance_tickets 
      SET ${updateFields.join(', ')}
      WHERE ticket_id = $1 
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ticket update error:', err.message);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

module.exports = router;