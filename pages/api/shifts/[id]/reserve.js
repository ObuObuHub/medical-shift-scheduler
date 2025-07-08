import jwt from 'jsonwebtoken';
import { sql } from '@vercel/postgres';
import reservationService from '../../../../lib/reservationService';

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

  if (req.method === 'GET') {
    // Get reservation statistics for the current user
    try {
      // Find the staff member that corresponds to this user
      const { rows: staffRows } = await sql`
        SELECT id FROM staff 
        WHERE name = ${req.user.name} 
        AND hospital = ${req.user.hospital}
        AND is_active = true
      `;

      if (staffRows.length === 0) {
        return res.status(403).json({ error: 'Nu s-a găsit personalul asociat cu contul tău' });
      }

      const staffId = staffRows[0].id;

      // Get current month and year
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // getMonth() returns 0-11

      const stats = await reservationService.getReservationStats(staffId, year, month);

      res.status(200).json(stats);
    } catch (error) {
      console.error('Error getting reservation stats:', error);
      res.status(500).json({ error: 'Failed to get reservation statistics' });
    }
  } else if (req.method === 'POST') {
    // Reserve a shift
    try {
      // Find the staff member that corresponds to this user
      const { rows: staffRows } = await sql`
        SELECT id, name, hospital, specialization FROM staff 
        WHERE name = ${req.user.name} 
        AND hospital = ${req.user.hospital}
        AND is_active = true
      `;

      if (staffRows.length === 0) {
        return res.status(403).json({ error: 'Nu s-a găsit personalul asociat cu contul tău' });
      }

      const staffMember = staffRows[0];
      const staffId = staffMember.id;

      // Use the unified reservation service
      const result = await reservationService.reserveShift(
        id,
        staffId,
        staffMember,
        req.user.role,
        req.user.username
      );

      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          conflicts: result.conflicts 
        });
      }

      res.status(200).json({ 
        message: 'Shift reserved successfully', 
        shift: result.shift 
      });
    } catch (error) {
      console.error('Error in reservation endpoint:', error);
      res.status(500).json({ error: 'Failed to reserve shift' });
    }
  } else if (req.method === 'DELETE') {
    // Cancel reservation
    try {
      // Get staff ID for the current user
      const { rows: userStaffRows } = await sql`
        SELECT id FROM staff 
        WHERE name = ${req.user.name} 
        AND hospital = ${req.user.hospital}
        AND is_active = true
      `;
      
      const userStaffId = userStaffRows.length > 0 ? userStaffRows[0].id : null;
      
      if (!userStaffId) {
        return res.status(403).json({ error: 'Nu s-a găsit personalul asociat cu contul tău' });
      }

      // Use the unified reservation service
      const result = await reservationService.cancelReservation(
        id,
        userStaffId,
        req.user.role,
        req.user.username
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.status(200).json({ 
        message: 'Reservation cancelled successfully', 
        shift: result.shift 
      });
    } catch (error) {
      console.error('Error in cancellation endpoint:', error);
      res.status(500).json({ error: 'Failed to cancel reservation' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}