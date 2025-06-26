import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple auth check
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.JWT_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Update Spitalul Județean configuration to match real pattern
    const result = await sql`
      UPDATE hospital_shift_config
      SET 
        shift_pattern = 'standard_12_24',
        weekday_shifts = '["NOAPTE"]'::jsonb,
        weekend_shifts = '["GARDA_ZI", "NOAPTE", "GARDA_24"]'::jsonb,
        holiday_shifts = '["GARDA_24"]'::jsonb,
        min_staff_per_shift = 1,
        max_consecutive_nights = 2,
        max_shifts_per_month = 3,
        shift_types = '{
          "GARDA_ZI": {
            "id": "GARDA_ZI", 
            "name": "Gardă Zi (8-20)", 
            "start": "08:00", 
            "end": "20:00", 
            "color": "#3B82F6", 
            "duration": 12
          },
          "NOAPTE": {
            "id": "NOAPTE", 
            "name": "Gardă Noapte (20-8)", 
            "start": "20:00", 
            "end": "08:00", 
            "color": "#7C3AED", 
            "duration": 12
          },
          "GARDA_24": {
            "id": "GARDA_24", 
            "name": "Gardă 24h (8-8)", 
            "start": "08:00", 
            "end": "08:00", 
            "color": "#10B981", 
            "duration": 24
          }
        }'::jsonb,
        rules = '{
          "allow_consecutive_weekends": true,
          "min_rest_hours": 12,
          "special_saturdays": [2, 3],
          "last_friday_24h": true,
          "fair_distribution": true
        }'::jsonb,
        updated_at = CURRENT_TIMESTAMP
      WHERE hospital_id = 'spital1'
      RETURNING *
    `;

    res.status(200).json({ 
      message: 'Hospital configuration updated successfully',
      config: result.rows[0]
    });
  } catch (error) {
        res.status(500).json({ error: 'Failed to update configuration', details: error.message });
  }
}