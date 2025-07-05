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

    console.log('Received request:', { shiftData, staffId });

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
        staff_ids::jsonb @> ${JSON.stringify([staffId])}::jsonb
        OR reserved_by = ${staffId}
      )
    `;

    if (existingResult && existingResult.rows && existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Staff member already has a shift on this date' });
    }

    // Check reservation limit (2 active reservations per staff member)
    // Note: Since this is a public endpoint, we can't check user role
    // All staff using this endpoint will have the 2 reservation limit
    const reservationCountResult = await sql`
      SELECT COUNT(*) as count
      FROM shifts
      WHERE reserved_by = ${staffId}
        AND status = 'reserved'
        AND is_active = true
    `;

    const reservationCount = parseInt(reservationCountResult.rows[0].count);
    if (reservationCount >= 2) {
      return res.status(400).json({ 
        error: 'You have reached the maximum of 2 shift reservations. Please cancel an existing reservation before making a new one.',
        currentReservations: reservationCount
      });
    }

    // Create the shift - try to match the structure from other endpoints
    let createResult;
    try {
      console.log('Attempting to create shift with data:', {
        id: shiftData.id,
        date: shiftData.date,
        hospital: shiftData.hospital,
        department: shiftData.department,
        staffId: staffId
      });

      // Note: created_by is NULL because this is a public endpoint without authentication
      // The created_by field has a foreign key to users table, not staff table
      const { rows } = await sql`
        INSERT INTO shifts (
          shift_id,
          date,
          shift_type,
          staff_ids,
          department,
          requirements,
          coverage,
          hospital,
          created_by,
          status,
          reserved_by,
          reserved_at,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          ${shiftData.id},
          ${shiftData.date},
          ${JSON.stringify(shiftData.type)},
          ${JSON.stringify([])},
          ${shiftData.department || null},
          ${JSON.stringify(shiftData.requirements || { minDoctors: 1, specializations: [] })},
          ${JSON.stringify({ adequate: true, warnings: [], recommendations: [], staffBreakdown: { doctors: 1, total: 1 } })},
          ${shiftData.hospital},
          NULL,
          'reserved',
          ${staffId},
          CURRENT_TIMESTAMP,
          true,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING *
      `;
      
      createResult = rows;
    } catch (sqlError) {
      console.error('SQL Error:', sqlError);
      console.error('SQL Error message:', sqlError.message);
      console.error('SQL Error code:', sqlError.code);
      return res.status(500).json({ 
        error: 'Database error while creating shift',
        details: sqlError.message 
      });
    }

    if (!createResult || createResult.length === 0) {
      console.error('No rows returned from insert');
      return res.status(500).json({ error: 'Failed to create shift - no rows returned' });
    }

    const createdShift = createResult;

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