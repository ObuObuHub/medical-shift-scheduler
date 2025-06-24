import { neon } from '@neondatabase/serverless';

// Database connection using Neon - allow undefined during build
const sql = neon(process.env.DATABASE_URL || 'postgresql://temp@temp/temp');
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
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
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

    console.log('Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
}

// Helper function to seed default data
export async function seedDefaultData() {
  try {
    // Check if data already exists
    const existingUsers = await sql`SELECT COUNT(*) as count FROM users`;
    if (existingUsers[0].count > 0) {
      console.log('Database already has data, skipping seed');
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
      VALUES ('Manager Spital', 'manager', ${managerPasswordHash}, 'manager', 'spital1', 'medic')
      RETURNING id;
    `;

    const adminId = adminUser[0].id;

    // Insert default hospitals
    await sql`
      INSERT INTO hospitals (hospital_id, name, created_by) VALUES
      ('spital1', 'Spital Județean Urgență', ${adminId}),
      ('spital2', 'Spital Municipal', ${adminId}),
      ('spital3', 'Spital Pediatrie', ${adminId});
    `;

    // Insert default shift types
    await sql`
      INSERT INTO shift_types (shift_id, name, start_time, end_time, color, duration, created_by) VALUES
      ('garda_zi', 'Gardă de Zi (12h)', '08:00', '20:00', '#10B981', 12, ${adminId}),
      ('noapte', 'Tură de Noapte (12h)', '20:00', '08:00', '#F59E0B', 12, ${adminId}),
      ('garda_24', 'Gardă 24 ore', '08:00', '08:00', '#EF4444', 24, ${adminId});
    `;

    // Insert default staff
    const staffData = [
      ['Dr. Popescu Ion', 'medic', 'Urgențe', 'spital1', 'manager'],
      ['Dr. Stanescu Mihai', 'medic', 'Urgențe', 'spital1', 'staff'],
      ['Dr. Popa Stefan', 'medic', 'Urgențe', 'spital1', 'staff'],
      ['Dr. Ionescu Maria', 'medic', 'Chirurgie', 'spital1', 'manager'],
      ['Dr. Dumitrescu Paul', 'medic', 'Chirurgie', 'spital1', 'staff'],
      ['Dr. Vlad Carmen', 'medic', 'Chirurgie', 'spital1', 'staff'],
      ['Dr. Radulescu Alex', 'medic', 'ATI', 'spital1', 'staff'],
      ['Dr. Constantinescu Ioana', 'medic', 'ATI', 'spital1', 'staff'],
      ['Dr. Radu Ana', 'medic', 'ATI', 'spital1', 'staff'],
      ['Dr. Gheorghe Andrei', 'medic', 'Pediatrie', 'spital2', 'manager'],
      ['Dr. Moraru Elena', 'medic', 'Pediatrie', 'spital2', 'staff'],
      ['Dr. Neagu Raluca', 'medic', 'Pediatrie', 'spital2', 'staff'],
      ['Dr. Georgescu Radu', 'medic', 'Cardiologie', 'spital1', 'staff'],
      ['Dr. Cristea Adriana', 'medic', 'Cardiologie', 'spital1', 'staff'],
      ['Dr. Petrescu Dana', 'medic', 'Neurologie', 'spital1', 'staff'],
      ['Dr. Enache Monica', 'medic', 'Neurologie', 'spital1', 'staff']
    ];

    for (const staff of staffData) {
      await sql`
        INSERT INTO staff (name, type, specialization, hospital, role, created_by)
        VALUES (${staff[0]}, ${staff[1]}, ${staff[2]}, ${staff[3]}, ${staff[4]}, ${adminId});
      `;
    }

    console.log('Default data seeded successfully');
    console.log('Login credentials:');
    console.log('Admin: username=admin, password=admin123');
    console.log('Manager: username=manager, password=manager123');
    console.log('NOTE: Passwords are securely hashed in the database');

  } catch (error) {
    console.error('Error seeding default data:', error);
    throw error;
  }
}