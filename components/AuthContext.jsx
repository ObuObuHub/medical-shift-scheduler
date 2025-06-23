import { createContext, useContext, useState, useEffect } from 'react';

// Default users with passwords
const DEFAULT_USERS = {
  admin: {
    id: 'admin',
    username: 'admin',
    password: 'admin123',
    name: 'Administrator Principal',
    role: 'admin',
    hospital: 'spital1'
  },
  manager: {
    id: 'manager',
    username: 'manager',
    password: 'manager123',
    name: 'Manager Spital',
    role: 'manager',
    hospital: 'spital1'
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
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []);

  // Save user to localStorage when currentUser changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const login = (username, password) => {
    const user = Object.values(DEFAULT_USERS).find(
      u => u.username === username && u.password === password
    );

    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      setCurrentUser(userWithoutPassword);
      return { success: true, user: userWithoutPassword };
    }

    return { success: false, error: 'Utilizator sau parolă incorectă' };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
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
    login,
    logout,
    hasPermission,
    isLoading,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === 'admin',
    isManager: currentUser?.role === 'manager' || currentUser?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};