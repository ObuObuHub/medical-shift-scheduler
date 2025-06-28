import { destroySession, destroyAllUserSessions } from '../../../lib/sessionManager';
import { authMiddleware, runMiddleware } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Optional: require authentication to logout (recommended)
    await runMiddleware(req, res, authMiddleware);

    const { sessionId, logoutAll } = req.body;

    if (logoutAll && req.user) {
      // Logout from all devices
      destroyAllUserSessions(req.user.id);
      res.status(200).json({ message: 'Logged out from all devices' });
    } else if (sessionId) {
      // Logout from specific session
      destroySession(sessionId);
      res.status(200).json({ message: 'Logged out successfully' });
    } else {
      res.status(400).json({ error: 'Session ID required' });
    }

  } catch (error) {
    // Even if there's an error, we can still respond with success
    // since the goal is to logout
    res.status(200).json({ message: 'Logged out' });
  }
}