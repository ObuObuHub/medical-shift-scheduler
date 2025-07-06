import { sql } from '../../../lib/vercel-db';
import { authMiddleware, runMiddleware } from '../../../lib/auth';
import logger from '../../../utils/logger';

export default async function handler(req, res) {
  try {
    await runMiddleware(req, res, authMiddleware);

    switch (req.method) {
      case 'GET':
        return await getNotifications(req, res);
      case 'POST':
        return await createNotification(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    logger.error('Notifications API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getNotifications(req, res) {
  try {
    const { unreadOnly, type, limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;

    let query = sql`
      SELECT * FROM notifications 
      WHERE user_id = ${userId}
    `;

    // Add filters
    if (unreadOnly === 'true') {
      query = sql`${query} AND read = false`;
    }

    if (type) {
      query = sql`${query} AND type = ${type}`;
    }

    // Add ordering and pagination
    const result = await sql`
      ${query}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Get unread count
    const unreadCount = await sql`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = ${userId} AND read = false
    `;

    return res.status(200).json({
      notifications: result,
      unreadCount: unreadCount[0].count,
      total: result.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('Failed to fetch notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

async function createNotification(req, res) {
  try {
    const { userId, type, title, message, metadata, hospital, department, expiresAt } = req.body;

    // Validate required fields
    if (!userId || !type || !title || !message) {
      return res.status(400).json({ 
        error: 'userId, type, title, and message are required' 
      });
    }

    // Validate notification type
    const validTypes = ['info', 'success', 'warning', 'error', 'swap_request', 'shift_assigned', 'shift_cancelled', 'schedule_published'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    const result = await sql`
      INSERT INTO notifications (
        user_id, type, title, message, metadata, 
        hospital, department, expires_at
      )
      VALUES (
        ${userId},
        ${type},
        ${title},
        ${message},
        ${JSON.stringify(metadata || {})},
        ${hospital || null},
        ${department || null},
        ${expiresAt || null}
      )
      RETURNING *
    `;

    return res.status(201).json(result[0]);
  } catch (error) {
    logger.error('Failed to create notification:', error);
    return res.status(500).json({ error: 'Failed to create notification' });
  }
}