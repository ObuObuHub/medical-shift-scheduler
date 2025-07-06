import { sql } from '../../../lib/vercel-db';
import { authMiddleware, runMiddleware } from '../../../lib/auth';
import logger from '../../../utils/logger';

export default async function handler(req, res) {
  try {
    await runMiddleware(req, res, authMiddleware);

    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Notification ID is required' });
    }

    switch (req.method) {
      case 'GET':
        return await getNotification(req, res);
      case 'PATCH':
        return await updateNotification(req, res);
      case 'DELETE':
        return await deleteNotification(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    logger.error('Notification API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getNotification(req, res) {
  try {
    const { id } = req.query;
    const userId = req.user.id;

    const result = await sql`
      SELECT * FROM notifications 
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.status(200).json(result[0]);
  } catch (error) {
    logger.error('Failed to fetch notification:', error);
    return res.status(500).json({ error: 'Failed to fetch notification' });
  }
}

async function updateNotification(req, res) {
  try {
    const { id } = req.query;
    const userId = req.user.id;
    const { read } = req.body;

    // Check if notification exists and belongs to user
    const existing = await sql`
      SELECT id FROM notifications 
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Update notification
    const result = await sql`
      UPDATE notifications 
      SET 
        read = ${read !== undefined ? read : sql`read`},
        read_at = ${read ? sql`CURRENT_TIMESTAMP` : sql`read_at`}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    return res.status(200).json(result[0]);
  } catch (error) {
    logger.error('Failed to update notification:', error);
    return res.status(500).json({ error: 'Failed to update notification' });
  }
}

async function deleteNotification(req, res) {
  try {
    const { id } = req.query;
    const userId = req.user.id;

    const result = await sql`
      DELETE FROM notifications 
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete notification:', error);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
}