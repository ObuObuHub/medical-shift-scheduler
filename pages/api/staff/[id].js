import { sql } from '../../../lib/vercel-db';
import { authMiddleware, requireRole, runMiddleware } from '../../../lib/auth';

export default async function handler(req, res) {
  try {
    await runMiddleware(req, res, authMiddleware);

    const { id } = req.query;

    switch (req.method) {
      case 'PUT':
        await runMiddleware(req, res, requireRole(['admin', 'manager']));
        return await updateStaff(req, res, id);
      case 'DELETE':
        await runMiddleware(req, res, requireRole(['admin', 'manager']));
        return await deleteStaff(req, res, id);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateStaff(req, res, id) {
  try {
    const updates = req.body;
    
    const staffResult = await sql`
      SELECT * FROM staff WHERE id = ${id} AND is_active = true;
    `;
    
    if (staffResult.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Simple update approach for Neon
    const updatedStaff = await sql`
      UPDATE staff 
      SET 
        name = ${updates.name || staffResult[0].name},
        type = ${updates.type || staffResult[0].type},
        specialization = ${updates.specialization || staffResult[0].specialization},
        hospital = ${updates.hospital || staffResult[0].hospital},
        role = ${updates.role || staffResult[0].role},
        unavailable = ${JSON.stringify(updates.unavailable || staffResult[0].unavailable)},
        max_guards_per_month = ${updates.maxGuardsPerMonth !== undefined ? updates.maxGuardsPerMonth : (staffResult[0].max_guards_per_month || 10)},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *;
    `;

    const staff = updatedStaff[0];

    const updatedStaffResult = {
      id: staff.id,
      name: staff.name,
      type: staff.type,
      specialization: staff.specialization,
      hospital: staff.hospital,
      role: staff.role,
      unavailable: staff.unavailable || [],
      maxGuardsPerMonth: staff.max_guards_per_month || 10
    };

    res.status(200).json(updatedStaffResult);
  } catch (error) {
        res.status(500).json({ error: 'Failed to update staff member' });
  }
}

async function deleteStaff(req, res, id) {
  try {
    const result = await sql`
      UPDATE staff 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND is_active = true
      RETURNING id;
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.status(200).json({ message: 'Staff member deleted successfully' });
  } catch (error) {
        res.status(500).json({ error: 'Failed to delete staff member' });
  }
}