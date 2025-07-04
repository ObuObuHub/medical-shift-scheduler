import { sql } from '@vercel/postgres';

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
    const staffResult = await sql`
      SELECT id, hospital, name FROM staff 
      WHERE id = ${staffId} AND is_active = true
    `;

    if (!staffResult || !staffResult.rows || staffResult.rows.length === 0) {
      console.error('Staff not found:', staffId);
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const staffRows = staffResult.rows;

    const staffMember = staffRows[0];

    // Validate staff belongs to the correct hospital
    if (staffMember.hospital !== shiftData.hospital) {
      return res.status(403).json({ error: 'Staff member does not belong to this hospital' });
    }

    // Check for existing shifts on the same date for this staff member
    const existingResult = await sql`
      SELECT shift_id FROM shifts 
      WHERE date = ${shiftData.date} 
      AND is_active = true
      AND (
        ${staffId} = ANY(staff_ids) 
        OR reserved_by = ${staffId}
      )
    `;

    if (existingResult && existingResult.rows && existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Staff member already has a shift on this date' });
    }

    // Create the shift
    const createResult = await sql`
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

    if (!createResult || !createResult.rows || createResult.rows.length === 0) {
      console.error('Failed to create shift');
      return res.status(500).json({ error: 'Failed to create shift' });
    }

    const createdShift = createResult.rows;

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
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create and reserve shift',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}