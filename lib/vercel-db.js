import { neon, neonConfig } from '@neondatabase/serverless';

// Configure Neon for better performance
neonConfig.fetchConnectionCache = true; // Enable connection caching
neonConfig.poolQueryViaFetch = true; // Use fetch API for better edge performance

// Database connection using Neon - allow undefined during build
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://temp@temp/temp';

// Create the SQL query function with connection caching
const sql = neon(connectionString, {
  fetchOptions: {
    // Add cache headers for better performance
    cache: 'no-store', // Don't cache POST requests
    keepalive: true,   // Keep connection alive
  },
});

export { sql };

// Helper function to ensure tables exist
export async function initializeTables() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'staff',
        hospital VARCHAR(100) NOT NULL,
        type VARCHAR(50) DEFAULT 'medic',
        specialization VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create hospitals table
    await sql`
      CREATE TABLE IF NOT EXISTS hospitals (
        id SERIAL PRIMARY KEY,
        hospital_id VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create staff table
    await sql`
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'medic',
        specialization VARCHAR(100) NOT NULL,
        hospital VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'staff',
        unavailable JSONB DEFAULT '[]',
        max_guards_per_month INTEGER DEFAULT 10,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Add max_guards_per_month column if it doesn't exist (migration)
    await sql`
      ALTER TABLE staff 
      ADD COLUMN IF NOT EXISTS max_guards_per_month INTEGER DEFAULT 10;
    `;

    // Create shift_types table
    await sql`
      CREATE TABLE IF NOT EXISTS shift_types (
        id SERIAL PRIMARY KEY,
        shift_id VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        start_time VARCHAR(10) NOT NULL,
        end_time VARCHAR(10) NOT NULL,
        color VARCHAR(20) NOT NULL,
        duration INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create shifts table
    await sql`
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        shift_id VARCHAR(100) UNIQUE NOT NULL,
        date DATE NOT NULL,
        shift_type JSONB NOT NULL,
        staff_ids JSONB NOT NULL DEFAULT '[]',
        department VARCHAR(100),
        requirements JSONB DEFAULT '{"minDoctors": 1, "specializations": []}',
        coverage JSONB DEFAULT '{"adequate": false, "warnings": [], "recommendations": [], "staffBreakdown": {"doctors": 0, "total": 0}}',
        hospital VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create templates table
    await sql`
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        hospital VARCHAR(100) NOT NULL,
        template_data JSONB NOT NULL,
        template_type VARCHAR(50) DEFAULT 'monthly',
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_shifts_date_hospital ON shifts(date, hospital);
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_staff_hospital ON staff(hospital);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_hospitals_hospital_id ON hospitals(hospital_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_templates_hospital ON templates(hospital);
    `;

        return true;
  } catch (error) {
        throw error;
  }
}

// Helper function to seed default data
export async function seedDefaultData() {
  try {
    // Check if data already exists
    const existingUsers = await sql`SELECT COUNT(*) as count FROM users`;
    if (existingUsers[0].count > 0) {
            return;
    }

    // Hash default passwords
    const bcrypt = require('bcryptjs');
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const managerPasswordHash = await bcrypt.hash('manager123', 10);

    // Insert default users
    const adminUser = await sql`
      INSERT INTO users (name, username, password_hash, role, hospital, type)
      VALUES ('Administrator Principal', 'admin', ${adminPasswordHash}, 'admin', 'spital1', 'medic')
      RETURNING id;
    `;

    const managerUser = await sql`
      INSERT INTO users (name, username, password_hash, role, hospital, type)
      VALUES ('Manager Gărzi', 'manager', ${managerPasswordHash}, 'manager', 'spital1', 'medic')
      RETURNING id;
    `;

    const adminId = adminUser[0].id;

    // Insert default hospitals
    await sql`
      INSERT INTO hospitals (hospital_id, name, created_by) VALUES
      ('spital1', 'Spitalul Județean de Urgență Piatra-Neamț', ${adminId}),
      ('spital2', 'Spitalul "Prof. Dr. Eduard Apetrei" Buhuși', ${adminId});
    `;

    // Insert default shift types
    await sql`
      INSERT INTO shift_types (shift_id, name, start_time, end_time, color, duration, created_by) VALUES
      ('garda_zi', 'Gardă de Zi (12h)', '08:00', '20:00', '#10B981', 12, ${adminId}),
      ('noapte', 'Tură de Noapte (12h)', '20:00', '08:00', '#F59E0B', 12, ${adminId}),
      ('garda_24', 'Gardă 24 ore', '08:00', '08:00', '#EF4444', 24, ${adminId});
    `;

    // Insert default staff for Spitalul Județean de Urgență Piatra-Neamț
    const staffData = [
      // Laboratorul de analize medicale
      ['Dr. Zugun Eduard', 'medic', 'Laborator', 'spital1', 'staff'],
      ['Dr. Gîlea Arina', 'medic', 'Laborator', 'spital1', 'staff'],
      ['Dr. Manole Anca', 'medic', 'Laborator', 'spital1', 'staff'],
      ['Biol. Alforei Magda Elena', 'biolog', 'Laborator', 'spital1', 'staff'],
      ['Dr. Rusica Iovu Elena', 'medic', 'Laborator', 'spital1', 'staff'],
      ['Dr. Grădinariu Cristina', 'medic', 'Laborator', 'spital1', 'staff'],
      ['Dr. Ciorsac Alina', 'medic', 'Laborator', 'spital1', 'staff'],
      ['Dr. Constantinescu Raluca', 'medic', 'Laborator', 'spital1', 'staff'],
      ['Dr. Dobrea Letiția', 'medic', 'Laborator', 'spital1', 'staff'],
      ['Ch. Dobre Liliana Gabriela', 'chimist', 'Laborator', 'spital1', 'staff'],
      ['Dr. Chiper Leferman Andrei', 'medic', 'Laborator', 'spital1', 'staff']
    ];

    for (const staff of staffData) {
      await sql`
        INSERT INTO staff (name, type, specialization, hospital, role, created_by)
        VALUES (${staff[0]}, ${staff[1]}, ${staff[2]}, ${staff[3]}, ${staff[4]}, ${adminId});
      `;
    }

  } catch (error) {
        throw error;
  }
}