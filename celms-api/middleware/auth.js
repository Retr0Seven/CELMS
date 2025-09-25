const jwt = require('jsonwebtoken');
const db = require('../db');

// Use environment JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-for-testing-only-not-for-production';

/**
 * Authenticate JWT token and attach user to request object
 */
const auth = async (req, res, next) => {
  // Get token from header, Authorization header or cookie
  const token = 
    req.header('x-auth-token') || 
    (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null) ||
    req.cookies?.token;

  // Check if no token
  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Unauthorized', 
      message: 'Authentication required. Please log in.'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user still exists in database and has same role
    const userResult = await db.query(
      'SELECT user_id, role FROM users WHERE user_id = $1',
      [decoded.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User no longer exists'
      });
    }
    
    const dbUser = userResult.rows[0];
    
    // Check if role has changed (if admin demoted the user)
    if (dbUser.role !== decoded.user.role) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User permissions have changed. Please log in again.'
      });
    }
    
    // Add user to request
    req.user = decoded.user;
    
    // Add token to request for potential refresh
    req.token = token;
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.name);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication expired. Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid authentication token',
        code: 'INVALID_TOKEN'
      });
    }
    
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * Check user role - guards routes that require specific roles
 */
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
    }

    const hasRole = Array.isArray(roles) 
      ? roles.includes(req.user.role) 
      : req.user.role === roles;
      
    if (!hasRole) {
      // Log unauthorized access attempt
      console.warn(`Role authorization failed: User ${req.user.id} (${req.user.role}) attempted to access resource requiring ${Array.isArray(roles) ? roles.join(',') : roles}`);
      
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden',
        message: `Access denied. This action requires ${Array.isArray(roles) ? roles.join(' or ') : roles} privileges.`
      });
    }

    next();
  };
};

/**
 * Check if user has admin or technician role
 */
const isAdminOrTech = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required' 
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'technician') {
    return res.status(403).json({ 
      success: false,
      error: 'Forbidden',
      message: 'This action requires admin or technician privileges' 
    });
  }

  next();
};

/**
 * Check if the user is the owner of a resource or has admin/technician role
 */
const isOwnerOrAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
    }

    // Admin or technician can access everything
    if (req.user.role === 'admin' || req.user.role === 'technician') {
      return next();
    }

    // For other users, check if they own the resource
    const { resourceType, resourceId } = req.params;
    
    if (!resourceType || !resourceId) {
      return res.status(400).json({ 
        success: false,
        error: 'Bad Request',
        message: 'Resource type and ID are required in the URL parameters' 
      });
    }
    
    // Validate UUID format for resourceId
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(resourceId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Bad Request',
        message: 'Invalid resource ID format' 
      });
    }

    let isOwner = false;
    const userId = req.user.id;
    
    switch (resourceType) {
      case 'reservation':
        const resResult = await db.query(
          'SELECT 1 FROM reservations WHERE reservation_id = $1 AND borrower_user_id = $2',
          [resourceId, userId]
        );
        isOwner = resResult.rows.length > 0;
        break;
      
      case 'loan':
        const loanResult = await db.query(
          'SELECT 1 FROM loans WHERE loan_id = $1 AND borrower_user_id = $2',
          [resourceId, userId]
        );
        isOwner = loanResult.rows.length > 0;
        break;
      
      case 'ticket':
        const ticketResult = await db.query(
          'SELECT 1 FROM tickets WHERE ticket_id = $1 AND reporter_user_id = $2',
          [resourceId, userId]
        );
        isOwner = ticketResult.rows.length > 0;
        break;
      
      case 'user':
        // Users can only access their own user profile
        isOwner = resourceId === userId;
        break;
        
      default:
        return res.status(400).json({ 
          success: false,
          error: 'Bad Request',
          message: `Unsupported resource type: ${resourceType}` 
        });
    }

    if (!isOwner) {
      // Log unauthorized access attempt
      console.warn(`Resource access denied: User ${userId} attempted to access ${resourceType} ${resourceId}`);
      
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden',
        message: 'You can only access your own resources' 
      });
    }

    next();
  } catch (err) {
    console.error('Resource ownership check error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Server Error',
      message: 'Error verifying resource ownership' 
    });
  }
};

/**
 * Validate request parameters
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      // Check if resourceId exists and is a valid UUID
      if (req.params.id) {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(req.params.id)) {
          return res.status(400).json({ 
            success: false,
            error: 'Bad Request',
            message: 'Invalid ID format' 
          });
        }
      }
      
      // Apply additional schema validation if provided
      if (schema) {
        // Implementation for custom schema validation would go here
        // This could validate additional parameters beyond just ID format
      }
      
      next();
    } catch (err) {
      console.error('Parameter validation error:', err);
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid request parameters'
      });
    }
  };
};

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('API Error:', err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message,
      details: err.details
    });
  }
  
  // Handle database errors
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        return res.status(409).json({
          success: false,
          error: 'Conflict',
          message: 'A record with this information already exists'
        });
      case '23503': // foreign_key_violation
        return res.status(409).json({
          success: false,
          error: 'Conflict',
          message: 'This operation would violate database relationships'
        });
      case '23514': // check_violation
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Input data violates constraints'
        });
    }
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    error: 'Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
};

/**
 * Request logger middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      user: req.user ? req.user.id : 'anonymous',
      ip: req.ip
    };
    
    // Log different levels based on status code
    if (res.statusCode >= 500) {
      console.error('Request error:', logData);
    } else if (res.statusCode >= 400) {
      console.warn('Request warning:', logData);
    } else {
      console.log('Request info:', logData);
    }
  });
  
  next();
};

module.exports = {
  auth,
  checkRole,
  isAdminOrTech,
  isOwnerOrAdmin,
  validateParams,
  errorHandler,
  requestLogger
};