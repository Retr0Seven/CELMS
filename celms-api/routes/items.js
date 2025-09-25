const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const db = require('../db');

/**
 * @route   GET api/items
 * @desc    Get all equipment items
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    // Use the v_items view that includes availability status
    const result = await db.query('SELECT * FROM v_items ORDER BY asset_tag');
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
 * @route   GET api/items/:id
 * @desc    Get item by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    // Join with models and categories to get full item details
    const result = await db.query(
      `SELECT i.*, em.brand, em.model_name, em.spec_json, ec.name as category_name, ec.description as category_description
       FROM equipment_items i
       JOIN equipment_models em ON i.model_id = em.model_id
       JOIN equipment_categories ec ON em.category_id = ec.category_id
       WHERE i.item_id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

/**
 * @route   POST api/items
 * @desc    Create a new equipment item
 * @access  Private/Admin
 */
router.post('/', auth, checkRole(['admin', 'technician']), async (req, res) => {
  try {
    const { model_id, asset_tag, status, purchase_date, location, notes } = req.body;

    const result = await db.query(
      `INSERT INTO equipment_items 
       (model_id, asset_tag, status, purchase_date, location, notes) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [model_id, asset_tag, status, purchase_date, location, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

/**
 * @route   PATCH api/items/:id
 * @desc    Update an equipment item using fn_item_update function
 * @access  Private/Admin,Technician
 */
router.patch('/:id', auth, checkRole(['admin', 'technician']), async (req, res) => {
  try {
    const { status, location, last_serviced } = req.body;
    const itemId = req.params.id;
    
    // Call the database function to update the item
    await db.query(
      `SELECT fn_item_update($1, $2, $3, $4, $5)`,
      [req.user.id, itemId, status, location, last_serviced]
    );
    
    // Fetch the updated item
    const result = await db.query(
      `SELECT * FROM v_items WHERE item_id = $1`,
      [itemId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Item update error:', err.message);
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
});

/**
 * @route   DELETE api/items/:id
 * @desc    Delete an equipment item
 * @access  Private/Admin
 */
router.delete('/:id', auth, checkRole(['admin']), async (req, res) => {
  try {
    // Check if item is associated with loans or reservations
    const checkResult = await db.query(
      `SELECT COUNT(*) FROM loans WHERE item_id = $1
       UNION ALL
       SELECT COUNT(*) FROM reservations WHERE item_id = $1`,
      [req.params.id]
    );

    if (parseInt(checkResult.rows[0].count) > 0 || parseInt(checkResult.rows[1].count) > 0) {
      return res.status(400).json({
        message: 'Cannot delete item with associated loans or reservations'
      });
    }

    const result = await db.query(
      'DELETE FROM equipment_items WHERE item_id = $1 RETURNING item_id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ message: 'Item removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Routes for categories and models would also go here...

module.exports = router;