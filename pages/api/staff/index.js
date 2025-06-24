import { sql } from '../../../lib/vercel-db';
import { authMiddleware, requireRole, runMiddleware } from '../../../lib/auth';

export default async function handler(req, res) {
  try {
    await runMiddleware(req, res, authMiddleware);

    switch (req.method) {
      case 'GET':
        return await getStaff(req, res);
      case 'POST':
        await runMiddleware(req, res, requireRole(['admin', 'manager']));
        return await createStaff(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Staff API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getStaff(req, res) {
  try {
    const { hospital } = req.query;
    
    let result;
    if (hospital) {
      result = await sql`SELECT * FROM staff WHERE is_active = true AND hospital = ${hospital} ORDER BY name`;
    } else {
      result = await sql`SELECT * FROM staff WHERE is_active = true ORDER BY name`;
    }
    
    // Convert to legacy format for compatibility
    const legacyStaff = result.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      specialization: s.specialization,
      hospital: s.hospital,
      role: s.role,
      unavailable: s.unavailable || []
    }));

    res.status(200).json(legacyStaff);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
}

async function createStaff(req, res) {
  try {
    const { name, type, specialization, hospital, role } = req.body;

    if (!name || !specialization || !hospital) {
      return res.status(400).json({ error: 'Name, specialization, and hospital are required' });
    }

    const result = await sql`
      INSERT INTO staff (name, type, specialization, hospital, role, created_by)
      VALUES (${name.trim()}, ${type || 'medic'}, ${specialization}, ${hospital}, ${role || 'staff'}, ${req.user.id})
      RETURNING *;
    `;

    const staff = result[0];

    const newStaff = {
      id: staff.id,
      name: staff.name,
      type: staff.type,
      specialization: staff.specialization,
      hospital: staff.hospital,
      role: staff.role,
      unavailable: staff.unavailable || []
    };

    res.status(201).json(newStaff);
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Failed to create staff member' });
  }
}