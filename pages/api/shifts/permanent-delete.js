import { sql } from '../../../lib/vercel-db';
import { authMiddleware, requireRole, runMiddleware } from '../../../lib/auth';

export default async function handler(req, res) {
  try {
    await runMiddleware(req, res, authMiddleware);
    await runMiddleware(req, res, requireRole(['admin', 'manager']));

    if (req.method !== 'DELETE') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { hospital, month, year, force } = req.query;

    if (!hospital || !month || !year) {
      return res.status(400).json({ 
        error: 'Hospital, month, and year are required' 
      });
    }

    // Only admins can force permanent delete
    if (force === 'true' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Only administrators can permanently delete shifts' 
      });
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    let result;
    
    if (force === 'true') {
      // PERMANENT DELETE - actually remove from database
      result = await sql`
        DELETE FROM shifts 
        WHERE hospital = ${hospital} 
          AND date >= ${startDate} 
          AND date <= ${endDate}
        RETURNING shift_id;
      `;
      
      console.log(`PERMANENTLY deleted ${result.length} shifts for ${hospital} in ${month}/${year}`);
      
      res.status(200).json({ 
        message: 'Shifts permanently deleted',
        deletedCount: result.length,
        permanent: true
      });
    } else {
      // Soft delete - mark as inactive
      result = await sql`
        UPDATE shifts 
        SET is_active = false, 
            updated_at = CURRENT_TIMESTAMP
        WHERE hospital = ${hospital} 
          AND date >= ${startDate} 
          AND date <= ${endDate}
          AND is_active = true
        RETURNING shift_id;
      `;
      
      res.status(200).json({ 
        message: 'Shifts marked as deleted',
        deletedCount: result.length,
        permanent: false
      });
    }

  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ 
      error: 'Failed to delete shifts',
      details: error.message 
    });
  }
}