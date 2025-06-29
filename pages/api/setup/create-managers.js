import { sql } from '../../../lib/vercel-db';
import bcrypt from 'bcryptjs';

// This endpoint creates the two manager accounts
// It can be called via: POST /api/setup/create-managers

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const created = [];
    const skipped = [];
    
    // Manager account details
    const managers = [
      {
        name: 'Manager Spitalul Județean de Urgență Piatra-Neamț',
        username: 'manager.spital1',
        password: 'SP1a4',
        hospital: 'spital1'
      },
      {
        name: 'Manager Spitalul Prof. Dr. Eduard Apetrei Buhuși',
        username: 'manager.spital2',
        password: 'BH2x9',
        hospital: 'spital2'
      }
    ];
    
    // Create each manager
    for (const manager of managers) {
      // Check if already exists
      const existing = await sql`
        SELECT id FROM users WHERE username = ${manager.username}
      `;
      
      if (existing.length > 0) {
        skipped.push(manager.username);
        continue;
      }
      
      // Hash password and create user
      const passwordHash = await bcrypt.hash(manager.password, 10);
      
      await sql`
        INSERT INTO users (
          name, username, password_hash, role, hospital, type, is_active
        ) VALUES (
          ${manager.name},
          ${manager.username},
          ${passwordHash},
          'manager',
          ${manager.hospital},
          'medic',
          true
        )
      `;
      
      created.push({
        username: manager.username,
        hospital: manager.hospital,
        password: manager.password
      });
    }
    
    res.status(200).json({
      success: true,
      created,
      skipped,
      message: created.length > 0 
        ? `Created ${created.length} manager account(s)` 
        : 'All manager accounts already exist'
    });
    
  } catch (error) {
    console.error('Error creating managers:', error);
    res.status(500).json({ 
      error: 'Failed to create manager accounts',
      details: error.message 
    });
  }
}