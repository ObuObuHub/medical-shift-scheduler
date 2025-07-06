import { sql } from '../../../lib/vercel-db';
import { authMiddleware, runMiddleware } from '../../../lib/auth';
import logger from '../../../utils/logger';

export default async function handler(req, res) {
  try {
    await runMiddleware(req, res, authMiddleware);

    switch (req.method) {
      case 'GET':
        return await getPreferences(req, res);
      case 'PUT':
        return await updatePreferences(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    logger.error('Notification preferences API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPreferences(req, res) {
  try {
    const userId = req.user.id;

    const result = await sql`
      SELECT * FROM notification_preferences 
      WHERE user_id = ${userId}
    `;

    if (result.length === 0) {
      // Create default preferences if they don't exist
      const defaults = await sql`
        INSERT INTO notification_preferences (user_id)
        VALUES (${userId})
        RETURNING *
      `;
      return res.status(200).json(defaults[0]);
    }

    return res.status(200).json(result[0]);
  } catch (error) {
    logger.error('Failed to fetch notification preferences:', error);
    return res.status(500).json({ error: 'Failed to fetch preferences' });
  }
}

async function updatePreferences(req, res) {
  try {
    const userId = req.user.id;
    const {
      swapRequests,
      shiftAssignments,
      scheduleUpdates,
      systemAnnouncements,
      emailNotifications,
      pushNotifications,
      quietHoursStart,
      quietHoursEnd
    } = req.body;

    // Check if preferences exist
    const existing = await sql`
      SELECT id FROM notification_preferences 
      WHERE user_id = ${userId}
    `;

    if (existing.length === 0) {
      // Create new preferences
      const result = await sql`
        INSERT INTO notification_preferences (
          user_id,
          swap_requests,
          shift_assignments,
          schedule_updates,
          system_announcements,
          email_notifications,
          push_notifications,
          quiet_hours_start,
          quiet_hours_end
        )
        VALUES (
          ${userId},
          ${swapRequests ?? true},
          ${shiftAssignments ?? true},
          ${scheduleUpdates ?? true},
          ${systemAnnouncements ?? true},
          ${emailNotifications ?? false},
          ${pushNotifications ?? true},
          ${quietHoursStart || null},
          ${quietHoursEnd || null}
        )
        RETURNING *
      `;
      return res.status(200).json(result[0]);
    }

    // Update existing preferences
    const result = await sql`
      UPDATE notification_preferences 
      SET 
        swap_requests = ${swapRequests ?? sql`swap_requests`},
        shift_assignments = ${shiftAssignments ?? sql`shift_assignments`},
        schedule_updates = ${scheduleUpdates ?? sql`schedule_updates`},
        system_announcements = ${systemAnnouncements ?? sql`system_announcements`},
        email_notifications = ${emailNotifications ?? sql`email_notifications`},
        push_notifications = ${pushNotifications ?? sql`push_notifications`},
        quiet_hours_start = ${quietHoursStart !== undefined ? (quietHoursStart || null) : sql`quiet_hours_start`},
        quiet_hours_end = ${quietHoursEnd !== undefined ? (quietHoursEnd || null) : sql`quiet_hours_end`},
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId}
      RETURNING *
    `;

    return res.status(200).json(result[0]);
  } catch (error) {
    logger.error('Failed to update notification preferences:', error);
    return res.status(500).json({ error: 'Failed to update preferences' });
  }
}