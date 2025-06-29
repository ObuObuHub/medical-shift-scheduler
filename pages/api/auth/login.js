import { sql } from '../../../lib/vercel-db';
import bcrypt from 'bcryptjs';
import { generateToken } from '../../../lib/auth';
import { checkRateLimit, resetRateLimit } from '../../../lib/rateLimiter';
import { createSession } from '../../../lib/sessionManager';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Check rate limit based on IP and username
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const rateLimitKey = `${clientIp}:${username.toLowerCase()}`;
    const rateLimit = checkRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      return res.status(429).json({ 
        error: 'Too many login attempts. Please try again later.',
        retryAfter: rateLimit.retryAfter
      });
    }

    // Find user in database
    const userResult = await sql`
      SELECT * FROM users 
      WHERE username = ${username.toLowerCase()} AND is_active = true;
    `;

    const user = userResult[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    // Create session
    const session = createSession(user.id, {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      hospital: user.hospital,
      type: user.type,
      specialization: user.specialization
    }, rememberMe);

    // Reset rate limit on successful login
    resetRateLimit(rateLimitKey);

    res.status(200).json({
      token,
      sessionId: session.sessionId,
      refreshToken: session.refreshToken,
      expiresIn: session.expiresIn,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        hospital: user.hospital,
        type: user.type,
        specialization: user.specialization
      }
    });

  } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
  }
}