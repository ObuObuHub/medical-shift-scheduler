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
    // First, check if the table exists
    await sql`
      CREATE TABLE IF NOT EXISTS hospital_shift_config (
        id SERIAL PRIMARY KEY,
        hospital_id VARCHAR(100) UNIQUE NOT NULL,
        shift_pattern VARCHAR(50) NOT NULL,
        weekday_shifts JSONB DEFAULT '[]',
        weekend_shifts JSONB DEFAULT '[]',
        holiday_shifts JSONB DEFAULT '[]',
        min_staff_per_shift INTEGER DEFAULT 1,
        max_consecutive_nights INTEGER DEFAULT 1,
        max_shifts_per_month INTEGER DEFAULT 10,
        shift_types JSONB DEFAULT '{}',
        rules JSONB DEFAULT '{}',
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Setup configuration for Spitalul Județean de Urgență Piatra-Neamț
    await sql`
      INSERT INTO hospital_shift_config (
        hospital_id,
        shift_pattern,
        weekday_shifts,
        weekend_shifts,
        holiday_shifts,
        min_staff_per_shift,
        max_consecutive_nights,
        max_shifts_per_month,
        shift_types,
        rules
      ) VALUES (
        'spital1',
        'standard_12_24',
        '["NOAPTE"]'::jsonb,
        '["GARDA_ZI", "NOAPTE", "GARDA_24"]'::jsonb,
        '["GARDA_24"]'::jsonb,
        1,
        2,
        10,
        '{
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
        '{
          "allow_consecutive_weekends": true,
          "min_rest_hours": 12,
          "special_saturdays": [2, 3],
          "last_friday_24h": true,
          "fair_distribution": true
        }'::jsonb
      )
      ON CONFLICT (hospital_id) 
      DO UPDATE SET
        shift_pattern = EXCLUDED.shift_pattern,
        weekday_shifts = EXCLUDED.weekday_shifts,
        weekend_shifts = EXCLUDED.weekend_shifts,
        holiday_shifts = EXCLUDED.holiday_shifts,
        min_staff_per_shift = EXCLUDED.min_staff_per_shift,
        max_consecutive_nights = EXCLUDED.max_consecutive_nights,
        max_shifts_per_month = EXCLUDED.max_shifts_per_month,
        shift_types = EXCLUDED.shift_types,
        rules = EXCLUDED.rules,
        updated_at = CURRENT_TIMESTAMP;
    `;

    // Setup configuration for Spitalul "Prof. Dr. Eduard Apetrei" Buhușl
    await sql`
      INSERT INTO hospital_shift_config (
        hospital_id,
        shift_pattern,
        weekday_shifts,
        weekend_shifts,
        holiday_shifts,
        min_staff_per_shift,
        max_consecutive_nights,
        max_shifts_per_month,
        shift_types,
        rules
      ) VALUES (
        'spital2',
        'only_24',
        '["GARDA_24"]'::jsonb,
        '["GARDA_24"]'::jsonb,
        '["GARDA_24"]'::jsonb,
        1,
        1,
        10,
        '{
          "GARDA_24": {
            "id": "GARDA_24",
            "name": "Gardă 24h (8-8)",
            "start": "08:00",
            "end": "08:00",
            "color": "#10B981",
            "duration": 24
          }
        }'::jsonb,
        '{
          "allow_consecutive_weekends": false,
          "min_rest_hours": 24,
          "max_consecutive_24h": 1,
          "fair_distribution": true
        }'::jsonb
      )
      ON CONFLICT (hospital_id) 
      DO UPDATE SET
        shift_pattern = EXCLUDED.shift_pattern,
        weekday_shifts = EXCLUDED.weekday_shifts,
        weekend_shifts = EXCLUDED.weekend_shifts,
        holiday_shifts = EXCLUDED.holiday_shifts,
        min_staff_per_shift = EXCLUDED.min_staff_per_shift,
        max_consecutive_nights = EXCLUDED.max_consecutive_nights,
        max_shifts_per_month = EXCLUDED.max_shifts_per_month,
        shift_types = EXCLUDED.shift_types,
        rules = EXCLUDED.rules,
        updated_at = CURRENT_TIMESTAMP;
    `;

    res.status(200).json({ 
      message: 'Hospital configurations set up successfully',
      configurations: {
        spital1: 'Spitalul Județean - Complex pattern with nights on weekdays, mixed on weekends',
        spital2: 'Spitalul Apetrei - Only 24-hour shifts every day'
      }
    });
  } catch (error) {
        res.status(500).json({ error: 'Failed to setup configurations', details: error.message });
  }
}