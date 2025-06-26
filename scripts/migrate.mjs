import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Set the connection string
process.env.POSTGRES_URL = process.env.DATABASE_URL;

async function runMigration() {
  console.log('🚀 Starting database migration...\n');
  const results = [];

  try {
    // 1. Update shifts table
    console.log('📋 Updating shifts table...');
    try {
      await sql`
        ALTER TABLE shifts 
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'reserved', 'confirmed', 'swap_requested'))
      `;
      await sql`ALTER TABLE shifts ADD COLUMN IF NOT EXISTS reserved_by INTEGER REFERENCES staff(id)`;
      await sql`ALTER TABLE shifts ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMP`;
      await sql`ALTER TABLE shifts ADD COLUMN IF NOT EXISTS swap_request_id INTEGER`;
      results.push('✅ Updated shifts table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        results.push('⚠️  Shifts table columns already exist');
      } else {
        results.push(`❌ Error updating shifts table: ${error.message}`);
      }
    }

    // 2. Create shift swap requests table
    console.log('📋 Creating shift_swap_requests table...');
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
      results.push('✅ Created shift_swap_requests table');
    } catch (error) {
      results.push(`❌ Error creating shift_swap_requests: ${error.message}`);
    }

    // 3. Create hospital shift configuration table
    console.log('📋 Creating hospital_shift_config table...');
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS hospital_shift_config (
          id SERIAL PRIMARY KEY,
          hospital_id VARCHAR(255) NOT NULL,
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
      results.push('✅ Created hospital_shift_config table');
    } catch (error) {
      results.push(`❌ Error creating hospital_shift_config: ${error.message}`);
    }

    // 4. Create staff shift preferences table
    console.log('📋 Creating staff_shift_preferences table...');
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
      results.push('✅ Created staff_shift_preferences table');
    } catch (error) {
      results.push(`❌ Error creating staff_shift_preferences: ${error.message}`);
    }

    // 5. Insert default hospital configurations
    console.log('📋 Inserting default hospital configurations...');
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
        )
        ON CONFLICT (hospital_id) DO NOTHING
      `;
      results.push('✅ Inserted config for Spitalul Județean de Urgență');

      await sql`
        INSERT INTO hospital_shift_config (hospital_id, shift_pattern, weekday_shifts, weekend_shifts, holiday_shifts, min_staff_per_shift, max_consecutive_nights, max_shifts_per_month, shift_types, rules)
        VALUES 
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
      results.push('✅ Inserted config for Spitalul Eduard Apetrei');
    } catch (error) {
      results.push(`⚠️  Hospital configs may already exist: ${error.message}`);
    }

    console.log('\n📊 Migration Summary:');
    console.log('===================');
    results.forEach(result => console.log(result));
    
    const successful = results.filter(r => r.includes('✅')).length;
    const warnings = results.filter(r => r.includes('⚠️')).length;
    const failed = results.filter(r => r.includes('❌')).length;
    
    console.log('\n📈 Statistics:');
    console.log(`✅ Successful: ${successful}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with some errors.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigration();