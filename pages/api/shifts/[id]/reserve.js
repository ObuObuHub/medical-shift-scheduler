import jwt from 'jsonwebtoken';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { id } = req.query;

  if (req.method === 'POST') {
    // Reserve a shift
    try {
      // First check if shift exists and is available
      const { rows: shiftRows } = await sql`
        SELECT 
          shift_id,
          date,
          shift_type,
          staff_ids,
          status,
          reserved_by,
          hospital
        FROM shifts
        WHERE shift_id = ${id} AND is_active = true
      `;

      if (shiftRows.length === 0) {
        return res.status(404).json({ error: 'Shift not found' });
      }

      const shift = shiftRows[0];

      // Check if shift is already reserved
      if (shift.status === 'reserved' && shift.reserved_by !== req.user.id) {
        return res.status(400).json({ error: 'Shift is already reserved by another staff member' });
      }

      // Check if staff member is eligible for this shift (same hospital)
      const { rows: staffRows } = await sql`
        SELECT hospital FROM staff WHERE id = ${req.user.id} AND is_active = true
      `;

      if (staffRows.length === 0 || staffRows[0].hospital !== shift.hospital) {
        return res.status(403).json({ error: 'You can only reserve shifts in your assigned hospital' });
      }

      // Check for conflicts (same date, overlapping times)
      const shiftDate = shift.date;
      const { rows: conflictRows } = await sql`
        SELECT s.shift_id, s.shift_type
        FROM shifts s
        WHERE s.date = ${shiftDate}
          AND s.is_active = true
          AND (
            ${req.user.id} = ANY(s.staff_ids)
            OR (s.reserved_by = ${req.user.id} AND s.status = 'reserved')
          )
          AND s.shift_id != ${id}
      `;

      if (conflictRows.length > 0) {
        return res.status(400).json({ 
          error: 'You already have a shift scheduled on this date',
          conflicts: conflictRows
        });
      }

      // Check reservation limit (2 active reservations per staff member)
      // Skip this check for managers and admins
      if (!['manager', 'admin'].includes(req.user.role)) {
        const { rows: reservationCountRows } = await sql`
          SELECT COUNT(*) as count
          FROM shifts
          WHERE reserved_by = ${req.user.id}
            AND status = 'reserved'
            AND is_active = true
            AND shift_id != ${id}
        `;

        const reservationCount = parseInt(reservationCountRows[0].count);
        if (reservationCount >= 2) {
          return res.status(400).json({ 
            error: 'You have reached the maximum of 2 shift reservations. Please cancel an existing reservation before making a new one.',
            currentReservations: reservationCount
          });
        }
      }

      // Reserve the shift
      const { rows: updatedRows } = await sql`
        UPDATE shifts
        SET 
          status = 'reserved',
          reserved_by = ${req.user.id},
          reserved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = ${req.user.username}
        WHERE shift_id = ${id} AND is_active = true
        RETURNING *
      `;

      res.status(200).json({ 
        message: 'Shift reserved successfully', 
        shift: updatedRows[0] 
      });
    } catch (error) {
            res.status(500).json({ error: 'Failed to reserve shift' });
    }
  } else if (req.method === 'DELETE') {
    // Cancel reservation
    try {
      // Check if shift exists and is reserved by the user
      const { rows: shiftRows } = await sql`
        SELECT 
          shift_id,
          status,
          reserved_by
        FROM shifts
        WHERE shift_id = ${id} AND is_active = true
      `;

      if (shiftRows.length === 0) {
        return res.status(404).json({ error: 'Shift not found' });
      }

      const shift = shiftRows[0];

      // Check permissions
      if (shift.status !== 'reserved') {
        return res.status(400).json({ error: 'Shift is not reserved' });
      }

      if (shift.reserved_by !== req.user.id && !['manager', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'You can only cancel your own reservations' });
      }

      // Cancel the reservation
      const { rows: updatedRows } = await sql`
        UPDATE shifts
        SET 
          status = 'open',
          reserved_by = NULL,
          reserved_at = NULL,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = ${req.user.username}
        WHERE shift_id = ${id} AND is_active = true
        RETURNING *
      `;

      res.status(200).json({ 
        message: 'Reservation cancelled successfully', 
        shift: updatedRows[0] 
      });
    } catch (error) {
            res.status(500).json({ error: 'Failed to cancel reservation' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}