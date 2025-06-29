import { sql } from '../../../lib/vercel-db';
import bcrypt from 'bcryptjs';
import { authMiddleware, requireRole, runMiddleware } from '../../../lib/auth';
import { validatePassword, isCommonPassword } from '../../../lib/passwordValidator';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Only admin and manager can create new users
    await runMiddleware(req, res, authMiddleware);
    await runMiddleware(req, res, requireRole(['admin', 'manager']));

    const { username, password, name, role, hospital, type, specialization } = req.body;

    // Validate required fields
    if (!username || !password || !name || !hospital) {
      return res.status(400).json({ 
        error: 'Username, password, name, and hospital are required' 
      });
    }

    // Managers can only create users for their own hospital
    if (req.user.role === 'manager' && hospital !== req.user.hospital) {
      return res.status(403).json({ 
        error: 'Managers can only create users for their own hospital' 
      });
    }

    // Only admins can create other admins or managers
    if ((role === 'admin' || role === 'manager') && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Only administrators can create admin or manager accounts' 
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Parola nu îndeplinește cerințele de securitate',
        details: passwordValidation.errors
      });
    }

    // Check for common weak passwords
    if (isCommonPassword(password)) {
      return res.status(400).json({ 
        error: 'Parola este prea comună. Vă rugăm alegeți o parolă mai sigură.' 
      });
    }

    // Check if username already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE username = ${username.toLowerCase()};
    `;

    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await sql`
      INSERT INTO users (
        username, password_hash, name, role, hospital, type, specialization, created_by
      ) VALUES (
        ${username.toLowerCase()}, 
        ${hashedPassword}, 
        ${name}, 
        ${role || 'staff'}, 
        ${hospital}, 
        ${type || 'medic'}, 
        ${specialization || null},
        ${req.user.id}
      )
      RETURNING id, username, name, role, hospital, type, specialization;
    `;

    res.status(201).json({
      user: newUser[0],
      passwordStrength: passwordValidation.strength
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
}