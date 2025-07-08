import { sql } from '@vercel/postgres';
import reservationService from '../../../../lib/reservationService';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { staffId, year, month } = req.query;

    if (!staffId) {
      return res.status(400).json({ error: 'Staff ID is required' });
    }

    // Default to current month if not provided
    const now = new Date();
    const targetYear = year ? parseInt(year) : now.getFullYear();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

    // Validate staff exists
    const { rows: staffRows } = await sql`
      SELECT id FROM staff WHERE id = ${staffId} AND is_active = true
    `;

    if (staffRows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Get reservation statistics
    const stats = await reservationService.getReservationStats(
      parseInt(staffId),
      targetYear,
      targetMonth
    );

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting reservation stats:', error);
    res.status(500).json({ error: 'Failed to get reservation statistics' });
  }
}