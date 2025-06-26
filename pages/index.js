import React from 'react';
import { AuthProvider } from '../components/AuthContext';
import { DataProvider } from '../components/DataContext';
import { AppRouter } from '../components/AppRouter';

// Main app - starts with hospital selection
export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppRouter />
      </DataProvider>
    </AuthProvider>
  );
}