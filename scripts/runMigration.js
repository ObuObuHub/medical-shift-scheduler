const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '001_shift_features.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons but be careful with functions that contain semicolons
    const statements = [];
    let currentStatement = '';
    let inFunction = false;
    
    migrationSQL.split('\n').forEach(line => {
      if (line.trim().toUpperCase().startsWith('CREATE OR REPLACE FUNCTION')) {
        inFunction = true;
      }
      
      currentStatement += line + '\n';
      
      if (line.trim().endsWith('$$;') || line.trim().endsWith('$$ LANGUAGE plpgsql;')) {
        inFunction = false;
      }
      
      if (line.trim().endsWith(';') && !inFunction) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    });
    
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    // Execute each statement
    let successCount = 0;
    for (const statement of statements) {
      if (statement && !statement.startsWith('--')) {
        try {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          await sql.query(statement);
          successCount++;
        } catch (error) {
          console.error(`Error executing statement: ${error.message}`);
          // Continue with other statements
        }
      }
    }
    
    console.log(`Migration completed! ${successCount} statements executed successfully.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Set environment variables
process.env.POSTGRES_URL = process.env.DATABASE_URL || 'postgres://neondb_owner:npg_O6Wz7SkAvZNx@ep-billowing-brook-a2xtu503-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require';

runMigration();