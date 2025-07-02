import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    // Create new swap request without authentication
    const {
      requesterId,  // The staff ID of the person making the request
      shiftId,
      shiftDate,
      shiftType,
      targetStaffId,
      requestedShiftId,
      requestedShiftDate,
      requestedShiftType,
      reason
    } = req.body;

    // Validate required fields
    if (!requesterId || !shiftId || !shiftDate || !shiftType) {
      return res.status(400).json({ 
        error: 'Missing required fields: requesterId, shiftId, shiftDate, shiftType' 
      });
    }

    try {
      // Verify the requester is a real staff member
      const { rows: staffRows } = await sql`
        SELECT id, name, hospital FROM staff WHERE id = ${requesterId}
      `;

      if (staffRows.length === 0) {
        return res.status(404).json({ error: 'Staff member not found' });
      }

      const requesterStaff = staffRows[0];

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

      // Check if requester is assigned to this shift or has reserved it
      const isAssigned = staffIds.includes(requesterId);
      const hasReserved = shift.status === 'reserved' && shift.reserved_by === requesterId;

      if (!isAssigned && !hasReserved) {
        return res.status(403).json({ error: 'You are not assigned to this shift' });
      }

      // Verify requester and shift are from the same hospital
      if (requesterStaff.hospital !== shift.hospital) {
        return res.status(403).json({ error: 'Staff and shift must be from the same hospital' });
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
          SELECT staff_ids, status, reserved_by, hospital
          FROM shifts
          WHERE shift_id = ${requestedShiftId} AND is_active = true
        `;

        if (targetShiftRows.length === 0) {
          return res.status(404).json({ error: 'Requested shift not found' });
        }

        const targetShift = targetShiftRows[0];

        // Verify target shift is from the same hospital
        if (targetShift.hospital !== shift.hospital) {
          return res.status(400).json({ error: 'Can only swap with shifts from the same hospital' });
        }

        // If targetStaffId is provided, verify they are assigned to the requested shift
        if (targetStaffId) {
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
          ${requesterId},
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
      console.error('Swap request creation error:', error);
      res.status(500).json({ error: 'Failed to create swap request' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}