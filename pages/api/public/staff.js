import { sql } from '../../../lib/vercel-db';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { hospital } = req.query;
    
    let result;
    if (hospital) {
      result = await sql`
        SELECT * FROM staff 
        WHERE is_active = true AND hospital = ${hospital} 
        ORDER BY name;
      `;
    } else {
      result = await sql`
        SELECT * FROM staff 
        WHERE is_active = true 
        ORDER BY name;
      `;
    }
    
    // Convert to legacy format for compatibility
    const legacyStaff = result.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      specialization: s.specialization,
      hospital: s.hospital,
      role: s.role,
      unavailable: s.unavailable || [],
      maxGuardsPerMonth: s.max_guards_per_month || 10
    }));

    res.status(200).json(legacyStaff);
  } catch (error) {
    console.error('Error fetching public staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
}