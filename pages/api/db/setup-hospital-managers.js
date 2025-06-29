import { sql } from '../../../lib/vercel-db';
import bcrypt from 'bcryptjs';
import { verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require admin authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await verifyToken(token);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Create default managers for each hospital
    const hospitals = [
      { 
        id: 'spital1', 
        name: 'Spitalul Județean de Urgență Piatra-Neamț',
        managerUsername: 'manager.spital1',
        managerName: 'Manager Laborator - Spital Județean'
      },
      { 
        id: 'spital2', 
        name: 'Spitalul "Prof. Dr. Eduard Apetrei" Buhuși',
        managerUsername: 'manager.spital2',
        managerName: 'Manager Laborator - Spital Buhuși'
      }
    ];

    const results = [];

    for (const hospital of hospitals) {
      // Check if manager already exists
      const existing = await sql`
        SELECT id FROM users 
        WHERE username = ${hospital.managerUsername} 
        LIMIT 1;
      `;

      if (existing.length === 0) {
        // Generate a secure random password
        const tempPassword = generateSecurePassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create the manager account
        const newUser = await sql`
          INSERT INTO users (name, username, password_hash, role, hospital, type, is_active)
          VALUES (${hospital.managerName}, ${hospital.managerUsername}, ${hashedPassword}, 'manager', ${hospital.id}, 'medic', true)
          RETURNING id, username, name, hospital;
        `;

        results.push({
          ...newUser[0],
          tempPassword, // Return this ONLY during initial setup
          message: 'Manager account created. Please change the password immediately.'
        });
      } else {
        results.push({
          username: hospital.managerUsername,
          message: 'Manager account already exists'
        });
      }
    }

    // Also create a main admin if it doesn't exist
    const adminExists = await sql`
      SELECT id FROM users WHERE role = 'admin' LIMIT 1;
    `;

    if (adminExists.length === 0) {
      const adminPassword = generateSecurePassword();
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const admin = await sql`
        INSERT INTO users (name, username, password_hash, role, hospital, type, is_active)
        VALUES ('Administrator Principal', 'admin', ${hashedPassword}, 'admin', 'spital1', 'medic', true)
        RETURNING id, username, name;
      `;

      results.push({
        ...admin[0],
        tempPassword: adminPassword,
        message: 'Admin account created. Please change the password immediately.'
      });
    }

    res.status(200).json({ 
      success: true, 
      results,
      warning: 'Temporary passwords are shown only once. Save them securely and change them immediately.'
    });

  } catch (error) {
    console.error('Setup hospital managers error:', error);
    res.status(500).json({ error: 'Failed to setup managers' });
  }
}

// Generate a secure random password
function generateSecurePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}