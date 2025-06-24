import { sql } from '../../../lib/vercel-db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'medical-scheduler-secret-key';

// Legacy SHA-256 password verification for existing users
import crypto from 'crypto';

function verifyLegacyPassword(password, storedHash) {
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  return hash === storedHash;
}

function generateToken(user) {
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
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // First try to find user in database
    const userResult = await sql`
      SELECT * FROM users 
      WHERE username = ${username.toLowerCase()} AND is_active = true;
    `;

    let user = userResult[0];

    // If user doesn't exist, check against legacy hardcoded users
    if (!user) {
      const legacyUsers = [
        { 
          username: 'admin', 
          passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
          name: 'Administrator Principal',
          role: 'admin',
          hospital: 'spital1',
          type: 'medic'
        },
        { 
          username: 'manager', 
          passwordHash: '866485796cfa8d7c0cf7111640205b83076433547577511d81f8030ae99ecea5',
          name: 'Manager Spital',
          role: 'manager',
          hospital: 'spital1',
          type: 'medic'
        }
      ];

      const legacyUser = legacyUsers.find(u => u.username === username.toLowerCase());
      
      if (legacyUser && verifyLegacyPassword(password, legacyUser.passwordHash)) {
        // Migrate legacy user to database
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUserResult = await sql`
          INSERT INTO users (name, username, password_hash, role, hospital, type)
          VALUES (${legacyUser.name}, ${legacyUser.username}, ${hashedPassword}, ${legacyUser.role}, ${legacyUser.hospital}, ${legacyUser.type})
          RETURNING *;
        `;
        
        user = newUserResult[0];
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        hospital: user.hospital,
        type: user.type,
        specialization: user.specialization
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}