import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple auth check - in production, use proper authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.JWT_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting database migration...');
    const results = [];

    // 1. Update shifts table
    try {
      await sql`
        ALTER TABLE shifts 
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'reserved', 'confirmed', 'swap_requested')),
        ADD COLUMN IF NOT EXISTS reserved_by INTEGER REFERENCES staff(id),
        ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS swap_request_id INTEGER
      `;
      results.push('✓ Updated shifts table');
    } catch (error) {
      results.push(`✗ Error updating shifts table: ${error.message}`);
    }

    // 2. Create shift swap requests table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS shift_swap_requests (
          id SERIAL PRIMARY KEY,
          requester_id INTEGER NOT NULL REFERENCES staff(id),
          target_staff_id INTEGER REFERENCES staff(id),
          shift_id VARCHAR(255) NOT NULL,
          shift_date DATE NOT NULL,
          shift_type JSONB NOT NULL,
          requested_shift_id VARCHAR(255),
          requested_shift_date DATE,
          requested_shift_type JSONB,
          reason TEXT,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
          reviewed_by INTEGER REFERENCES staff(id),
          reviewed_at TIMESTAMP,
          review_comment TEXT,
          hospital VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      results.push('✓ Created shift_swap_requests table');
    } catch (error) {
      results.push(`✗ Error creating shift_swap_requests table: ${error.message}`);
    }

    // 3. Create hospital shift configuration table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS hospital_shift_config (
          id SERIAL PRIMARY KEY,
          hospital_id VARCHAR(255) NOT NULL REFERENCES hospitals(hospital_id),
          shift_pattern VARCHAR(50) NOT NULL,
          weekday_shifts JSONB,
          weekend_shifts JSONB,
          holiday_shifts JSONB,
          min_staff_per_shift INTEGER DEFAULT 1,
          max_consecutive_nights INTEGER DEFAULT 1,
          max_shifts_per_month INTEGER DEFAULT 10,
          shift_types JSONB,
          rules JSONB,
          is_active BOOLEAN DEFAULT true,
          created_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(hospital_id)
        )
      `;
      results.push('✓ Created hospital_shift_config table');
    } catch (error) {
      results.push(`✗ Error creating hospital_shift_config table: ${error.message}`);
    }

    // 4. Create staff shift preferences table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS staff_shift_preferences (
          id SERIAL PRIMARY KEY,
          staff_id INTEGER NOT NULL REFERENCES staff(id),
          preferred_shift_types JSONB,
          avoided_shift_types JSONB,
          preferred_days JSONB,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(staff_id)
        )
      `;
      results.push('✓ Created staff_shift_preferences table');
    } catch (error) {
      results.push(`✗ Error creating staff_shift_preferences table: ${error.message}`);
    }

    // 5. Create indexes
    const indexes = [
      { name: 'idx_shifts_status', table: 'shifts', column: 'status' },
      { name: 'idx_shifts_reserved_by', table: 'shifts', column: 'reserved_by' },
      { name: 'idx_swap_requests_requester', table: 'shift_swap_requests', column: 'requester_id' },
      { name: 'idx_swap_requests_status', table: 'shift_swap_requests', column: 'status' },
      { name: 'idx_swap_requests_hospital', table: 'shift_swap_requests', column: 'hospital' }
    ];

    for (const index of indexes) {
      try {
        await sql.query(`CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${index.column})`);
        results.push(`✓ Created index ${index.name}`);
      } catch (error) {
        results.push(`✗ Error creating index ${index.name}: ${error.message}`);
      }
    }

    // 6. Insert default hospital configurations
    try {
      await sql`
        INSERT INTO hospital_shift_config (hospital_id, shift_pattern, weekday_shifts, weekend_shifts, holiday_shifts, min_staff_per_shift, max_consecutive_nights, max_shifts_per_month, shift_types, rules)
        VALUES 
        ('spital1', 'standard_12_24', 
         '["NOAPTE"]'::jsonb,
         '["GARDA_ZI", "NOAPTE", "GARDA_24"]'::jsonb,
         '["GARDA_24"]'::jsonb,
         1, 1, 10,
         '{
           "GARDA_ZI": {"id": "GARDA_ZI", "name": "Gardă Zi", "start": "08:00", "end": "20:00", "color": "#3B82F6", "duration": 12},
           "NOAPTE": {"id": "NOAPTE", "name": "Noapte", "start": "20:00", "end": "08:00", "color": "#7C3AED", "duration": 12},
           "GARDA_24": {"id": "GARDA_24", "name": "Gardă 24h", "start": "08:00", "end": "08:00", "color": "#10B981", "duration": 24}
         }'::jsonb,
         '{"allow_consecutive_weekends": false, "min_rest_hours": 12}'::jsonb
        ),
        ('spital2', 'only_24',
         '["GARDA_24"]'::jsonb,
         '["GARDA_24"]'::jsonb,
         '["GARDA_24"]'::jsonb,
         1, 0, 8,
         '{
           "GARDA_24": {"id": "GARDA_24", "name": "Gardă 24 ore", "start": "08:00", "end": "08:00", "color": "#10B981", "duration": 24}
         }'::jsonb,
         '{"min_rest_hours": 24, "max_consecutive_24h": 1}'::jsonb
        )
        ON CONFLICT (hospital_id) DO NOTHING
      `;
      results.push('✓ Inserted default hospital configurations');
    } catch (error) {
      results.push(`✗ Error inserting hospital configs: ${error.message}`);
    }

    // 7. Create trigger function
    try {
      await sql`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `;
      results.push('✓ Created update trigger function');
    } catch (error) {
      results.push(`✗ Error creating trigger function: ${error.message}`);
    }

    // 8. Create triggers
    const triggers = [
      { name: 'update_shift_swap_requests_updated_at', table: 'shift_swap_requests' },
      { name: 'update_hospital_shift_config_updated_at', table: 'hospital_shift_config' },
      { name: 'update_staff_shift_preferences_updated_at', table: 'staff_shift_preferences' }
    ];

    for (const trigger of triggers) {
      try {
        await sql.query(`
          CREATE TRIGGER ${trigger.name} 
          BEFORE UPDATE ON ${trigger.table} 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);
        results.push(`✓ Created trigger ${trigger.name}`);
      } catch (error) {
        // Trigger might already exist
        results.push(`⚠ Trigger ${trigger.name}: ${error.message}`);
      }
    }

    res.status(200).json({ 
      message: 'Migration completed',
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.startsWith('✓')).length,
        failed: results.filter(r => r.startsWith('✗')).length,
        warnings: results.filter(r => r.startsWith('⚠')).length
      }
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Migration failed', details: error.message });
  }
}