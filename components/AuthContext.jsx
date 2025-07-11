import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../lib/apiClient';

// Default users with hashed passwords (demo purposes - use proper auth in production)
const DEFAULT_USERS = {
  admin: {
    id: 'admin',
    username: 'admin',
    passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // sha256('admin123')
    name: 'Administrator Principal',
    role: 'admin',
    hospital: 'spital1' // Spitalul Județean de Urgență Piatra-Neamț
  },
  manager: {
    id: 'manager',
    username: 'manager', 
    passwordHash: '866485796cfa8d7c0cf7111640205b83076433547577511d81f8030ae99ecea5', // sha256('manager123')
    name: 'Manager Gărzi',
    role: 'manager',
    hospital: 'spital1' // Spitalul Județean de Urgență Piatra-Neamț
  }
};

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // No session persistence - always require fresh login
  useEffect(() => {
    // Clear any existing session data on mount
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    // Don't call logout here as it might interfere with the app flow
    setIsLoading(false);
  }, []);

  // Simple hash function for demo purposes (use proper crypto in production)
  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const login = async (username, password) => {
    try {
      const response = await apiClient.login(username, password);
      
      const userSession = {
        id: response.user.id,
        username: response.user.username,
        name: response.user.name,
        role: response.user.role,
        hospital: response.user.hospital,
        type: response.user.type,
        specialization: response.user.specialization
      };
      
      setCurrentUser(userSession);
      return { success: true, user: userSession };
    } catch (error) {
            return { success: false, error: error.message || 'Eroare la autentificare' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setSelectedStaff(null);
    apiClient.logout();
  };

  // Staff selection methods
  const selectStaff = (staffMember) => {
    if (staffMember) {
      setSelectedStaff(staffMember);
    }
  };

  const clearStaffSelection = () => {
    setSelectedStaff(null);
  };

  // Permission checking
  const hasPermission = (action) => {
    if (!currentUser) return false;

    const permissions = {
      staff: ['view_schedule', 'request_exchange'],
      manager: ['view_schedule', 'request_exchange', 'assign_staff', 'generate_shifts', 'approve_exchanges', 'edit_staff', 'edit_hospitals'],
      admin: ['view_schedule', 'request_exchange', 'assign_staff', 'generate_shifts', 'approve_exchanges', 'edit_staff', 'edit_hospitals', 'edit_shift_types', 'edit_system']
    };

    return permissions[currentUser.role]?.includes(action) || false;
  };

  const value = {
    currentUser,
    selectedStaff,
    login,
    logout,
    hasPermission,
    isLoading,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === 'admin',
    isManager: currentUser?.role === 'manager' || currentUser?.role === 'admin',
    selectStaff,
    clearStaffSelection
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};