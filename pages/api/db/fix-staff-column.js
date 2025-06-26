import { sql } from '../../../lib/vercel-db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Add the missing column if it doesn't exist
    await sql`
      ALTER TABLE staff 
      ADD COLUMN IF NOT EXISTS max_guards_per_month INTEGER DEFAULT 10;
    `;

    // Verify the column was added
    const result = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'staff' 
      AND column_name = 'max_guards_per_month';
    `;

    if (result.length > 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'Column max_guards_per_month added successfully' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to verify column addition' 
      });
    }
  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}