import { sql } from '../../../lib/vercel-db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if shifts table has the required columns
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'shifts' 
      AND column_name IN ('status', 'reserved_by', 'reserved_at')
    `;

    const existingColumns = result.map(row => row.column_name);
    const requiredColumns = ['status', 'reserved_by', 'reserved_at'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      // Run migration
      try {
        await sql`
          ALTER TABLE shifts 
          ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'reserved', 'confirmed', 'swap_requested')),
          ADD COLUMN IF NOT EXISTS reserved_by INTEGER REFERENCES staff(id),
          ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS swap_request_id INTEGER
        `;
        
        return res.status(200).json({ 
          message: 'Migration completed successfully',
          addedColumns: missingColumns
        });
      } catch (migrationError) {
        return res.status(500).json({ 
          error: 'Migration failed',
          details: migrationError.message
        });
      }
    }

    return res.status(200).json({ 
      message: 'Database is up to date',
      columns: existingColumns
    });
  } catch (error) {
    console.error('Database check error:', error);
    res.status(500).json({ 
      error: 'Failed to check database',
      details: error.message
    });
  }
}