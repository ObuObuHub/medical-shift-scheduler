import crypto from 'crypto';

// In-memory session store (consider using Redis in production)
const sessions = new Map();
const refreshTokens = new Map();

// Clean up expired sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(sessionId);
    }
  }
  for (const [token, data] of refreshTokens.entries()) {
    if (data.expiresAt < now) {
      refreshTokens.delete(token);
    }
  }
}, 60 * 60 * 1000);

export function createSession(userId, userInfo, rememberMe = false) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const refreshToken = crypto.randomBytes(32).toString('hex');
  
  const accessTokenExpiry = 15 * 60 * 1000; // 15 minutes
  const refreshTokenExpiry = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000; // 30 days if remember me, 7 days otherwise
  
  const now = Date.now();
  
  // Store session
  sessions.set(sessionId, {
    userId,
    userInfo,
    createdAt: now,
    expiresAt: now + accessTokenExpiry,
    lastActivity: now
  });
  
  // Store refresh token
  refreshTokens.set(refreshToken, {
    sessionId,
    userId,
    expiresAt: now + refreshTokenExpiry
  });
  
  return {
    sessionId,
    refreshToken,
    expiresIn: accessTokenExpiry / 1000 // seconds
  };
}

export function getSession(sessionId) {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return null;
  }
  
  const now = Date.now();
  
  // Check if session expired
  if (session.expiresAt < now) {
    sessions.delete(sessionId);
    return null;
  }
  
  // Update last activity
  session.lastActivity = now;
  
  return session;
}

export function refreshSession(refreshToken) {
  const tokenData = refreshTokens.get(refreshToken);
  
  if (!tokenData) {
    return null;
  }
  
  const now = Date.now();
  
  // Check if refresh token expired
  if (tokenData.expiresAt < now) {
    refreshTokens.delete(refreshToken);
    return null;
  }
  
  // Get the old session to copy user info
  const oldSession = sessions.get(tokenData.sessionId);
  if (!oldSession) {
    refreshTokens.delete(refreshToken);
    return null;
  }
  
  // Create new session
  const newSessionId = crypto.randomBytes(32).toString('hex');
  const accessTokenExpiry = 15 * 60 * 1000; // 15 minutes
  
  sessions.set(newSessionId, {
    userId: tokenData.userId,
    userInfo: oldSession.userInfo,
    createdAt: now,
    expiresAt: now + accessTokenExpiry,
    lastActivity: now
  });
  
  // Update refresh token to point to new session
  tokenData.sessionId = newSessionId;
  
  return {
    sessionId: newSessionId,
    expiresIn: accessTokenExpiry / 1000 // seconds
  };
}

export function destroySession(sessionId) {
  sessions.delete(sessionId);
  
  // Also remove associated refresh tokens
  for (const [token, data] of refreshTokens.entries()) {
    if (data.sessionId === sessionId) {
      refreshTokens.delete(token);
    }
  }
}

export function destroyAllUserSessions(userId) {
  // Remove all sessions for this user
  for (const [sessionId, session] of sessions.entries()) {
    if (session.userId === userId) {
      sessions.delete(sessionId);
    }
  }
  
  // Remove all refresh tokens for this user
  for (const [token, data] of refreshTokens.entries()) {
    if (data.userId === userId) {
      refreshTokens.delete(token);
    }
  }
}