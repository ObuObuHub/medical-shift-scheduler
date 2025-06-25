import React from 'react';
import { useAuth } from './AuthContext';
import { StaffDashboard } from './StaffDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { AdminDashboard } from './AdminDashboard';

export const RoleBasedLanding = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return null;
  }

  switch (currentUser.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'staff':
    default:
      return <StaffDashboard />;
  }
};