import { sql } from '../../../../lib/vercel-db';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shiftData, staffId } = req.body;

    if (!shiftData || !staffId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate staff member exists and belongs to the hospital
    const { rows: staffRows } = await sql`
      SELECT id, hospital, name FROM staff 
      WHERE id = ${staffId} AND is_active = true
    `;

    if (staffRows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const staffMember = staffRows[0];

    // Validate staff belongs to the correct hospital
    if (staffMember.hospital !== shiftData.hospital) {
      return res.status(403).json({ error: 'Staff member does not belong to this hospital' });
    }

    // Check for existing shifts on the same date for this staff member
    const { rows: existingShifts } = await sql`
      SELECT shift_id FROM shifts 
      WHERE date = ${shiftData.date} 
      AND is_active = true
      AND (
        ${staffId} = ANY(staff_ids) 
        OR reserved_by = ${staffId}
      )
    `;

    if (existingShifts.length > 0) {
      return res.status(400).json({ error: 'Staff member already has a shift on this date' });
    }

    // Create the shift
    const { rows: createdShift } = await sql`
      INSERT INTO shifts (
        shift_id,
        date,
        shift_type,
        staff_ids,
        department,
        hospital,
        status,
        reserved_by,
        reserved_at,
        created_at,
        created_by,
        is_active
      ) VALUES (
        ${shiftData.id},
        ${shiftData.date},
        ${JSON.stringify(shiftData.type)},
        ${JSON.stringify([])},
        ${shiftData.department},
        ${shiftData.hospital},
        'reserved',
        ${staffId},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        ${staffMember.name},
        true
      )
      RETURNING *
    `;

    if (createdShift.length === 0) {
      return res.status(500).json({ error: 'Failed to create shift' });
    }

    // Return the created and reserved shift
    const shift = createdShift[0];
    res.status(200).json({
      message: 'Shift created and reserved successfully',
      shift: {
        id: shift.shift_id,
        date: shift.date,
        type: shift.shift_type,
        staffIds: shift.staff_ids,
        department: shift.department,
        hospital: shift.hospital,
        status: shift.status,
        reservedBy: shift.reserved_by,
        reservedAt: shift.reserved_at
      }
    });

  } catch (error) {
    console.error('Error creating and reserving shift:', error);
    res.status(500).json({ error: 'Failed to create and reserve shift' });
  }
}