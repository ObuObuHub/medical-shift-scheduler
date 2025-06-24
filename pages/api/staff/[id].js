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
    console.error('Staff API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateStaff(req, res, id) {
  try {
    const updates = req.body;
    
    const staffResult = await sql`
      SELECT * FROM staff WHERE id = ${id} AND is_active = true;
    `;
    
    if (staffResult.rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    
    const allowedFields = ['name', 'type', 'specialization', 'hospital', 'role', 'unavailable'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${updateValues.length + 1}`);
        updateValues.push(field === 'unavailable' ? JSON.stringify(updates[field]) : updates[field]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateValues.push(new Date().toISOString()); // updated_at
    updateValues.push(id); // WHERE condition

    const updateQuery = `
      UPDATE staff 
      SET ${updateFields.join(', ')}, updated_at = $${updateValues.length - 1}
      WHERE id = $${updateValues.length}
      RETURNING *;
    `;

    const result = await sql.query(updateQuery, updateValues);
    const staff = result.rows[0];

    const updatedStaff = {
      id: staff.id,
      name: staff.name,
      type: staff.type,
      specialization: staff.specialization,
      hospital: staff.hospital,
      role: staff.role,
      unavailable: staff.unavailable || []
    };

    res.status(200).json(updatedStaff);
  } catch (error) {
    console.error('Update staff error:', error);
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

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.status(200).json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Failed to delete staff member' });
  }
}