// Simple in-memory rate limiter for login attempts
const loginAttempts = new Map();

// Clean up old entries every hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, data] of loginAttempts.entries()) {
    if (data.resetTime < oneHourAgo) {
      loginAttempts.delete(key);
    }
  }
}, 60 * 60 * 1000);

export function checkRateLimit(identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const attemptData = loginAttempts.get(identifier);

  if (!attemptData) {
    loginAttempts.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true, remainingAttempts: maxAttempts - 1 };
  }

  // Reset if window has passed
  if (now > attemptData.resetTime) {
    loginAttempts.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true, remainingAttempts: maxAttempts - 1 };
  }

  // Increment attempt count
  attemptData.count++;
  
  if (attemptData.count > maxAttempts) {
    const retryAfter = Math.ceil((attemptData.resetTime - now) / 1000);
    return { 
      allowed: false, 
      retryAfter,
      remainingAttempts: 0 
    };
  }

  return { 
    allowed: true, 
    remainingAttempts: maxAttempts - attemptData.count 
  };
}

export function resetRateLimit(identifier) {
  loginAttempts.delete(identifier);
}