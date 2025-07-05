// API client for backend communication

class APIClient {
  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '';
    this.token = null;
    this.sessionId = null;
    this.refreshToken = null;
    // Clear any stored tokens on initialization
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('sessionId');
    }
  }

  // Retry logic for failed requests
  async retryRequest(fn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        
        // Don't retry on auth errors
        if (error.message.includes('401') || error.message.includes('403')) {
          throw error;
        }
        
        console.log(`Request failed, retry ${i + 1}/${retries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  setToken(token) {
    this.token = token;
    // Don't persist token to localStorage
  }

  getToken() {
    // Only return in-memory token, no localStorage
    return this.token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    const token = this.getToken();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body !== 'string') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
            throw error;
    }
  }

  // Authentication
  async login(username, password, rememberMe = false) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: { username, password, rememberMe },
    });
    
    if (data.token) {
      this.setToken(data.token);
      this.sessionId = data.sessionId;
      this.refreshToken = data.refreshToken;
      
      // Store refresh token securely if remember me is enabled
      if (rememberMe && typeof window !== 'undefined') {
        // In production, consider more secure storage
        sessionStorage.setItem('refreshToken', data.refreshToken);
      }
    }
    
    return data;
  }

  // Database initialization
  async initializeDatabase() {
    return this.request('/db/init', {
      method: 'POST',
    });
  }

  async logout(logoutAll = false) {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
        body: { sessionId: this.sessionId, logoutAll },
      });
    } catch (error) {
      // Continue with local cleanup even if server request fails
    }
    
    this.setToken(null);
    this.sessionId = null;
    this.refreshToken = null;
    
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('refreshToken');
    }
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const data = await this.request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: this.refreshToken },
    });

    if (data.token) {
      this.setToken(data.token);
      this.sessionId = data.sessionId;
    }

    return data;
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: userData,
    });
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
  }

  // Staff API
  async getStaff(hospital = '') {
    const query = hospital ? `?hospital=${hospital}` : '';
    return this.request(`/staff${query}`);
  }

  async createStaff(staffData) {
    return this.request('/staff', {
      method: 'POST',
      body: staffData,
    });
  }

  async updateStaff(id, updates) {
    return this.request(`/staff/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  async deleteStaff(id) {
    return this.request(`/staff/${id}`, {
      method: 'DELETE',
    });
  }

  // Hospitals API
  async getHospitals() {
    return this.request('/hospitals');
  }

  async createHospital(hospitalData) {
    return this.request('/hospitals', {
      method: 'POST',
      body: hospitalData,
    });
  }

  async updateHospital(id, updates) {
    return this.request(`/hospitals/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  async deleteHospital(id) {
    return this.request(`/hospitals/${id}`, {
      method: 'DELETE',
    });
  }

  // Shifts API
  async getShifts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/shifts?${query}` : '/shifts';
    return this.request(endpoint);
  }

  async createShift(shiftData) {
    return this.request('/shifts', {
      method: 'POST',
      body: shiftData,
    });
  }

  async updateShift(id, updates) {
    return this.request(`/shifts/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  async deleteShift(id) {
    return this.request(`/shifts?shiftId=${id}`, {
      method: 'DELETE',
    });
  }

  // Templates API
  async getTemplates(hospital = '') {
    const query = hospital ? `?hospital=${hospital}` : '';
    return this.request(`/templates${query}`);
  }

  async createTemplate(templateData) {
    return this.request('/templates', {
      method: 'POST',
      body: templateData,
    });
  }

  async getTemplate(id) {
    return this.request(`/templates/${id}`);
  }

  async updateTemplate(id, updates) {
    return this.request(`/templates/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  async deleteTemplate(id) {
    return this.request(`/templates/${id}`, {
      method: 'DELETE',
    });
  }

  // Shift Reservation API
  async reserveShift(shiftId) {
    return this.request(`/shifts/${shiftId}/reserve`, {
      method: 'POST',
    });
  }

  async cancelReservation(shiftId) {
    return this.request(`/shifts/${shiftId}/reserve`, {
      method: 'DELETE',
    });
  }

  // Swap Requests API
  async createSwapRequest(swapData) {
    // If no auth token, use public endpoint
    if (!this.getToken()) {
      return this.retryRequest(async () => {
        const url = `${this.baseURL}/api/public/shifts/swap`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(swapData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      });
    }
    
    // Otherwise use authenticated endpoint
    return this.request('/shifts/swap', {
      method: 'POST',
      body: swapData,
    });
  }

  async getSwapRequests() {
    return this.request('/shifts/swap');
  }

  async updateSwapRequest(requestId, status, reviewComment) {
    return this.request(`/shifts/swap/${requestId}`, {
      method: 'PUT',
      body: { status, reviewComment },
    });
  }

  // Hospital Configuration API
  async getHospitalConfig(hospitalId) {
    // If no auth token, use public endpoint
    if (!this.getToken()) {
      return this.retryRequest(async () => {
        const url = `${this.baseURL}/api/public/hospitals/${hospitalId}/config`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      });
    }
    
    // Use authenticated endpoint
    return this.request(`/hospitals/${hospitalId}/config`);
  }

  async updateHospitalConfig(hospitalId, config) {
    return this.request(`/hospitals/${hospitalId}/config`, {
      method: 'PUT',
      body: config,
    });
  }

  // Public API endpoints (no auth required)
  async getPublicHospitals() {
    return this.retryRequest(async () => {
      const url = `${this.baseURL}/api/public/hospitals`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    });
  }

  async getPublicStaff(hospital = '') {
    return this.retryRequest(async () => {
      const query = hospital ? `?hospital=${hospital}` : '';
      const url = `${this.baseURL}/api/public/staff${query}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    });
  }

  async getPublicShifts(params = {}) {
    return this.retryRequest(async () => {
      const query = new URLSearchParams(params).toString();
      const endpoint = query ? `/api/public/shifts?${query}` : '/api/public/shifts';
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    });
  }
}

// Create singleton instance
const apiClient = new APIClient();

export default apiClient;