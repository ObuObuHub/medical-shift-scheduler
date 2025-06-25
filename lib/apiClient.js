// API client for backend communication

class APIClient {
  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '';
    this.token = null;
  }

  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  getToken() {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
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
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication
  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    
    if (data.token) {
      this.setToken(data.token);
    }
    
    return data;
  }

  // Database initialization
  async initializeDatabase() {
    return this.request('/db/init', {
      method: 'POST',
    });
  }

  logout() {
    this.setToken(null);
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
    return this.request(`/shifts/${id}`, {
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
}

// Create singleton instance
const apiClient = new APIClient();

export default apiClient;