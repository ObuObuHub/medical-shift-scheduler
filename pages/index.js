import React from 'react';
import { AuthProvider } from '../components/AuthContext';
import { DataProvider } from '../components/DataContext';
import { StaffDashboard } from '../components/StaffDashboard';

// Main app - defaults to staff view
export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <StaffDashboard />
      </DataProvider>
    </AuthProvider>
  );
}