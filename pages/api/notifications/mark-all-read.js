import { sql } from '../../../lib/vercel-db';
import { authMiddleware, runMiddleware } from '../../../lib/auth';
import logger from '../../../utils/logger';

export default async function handler(req, res) {
  try {
    await runMiddleware(req, res, authMiddleware);

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = req.user.id;

    // Mark all unread notifications as read
    const result = await sql`
      UPDATE notifications 
      SET 
        read = true,
        read_at = CURRENT_TIMESTAMP
      WHERE 
        user_id = ${userId} 
        AND read = false
      RETURNING id
    `;

    return res.status(200).json({ 
      message: 'All notifications marked as read',
      count: result.length 
    });
  } catch (error) {
    logger.error('Failed to mark all notifications as read:', error);
    return res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
}