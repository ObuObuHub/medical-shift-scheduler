import { sql } from '../../../../../lib/vercel-db';

export default async function handler(req, res) {
  // Enable CORS for public endpoint
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

  const { id: hospitalId } = req.query;

  try {
    // Get hospital configuration (read-only for public)
    const result = await sql`
      SELECT 
        hsc.*,
        h.name as hospital_name
      FROM hospital_shift_config hsc
      JOIN hospitals h ON hsc.hospital_id = h.hospital_id
      WHERE hsc.hospital_id = ${hospitalId}
    `;

    // Neon returns results directly as an array
    const rows = Array.isArray(result) ? result : (result?.rows || []);
    
    if (!rows || rows.length === 0) {
      // Return default configuration if none exists
      const defaultConfig = {
        hospital_id: hospitalId,
        shift_pattern: hospitalId === 'spital2' ? 'only_24' : 'standard_12_24',
        weekday_shifts: hospitalId === 'spital2' ? ['GARDA_24'] : ['NOAPTE'],
        weekend_shifts: hospitalId === 'spital2' ? ['GARDA_24'] : ['GARDA_ZI', 'NOAPTE', 'GARDA_24'],
        holiday_shifts: ['GARDA_24'],
        min_staff_per_shift: 1,
        max_consecutive_nights: 1,
        max_shifts_per_month: 10,
        shift_types: {
          GARDA_ZI: {
            id: 'GARDA_ZI',
            name: 'Gardă Zi',
            start: '08:00',
            end: '20:00',
            color: '#3B82F6',
            duration: 12
          },
          NOAPTE: {
            id: 'NOAPTE',
            name: 'Noapte',
            start: '20:00',
            end: '08:00',
            color: '#7C3AED',
            duration: 12
          },
          GARDA_24: {
            id: 'GARDA_24',
            name: 'Gardă 24h',
            start: '08:00',
            end: '08:00',
            color: '#10B981',
            duration: 24
          }
        },
        rules: {
          allow_consecutive_weekends: false,
          min_rest_hours: 12,
          max_consecutive_24h: 1
        }
      };
      
      // For spital2, only include 24h shift type
      if (hospitalId === 'spital2') {
        defaultConfig.shift_types = {
          GARDA_24: defaultConfig.shift_types.GARDA_24
        };
      }
      
      return res.status(200).json(defaultConfig);
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error fetching hospital configuration:', error);
    res.status(500).json({ error: 'Failed to fetch hospital configuration' });
  }
}