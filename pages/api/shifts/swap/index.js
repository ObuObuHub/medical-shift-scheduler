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

  if (req.method === 'GET') {
    // Get swap requests (filtered by role and hospital)
    try {
      let query;
      const params = [];

      if (req.user.role === 'staff') {
        // Staff can only see their own requests
        query = `
          SELECT 
            ssr.*,
            s1.name as requester_name,
            s2.name as target_staff_name
          FROM shift_swap_requests ssr
          LEFT JOIN staff s1 ON ssr.requester_id = s1.id
          LEFT JOIN staff s2 ON ssr.target_staff_id = s2.id
          WHERE ssr.requester_id = $1 OR ssr.target_staff_id = $1
          ORDER BY ssr.created_at DESC
        `;
        params.push(req.user.id);
      } else {
        // Managers and admins see all requests for their hospital
        const { rows: staffRows } = await sql`
          SELECT hospital FROM staff WHERE id = ${req.user.id}
        `;
        const userHospital = staffRows[0]?.hospital;

        query = `
          SELECT 
            ssr.*,
            s1.name as requester_name,
            s2.name as target_staff_name
          FROM shift_swap_requests ssr
          LEFT JOIN staff s1 ON ssr.requester_id = s1.id
          LEFT JOIN staff s2 ON ssr.target_staff_id = s2.id
          WHERE ssr.hospital = $1
          ORDER BY ssr.created_at DESC
        `;
        params.push(userHospital);
      }

      const { rows } = await sql.query(query, params);
      res.status(200).json(rows);
    } catch (error) {
            res.status(500).json({ error: 'Failed to fetch swap requests' });
    }
  } else if (req.method === 'POST') {
    // Create new swap request
    const {
      shiftId,
      shiftDate,
      shiftType,
      targetStaffId,
      requestedShiftId,
      requestedShiftDate,
      requestedShiftType,
      reason
    } = req.body;

    try {
      // Validate that the requester is assigned to the shift they want to swap
      const { rows: shiftRows } = await sql`
        SELECT staff_ids, hospital, status, reserved_by
        FROM shifts
        WHERE shift_id = ${shiftId} AND is_active = true
      `;

      if (shiftRows.length === 0) {
        return res.status(404).json({ error: 'Shift not found' });
      }

      const shift = shiftRows[0];
      const staffIds = shift.staff_ids || [];

      // Check if user is assigned to this shift or has reserved it
      const isAssigned = staffIds.includes(req.user.id);
      const hasReserved = shift.status === 'reserved' && shift.reserved_by === req.user.id;

      if (!isAssigned && !hasReserved) {
        return res.status(403).json({ error: 'You are not assigned to this shift' });
      }

      // Check if shift is less than 24 hours away
      const shiftDateTime = new Date(shiftDate);
      const now = new Date();
      const hoursUntilShift = (shiftDateTime - now) / (1000 * 60 * 60);
      
      if (hoursUntilShift < 24) {
        return res.status(400).json({ error: 'Cannot request swap less than 24 hours before shift' });
      }

      // If requesting a specific shift swap, validate target shift
      if (requestedShiftId) {
        const { rows: targetShiftRows } = await sql`
          SELECT staff_ids, status, reserved_by
          FROM shifts
          WHERE shift_id = ${requestedShiftId} AND is_active = true
        `;

        if (targetShiftRows.length === 0) {
          return res.status(404).json({ error: 'Requested shift not found' });
        }

        // If targetStaffId is provided, verify they are assigned to the requested shift
        if (targetStaffId) {
          const targetShift = targetShiftRows[0];
          const targetStaffIds = targetShift.staff_ids || [];
          const isTargetAssigned = targetStaffIds.includes(targetStaffId);
          const targetHasReserved = targetShift.status === 'reserved' && targetShift.reserved_by === targetStaffId;

          if (!isTargetAssigned && !targetHasReserved) {
            return res.status(400).json({ error: 'Target staff is not assigned to the requested shift' });
          }
        }
      }

      // Create the swap request
      const { rows } = await sql`
        INSERT INTO shift_swap_requests (
          requester_id,
          target_staff_id,
          shift_id,
          shift_date,
          shift_type,
          requested_shift_id,
          requested_shift_date,
          requested_shift_type,
          reason,
          status,
          hospital
        ) VALUES (
          ${req.user.id},
          ${targetStaffId || null},
          ${shiftId},
          ${shiftDate},
          ${JSON.stringify(shiftType)},
          ${requestedShiftId || null},
          ${requestedShiftDate || null},
          ${requestedShiftType ? JSON.stringify(requestedShiftType) : null},
          ${reason || null},
          'pending',
          ${shift.hospital}
        )
        RETURNING *
      `;

      // Update shift status
      await sql`
        UPDATE shifts
        SET 
          status = 'swap_requested',
          swap_request_id = ${rows[0].id},
          updated_at = CURRENT_TIMESTAMP
        WHERE shift_id = ${shiftId}
      `;

      res.status(201).json({ 
        message: 'Swap request created successfully', 
        swapRequest: rows[0] 
      });
    } catch (error) {
            res.status(500).json({ error: 'Failed to create swap request' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}