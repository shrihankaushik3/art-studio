import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_art_studio_jwt_token_key_change_me_in_production';

// Generate JWT token
export function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Authentication middleware - returns 401 if not authenticated
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Server authentication error.' });
  }
}

// Role authorization middleware - returns 403 if role does not match
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Treat 'studio' and 'admin' as authorized for admin operations
    const userRole = req.user.role;
    const hasRole = allowedRoles.includes(userRole) || 
      (allowedRoles.includes('admin') && userRole === 'studio') ||
      (allowedRoles.includes('studio') && userRole === 'admin');

    if (!hasRole) {
      return res.status(403).json({ error: 'Access forbidden: Insufficient permissions for this action.' });
    }

    next();
  };
}
