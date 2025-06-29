// Simple in-memory cache for API responses
// In production, consider using Redis or Vercel KV

class Cache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  // Get cached value
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if expired
    if (item.expiry && Date.now() > item.expiry) {
      this.delete(key);
      return null;
    }
    
    return item.value;
  }

  // Set cached value with optional TTL in seconds
  set(key, value, ttl = 300) { // Default 5 minutes
    const expiry = ttl ? Date.now() + (ttl * 1000) : null;
    
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    // Set new value
    this.cache.set(key, { value, expiry });
    
    // Set cleanup timer
    if (ttl) {
      const timer = setTimeout(() => this.delete(key), ttl * 1000);
      this.timers.set(key, timer);
    }
  }

  // Delete cached value
  delete(key) {
    this.cache.delete(key);
    
    // Clear timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  // Clear all cache
  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
  }

  // Get cache size
  size() {
    return this.cache.size;
  }

  // Clear expired entries
  cleanExpired() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry && now > item.expiry) {
        this.delete(key);
      }
    }
  }
}

// Create singleton instance
const cache = new Cache();

// Clean expired entries every minute
setInterval(() => cache.cleanExpired(), 60000);

// Cache key generators
export const cacheKeys = {
  hospitals: () => 'hospitals:all',
  staff: (hospital) => `staff:${hospital || 'all'}`,
  shifts: (hospital, startDate, endDate) => `shifts:${hospital}:${startDate || 'all'}:${endDate || 'all'}`,
  shiftsByDate: (hospital, date) => `shifts:${hospital}:${date}`,
  templates: (hospital) => `templates:${hospital || 'all'}`,
  hospitalConfig: (hospitalId) => `config:${hospitalId}`,
  swapRequests: (hospital) => `swaps:${hospital}`
};

// Cache TTLs (in seconds)
export const cacheTTL = {
  hospitals: 3600,      // 1 hour - rarely changes
  staff: 600,           // 10 minutes - occasionally changes
  shifts: 300,          // 5 minutes - frequently changes
  templates: 1800,      // 30 minutes - rarely changes
  hospitalConfig: 3600, // 1 hour - rarely changes
  swapRequests: 120    // 2 minutes - frequently changes
};

// Invalidation helpers
export const invalidateCache = {
  // Invalidate all shifts for a hospital
  shifts: (hospital) => {
    for (const [key] of cache.cache.entries()) {
      if (key.startsWith(`shifts:${hospital}:`)) {
        cache.delete(key);
      }
    }
  },
  
  // Invalidate all staff for a hospital
  staff: (hospital) => {
    cache.delete(cacheKeys.staff(hospital));
    cache.delete(cacheKeys.staff()); // Also clear 'all' cache
  },
  
  // Invalidate swap requests
  swapRequests: (hospital) => {
    cache.delete(cacheKeys.swapRequests(hospital));
  },
  
  // Invalidate everything for a hospital
  hospital: (hospital) => {
    for (const [key] of cache.cache.entries()) {
      if (key.includes(`:${hospital}`) || key.includes(`:${hospital}:`)) {
        cache.delete(key);
      }
    }
  }
};

export default cache;