import jwt from 'jsonwebtoken';
import { sql } from './vercel-db';

const JWT_SECRET = process.env.JWT_SECRET || 'temp-build-secret-key';

// Runtime check for JWT_SECRET (only when actually using auth functions)
const validateJWTSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required in production. Please set it in your deployment platform.');
  }
};

export const generateToken = (user) => {
  validateJWTSecret();
  return jwt.sign(
    { 
      userId: user.id, 
      username: user.username, 
      role: user.role,
      hospital: user.hospital 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token) => {
  try {
    validateJWTSecret();
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userResult = await sql`
      SELECT * FROM users WHERE id = ${decoded.userId} AND is_active = true;
    `;
    
    const user = userResult[0];
    if (!user) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      hospital: user.hospital,
      type: user.type,
      specialization: user.specialization
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Helper to run middleware in API routes
export function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

// CORS middleware with environment-specific origin
export const enableCORS = (req, res, next) => {
  const origin = process.env.ALLOWED_ORIGIN || 
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : req.headers.origin);
  
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  
  if (next) {
    next();
  }
};