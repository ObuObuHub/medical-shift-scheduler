import jwt from 'jsonwebtoken';
import User from '../models/User';
import connectToDatabase from './mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'medical-scheduler-secret-key';

export const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id, 
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

    await connectToDatabase();
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = {
      _id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      hospital: user.hospital,
      type: user.type,
      specialization: user.specialization
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
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

// Legacy SHA-256 password verification for existing users
import crypto from 'crypto';

export const verifyLegacyPassword = (password, storedHash) => {
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  return hash === storedHash;
};