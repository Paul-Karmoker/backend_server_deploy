// src/middleware/auth.middleware.js
import jwt from 'jsonwebtoken';
import User from '../model/user.model.js';

/**
 * Protect middleware - Verifies JWT and attaches user to request
 */
export async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');

    if (!user || user.isDeleted) {
      return res.status(401).json({ message: 'Unauthorized: User not found or deleted' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('JWT Error:', err.message);
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
  }
}

/**
 * Role-based Access Control middleware
 * @param {...string} roles - List of roles allowed to access the route
 */
export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Requires one of roles [${roles.join(', ')}]`,
      });
    }
    next();
  };
}
