import { sql } from '../../../lib/vercel-db';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { hospital, startDate, endDate } = req.query;
    
    let result;
    
    if (hospital && startDate && endDate) {
      result = await sql`
        SELECT * FROM shifts 
        WHERE is_active = true AND hospital = ${hospital} 
        AND date >= ${startDate} AND date <= ${endDate}
        ORDER BY date;
      `;
    } else if (hospital && startDate) {
      result = await sql`
        SELECT * FROM shifts 
        WHERE is_active = true AND hospital = ${hospital} 
        AND date >= ${startDate}
        ORDER BY date;
      `;
    } else if (hospital) {
      result = await sql`
        SELECT * FROM shifts 
        WHERE is_active = true AND hospital = ${hospital}
        ORDER BY date;
      `;
    } else {
      // Return empty object if no hospital specified (for initial load)
      return res.status(200).json({});
    }
    
    // Group shifts by date
    const shiftsByDate = {};
    result.forEach(shift => {
      const dateKey = shift.date.toISOString().split('T')[0];
      if (!shiftsByDate[dateKey]) {
        shiftsByDate[dateKey] = [];
      }
      
      // Convert to legacy format
      shiftsByDate[dateKey].push({
        id: shift.shift_id,
        date: dateKey,
        type: shift.shift_type,
        staffIds: shift.staff_ids || [],
        hospital: shift.hospital,
        department: shift.department,
        requirements: shift.requirements || {},
        coverage: shift.coverage || {},
        status: shift.status || 'open',
        // Remove reserved_by and reserved_at - use staffIds instead
      });
    });

    res.status(200).json(shiftsByDate);
  } catch (error) {
    console.error('Error fetching public shifts:', error);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
}