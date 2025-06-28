import { refreshSession, getSession } from '../../../lib/sessionManager';
import { generateToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Try to refresh the session
    const newSession = refreshSession(refreshToken);

    if (!newSession) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Get the new session data
    const sessionData = getSession(newSession.sessionId);

    if (!sessionData) {
      return res.status(401).json({ error: 'Session not found' });
    }

    // Generate new JWT token
    const token = generateToken({
      id: sessionData.userId,
      ...sessionData.userInfo
    });

    res.status(200).json({
      token,
      sessionId: newSession.sessionId,
      expiresIn: newSession.expiresIn,
      user: sessionData.userInfo
    });

  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}