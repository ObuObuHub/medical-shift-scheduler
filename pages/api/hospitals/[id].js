import { sql } from '../../../lib/vercel-db';
import { authMiddleware, requireRole, runMiddleware } from '../../../lib/auth';

export default async function handler(req, res) {
  try {
    await runMiddleware(req, res, authMiddleware);
    await runMiddleware(req, res, requireRole(['admin']));

    const { id } = req.query;

    switch (req.method) {
      case 'PUT':
        return await updateHospital(req, res, id);
      case 'DELETE':
        return await deleteHospital(req, res, id);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Hospital API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateHospital(req, res, id) {
  try {
    const { name, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Hospital name is required' });
    }

    const result = await sql`
      UPDATE hospitals 
      SET name = ${name.trim()}, address = ${address?.trim() || null}, updated_at = CURRENT_TIMESTAMP
      WHERE hospital_id = ${id} AND is_active = true
      RETURNING *;
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    const hospital = result.rows[0];

    const updatedHospital = {
      id: hospital.hospital_id,
      name: hospital.name
    };

    res.status(200).json(updatedHospital);
  } catch (error) {
    console.error('Update hospital error:', error);
    res.status(500).json({ error: 'Failed to update hospital' });
  }
}

async function deleteHospital(req, res, id) {
  try {
    // Check if there are other active hospitals
    const activeHospitalsResult = await sql`
      SELECT COUNT(*) as count FROM hospitals WHERE is_active = true;
    `;
    
    if (activeHospitalsResult.rows[0].count <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last hospital' });
    }

    const result = await sql`
      UPDATE hospitals 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE hospital_id = ${id} AND is_active = true
      RETURNING id;
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    res.status(200).json({ message: 'Hospital deleted successfully' });
  } catch (error) {
    console.error('Delete hospital error:', error);
    res.status(500).json({ error: 'Failed to delete hospital' });
  }
}