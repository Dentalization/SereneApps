import jwt from 'jsonwebtoken';

const ACCESS_TTL = process.env.ACCESS_TTL || '15m';
const REFRESH_TTL = process.env.REFRESH_TTL || '7d';

export function signAccess(user) {
  return jwt.sign({ sub: user.id, roles: user.roles || [] }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

export function signRefresh(user) {
  return jwt.sign({ sub: user.id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: REFRESH_TTL });
}

export function verify(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

// Middleware to authenticate token
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = verify(token);
    const userId = decoded?.sub?.toString?.() ?? decoded?.sub;
    if (!userId) {
      console.error('Token payload missing subject (user id)');
      return res.status(401).json({ error: 'Invalid access token' });
    }

    req.user = {
      id: userId,
      userId, // legacy alias used across older routes
      roles: decoded.roles || []
    };
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Middleware to require specific roles
export function requireRoles(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRoles
      });
    }

    next();
  };
}
