import { sql } from '@vercel/postgres';
import reservationService from '../../../../lib/reservationService';

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

    // Use the unified reservation service
    const result = await reservationService.createAndReserveShift(shiftData, staffId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Return the created and reserved shift
    const shift = result.shift;
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