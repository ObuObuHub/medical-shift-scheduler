import { sql } from '../../../lib/vercel-db';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await sql`
      SELECT * FROM hospitals WHERE is_active = true ORDER BY name;
    `;
    
    // Convert to legacy format for compatibility
    const legacyHospitals = result.map(h => ({
      id: h.hospital_id,
      name: h.name
    }));

    res.status(200).json(legacyHospitals);
  } catch (error) {
    console.error('Error fetching public hospitals:', error);
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
}