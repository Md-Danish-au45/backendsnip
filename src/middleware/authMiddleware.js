import jwt from 'jsonwebtoken';
import User from '../models/UserModel.js';

// ✅ Protect: Verify JWT token and attach user
export const protect = async (req, res, next) => {
  let token;
  
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user (excluding password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Not authorized, user not found' 
        });
      }

      next();

    } catch (error) {
      console.error('JWT verification error:', error);
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized, token invalid or expired' 
      });
    }
  } else {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized, no token provided' 
    });
  }
};

// ✅ Role-based Access Control
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: role '${req.user.role}' not authorized.`,
        requiredRoles: roles
      });
    }

    next();
  };
};

// ✅ Admin-only Middleware Shortcut (for cleaner routes)
export const protectAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, please log in.'
    });
  }

  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin or Superadmin privileges required.'
    });
  }

  next();
};
