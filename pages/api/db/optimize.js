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
    const results = [];

    // 1. Add compound index for shift queries with date ranges
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_shifts_hospital_date 
        ON shifts(hospital, date) 
        WHERE is_active = true
      `;
      results.push('✓ Created index idx_shifts_hospital_date for faster shift queries');
    } catch (error) {
      results.push(`✗ Error creating idx_shifts_hospital_date: ${error.message}`);
    }

    // 2. Add index for staff availability checks
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_staff_hospital_active 
        ON staff(hospital, is_active)
      `;
      results.push('✓ Created index idx_staff_hospital_active for staff queries');
    } catch (error) {
      results.push(`✗ Error creating idx_staff_hospital_active: ${error.message}`);
    }

    // 3. Add compound index for swap request queries
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_swap_requests_hospital_status 
        ON shift_swap_requests(hospital, status)
      `;
      results.push('✓ Created index idx_swap_requests_hospital_status for swap queries');
    } catch (error) {
      results.push(`✗ Error creating idx_swap_requests_hospital_status: ${error.message}`);
    }

    // 4. Add index for user authentication
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_users_username 
        ON users(username) 
        WHERE is_active = true
      `;
      results.push('✓ Created index idx_users_username for faster authentication');
    } catch (error) {
      results.push(`✗ Error creating idx_users_username: ${error.message}`);
    }

    // 5. Add index for shift date queries
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_shifts_date 
        ON shifts(date) 
        WHERE is_active = true
      `;
      results.push('✓ Created index idx_shifts_date for date-based queries');
    } catch (error) {
      results.push(`✗ Error creating idx_shifts_date: ${error.message}`);
    }

    // 6. Add index for shift reservations
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_shifts_reserved_by_date 
        ON shifts(reserved_by, date) 
        WHERE reserved_by IS NOT NULL AND is_active = true
      `;
      results.push('✓ Created index idx_shifts_reserved_by_date for reservation queries');
    } catch (error) {
      results.push(`✗ Error creating idx_shifts_reserved_by_date: ${error.message}`);
    }

    // 7. Add index for templates
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_templates_hospital_active 
        ON templates(hospital) 
        WHERE is_active = true
      `;
      results.push('✓ Created index idx_templates_hospital_active for template queries');
    } catch (error) {
      results.push(`✗ Error creating idx_templates_hospital_active: ${error.message}`);
    }

    // 8. Add index for staff specialization queries
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_staff_specialization 
        ON staff(specialization, hospital) 
        WHERE is_active = true
      `;
      results.push('✓ Created index idx_staff_specialization for department filtering');
    } catch (error) {
      results.push(`✗ Error creating idx_staff_specialization: ${error.message}`);
    }

    // 9. Analyze tables to update statistics
    const tables = ['users', 'staff', 'shifts', 'shift_swap_requests', 'hospitals', 'templates'];
    for (const table of tables) {
      try {
        await sql.query(`ANALYZE ${table}`);
        results.push(`✓ Updated statistics for ${table} table`);
      } catch (error) {
        results.push(`⚠ Could not analyze ${table}: ${error.message}`);
      }
    }

    res.status(200).json({ 
      message: 'Database optimization completed',
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.startsWith('✓')).length,
        failed: results.filter(r => r.startsWith('✗')).length,
        warnings: results.filter(r => r.startsWith('⚠')).length
      },
      recommendations: [
        'Run this optimization after importing large datasets',
        'Monitor query performance with EXPLAIN ANALYZE',
        'Consider running VACUUM periodically for better performance'
      ]
    });
  } catch (error) {
    res.status(500).json({ error: 'Optimization failed', details: error.message });
  }
}