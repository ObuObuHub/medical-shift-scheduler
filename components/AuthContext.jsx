import { createContext, useContext, useState, useEffect } from 'react';

// Default users with hashed passwords (demo purposes - use proper auth in production)
const DEFAULT_USERS = {
  admin: {
    id: 'admin',
    username: 'admin',
    passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // sha256('admin123')
    name: 'Administrator Principal',
    role: 'admin',
    hospital: 'spital1'
  },
  manager: {
    id: 'manager',
    username: 'manager', 
    passwordHash: '6ca13d52ca70c883e0f0bb101e425a89e8624de51db2d2392593af6a84118090', // sha256('manager123')
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
      const passwordHash = await hashPassword(password);
      const user = Object.values(DEFAULT_USERS).find(
        u => u.username === username && u.passwordHash === passwordHash
      );

      if (user) {
        const { passwordHash: _, ...userWithoutPassword } = user;
        setCurrentUser(userWithoutPassword);
        return { success: true, user: userWithoutPassword };
      }

      return { success: false, error: 'Utilizator sau parolă incorectă' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Eroare la autentificare' };
    }
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