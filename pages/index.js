import React from 'react';
import { AuthProvider, useAuth } from '../components/AuthContext';
import { DataProvider } from '../components/DataContext';
import { LoginForm } from '../components/LoginForm';
import { RoleBasedLanding } from '../components/RoleBasedLanding';

// Main app component with authentication
function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <RoleBasedLanding />;
}

// App wrapper with providers
export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}