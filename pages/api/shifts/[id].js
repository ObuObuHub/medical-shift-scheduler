import { sql } from '../../../lib/vercel-db';
import { authMiddleware, runMiddleware, enableCORS } from '../../../lib/auth';

export default async function handler(req, res) {
  // Enable CORS with environment-specific origin
  await runMiddleware(req, res, enableCORS);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Run auth middleware
    await runMiddleware(req, res, authMiddleware);
  } catch (error) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    // Get single shift details
    try {
      const rows = await sql`
        SELECT 
          shift_id,
          date,
          shift_type,
          staff_ids,
          department,
          requirements,
          coverage,
          hospital,
          status,
          reserved_by,
          reserved_at,
          swap_request_id
        FROM shifts
        WHERE shift_id = ${id} AND is_active = true
      `;

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Shift not found' });
      }

      res.status(200).json(rows[0]);
    } catch (error) {
      console.error('Error fetching shift:', error);
      res.status(500).json({ error: 'Failed to fetch shift' });
    }
  } else if (req.method === 'PUT') {
    // Update shift
    const { staffIds, status, reservedBy, swapRequestId } = req.body;

    try {
      // Check permissions
      if (req.user.role === 'staff') {
        // Staff can only reserve/unreserve their own shifts
        if (status === 'reserved' && reservedBy !== req.user.id) {
          return res.status(403).json({ error: 'Cannot reserve shift for another staff member' });
        }
        if (status === 'open' && reservedBy !== req.user.id) {
          return res.status(403).json({ error: 'Cannot unreserve shift for another staff member' });
        }
      }

      // Build dynamic update query
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (staffIds !== undefined) {
        updates.push(`staff_ids = $${paramCount}`);
        values.push(JSON.stringify(staffIds));
        paramCount++;
      }

      if (status !== undefined) {
        updates.push(`status = $${paramCount}`);
        values.push(status);
        paramCount++;
      }

      if (status === 'reserved') {
        updates.push(`reserved_by = $${paramCount}`);
        values.push(reservedBy);
        paramCount++;
        updates.push(`reserved_at = CURRENT_TIMESTAMP`);
      } else if (status === 'open') {
        updates.push(`reserved_by = NULL`);
        updates.push(`reserved_at = NULL`);
      }

      if (swapRequestId !== undefined) {
        updates.push(`swap_request_id = $${paramCount}`);
        values.push(swapRequestId);
        paramCount++;
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      updates.push(`updated_by = $${paramCount}`);
      values.push(req.user.username);
      paramCount++;

      values.push(id); // Add shift ID as last parameter

      const updateQuery = `
        UPDATE shifts
        SET ${updates.join(', ')}
        WHERE shift_id = $${paramCount} AND is_active = true
        RETURNING *
      `;

      // Execute raw query with Neon
      const rows = await sql(updateQuery, values);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Shift not found' });
      }

      res.status(200).json({ 
        message: 'Shift updated successfully', 
        shift: rows[0] 
      });
    } catch (error) {
      console.error('Error updating shift:', error);
      res.status(500).json({ error: 'Failed to update shift' });
    }
  } else if (req.method === 'DELETE') {
    // Only managers and admins can delete shifts
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    try {
      await sql`
        UPDATE shifts
        SET is_active = false, updated_at = CURRENT_TIMESTAMP, updated_by = ${req.user.username}
        WHERE shift_id = ${id}
      `;

      res.status(200).json({ message: 'Shift deleted successfully' });
    } catch (error) {
      console.error('Error deleting shift:', error);
      res.status(500).json({ error: 'Failed to delete shift' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}