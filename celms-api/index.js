require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

// Import routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const itemsRoutes = require('./routes/items');
const loansRoutes = require('./routes/loans');
const reservationsRoutes = require('./routes/reservations');
const ticketsRoutes = require('./routes/tickets');

const app = express();
const PORT = process.env.PORT || 3001;

// Set up CORS with proper origin and credentials settings
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Import middleware
const { requestLogger, errorHandler } = require('./middleware/auth');

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(helmet({ 
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
})); // Security headers
app.use(morgan('dev')); // HTTP logging
app.use(requestLogger); // Custom request logger

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/tickets', ticketsRoutes);

// Admin utilities
const adminRouter = express.Router();
const { auth, checkRole } = require('./middleware/auth');
const db = require('./db');

// Expire old reservations endpoint
adminRouter.post('/expire-reservations', auth, checkRole(['admin', 'technician']), async (req, res) => {
  try {
    const result = await db.query('SELECT fn_expire_old_reservations() as expired_count');
    res.json({ 
      success: true,
      message: `Expired ${result.rows[0].expired_count} old reservations`,
      count: result.rows[0].expired_count
    });
  } catch (err) {
    console.error('Error expiring reservations:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: 'Failed to expire reservations',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Database statistics for admin dashboard
adminRouter.get('/stats', auth, checkRole(['admin']), async (req, res) => {
  try {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Get various statistics
      const userStats = await client.query(`
        SELECT 
          COUNT(*) AS total_users,
          COUNT(*) FILTER (WHERE role = 'student') AS student_count,
          COUNT(*) FILTER (WHERE role = 'staff') AS staff_count,
          COUNT(*) FILTER (WHERE role = 'technician') AS technician_count,
          COUNT(*) FILTER (WHERE role = 'admin') AS admin_count,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS new_users_30days
        FROM users
      `);
      
      const itemStats = await client.query(`
        SELECT 
          COUNT(*) AS total_items,
          COUNT(*) FILTER (WHERE status = 'available') AS available_items,
          COUNT(*) FILTER (WHERE status = 'in_use') AS in_use_items,
          COUNT(*) FILTER (WHERE status = 'maintenance') AS maintenance_items,
          COUNT(*) FILTER (WHERE status = 'reserved') AS reserved_items
        FROM items
      `);
      
      const loanStats = await client.query(`
        SELECT 
          COUNT(*) AS total_loans,
          COUNT(*) FILTER (WHERE return_date IS NULL) AS active_loans,
          COUNT(*) FILTER (WHERE return_date IS NOT NULL) AS completed_loans,
          COUNT(*) FILTER (WHERE due_date < NOW() AND return_date IS NULL) AS overdue_loans,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS new_loans_30days
        FROM loans
      `);
      
      const reservationStats = await client.query(`
        SELECT 
          COUNT(*) AS total_reservations,
          COUNT(*) FILTER (WHERE status = 'pending') AS pending_reservations,
          COUNT(*) FILTER (WHERE status = 'approved') AS approved_reservations,
          COUNT(*) FILTER (WHERE status = 'denied') AS denied_reservations,
          COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_reservations,
          COUNT(*) FILTER (WHERE status = 'expired') AS expired_reservations,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS new_reservations_30days
        FROM reservations
      `);
      
      const ticketStats = await client.query(`
        SELECT 
          COUNT(*) AS total_tickets,
          COUNT(*) FILTER (WHERE status = 'open') AS open_tickets,
          COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tickets,
          COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_tickets,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS new_tickets_30days
        FROM tickets
      `);
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        stats: {
          users: userStats.rows[0],
          items: itemStats.rows[0],
          loans: loanStats.rows[0],
          reservations: reservationStats.rows[0],
          tickets: ticketStats.rows[0],
          timestamp: new Date()
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error fetching admin statistics:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: 'Failed to fetch system statistics',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// System maintenance endpoints
adminRouter.post('/cleanup', auth, checkRole(['admin']), async (req, res) => {
  try {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Clean up old activity logs (older than 90 days)
      const logsResult = await client.query(
        "DELETE FROM user_activity_log WHERE created_at < NOW() - INTERVAL '90 days' RETURNING COUNT(*) as deleted_count"
      );
      
      // Clean up expired sessions if using a session table
      // const sessionsResult = await client.query(
      //  "DELETE FROM sessions WHERE expires < NOW() RETURNING COUNT(*) as deleted_count"
      // );
      
      // Other cleanup operations can be added here
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'System cleanup completed successfully',
        results: {
          deletedLogs: logsResult.rows[0].deleted_count,
          // deletedSessions: sessionsResult.rows[0].deleted_count
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error during system cleanup:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: 'Failed to complete system cleanup',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.use('/api/admin', adminRouter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() as server_time');
    res.json({ 
      success: true,
      ok: true,
      api: 'ok',
      db: 'ok',
      dbTime: result.rows[0].server_time,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({ 
      success: false,
      ok: false,
      api: 'ok',
      db: 'error', 
      error: err.message 
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>CELMS API</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .endpoint { margin-bottom: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
          .method { display: inline-block; min-width: 60px; padding: 2px 5px; border-radius: 3px; 
                   background: #333; color: white; text-align: center; }
          .get { background: #4CAF50; }
          .post { background: #2196F3; }
          .put { background: #FF9800; }
          .delete { background: #F44336; }
        </style>
      </head>
      <body>
        <h1>Welcome to CELMS API</h1>
        <p>Campus Equipment Loan Management System API</p>
        <p>Check the API status: <a href="/api/health">/api/health</a></p>
        <h2>API Documentation</h2>
        <div class="endpoint"><span class="method get">GET</span> /api/auth/me - Get current user</div>
        <div class="endpoint"><span class="method post">POST</span> /api/auth/login - User login</div>
        <div class="endpoint"><span class="method post">POST</span> /api/auth/register - User registration</div>
        <div class="endpoint"><span class="method get">GET</span> /api/items - Get all equipment items</div>
        <div class="endpoint"><span class="method get">GET</span> /api/reservations - Get user reservations</div>
        <div class="endpoint"><span class="method get">GET</span> /api/loans - Get user loans</div>
      </body>
    </html>
  `);
});

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource does not exist'
  });
});

// Global error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});