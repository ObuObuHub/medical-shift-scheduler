import React, { useState, useEffect } from 'react';
import { HospitalSelector } from './HospitalSelector';
import { StaffSelector } from './StaffSelector';
import { StaffDashboard } from './StaffDashboard';
import { NotificationContainer } from './NotificationContainer';
import { LoginForm } from './LoginForm';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';

export const AppRouter = () => {
  const { hospitals, staff, isLoading, notifications, setNotifications } = useData();
  const { selectedStaff, selectStaff, clearStaffSelection, currentUser } = useAuth();
  
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Clear saved selections on initial load to force hospital selection
  useEffect(() => {
    // Always start fresh with hospital selection
    localStorage.removeItem('selectedHospital');
    localStorage.removeItem('selectedStaffId');
    localStorage.removeItem('isGuest');
    // Don't clear staff selection here as it interferes with the selection flow
  }, []); // Empty dependency array means this runs only once on mount

  // Handle hospital selection
  const handleSelectHospital = (hospitalId) => {
    setSelectedHospital(hospitalId);
    // Clear staff selection when changing hospital
    clearStaffSelection();
    setIsGuest(false);
  };

  // Handle staff selection
  const handleSelectStaff = (staffMember) => {
    selectStaff(staffMember);
    setIsGuest(false);
  };

  // Handle guest mode
  const handleContinueAsGuest = () => {
    setIsGuest(true);
    clearStaffSelection();
  };

  // Handle back navigation
  const handleBackToHospitalSelection = () => {
    setSelectedHospital(null);
    clearStaffSelection();
    setIsGuest(false);
    setShowLogin(false);
  };

  // Handle login success
  const handleLoginSuccess = (user) => {
    setShowLogin(false);
    // Set the current user and let them go through normal flow
    if (user) {
      // Admin/Manager can now select hospital and view as themselves
      clearStaffSelection();
      setSelectedHospital(null);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă datele...</p>
        </div>
      </div>
    );
  }

  // Removed automatic skip for admin/manager - everyone starts with hospital selection

  // Render the appropriate component with notifications
  const renderContent = () => {
    // Show login form if requested
    if (showLogin) {
      return (
        <LoginForm
          onSuccess={handleLoginSuccess}
          onBack={() => setShowLogin(false)}
        />
      );
    }

    // Step 1: Hospital Selection
    if (!selectedHospital) {
      return (
        <HospitalSelector
          hospitals={hospitals}
          staff={staff}
          onSelectHospital={handleSelectHospital}
          onLoginClick={() => setShowLogin(true)}
        />
      );
    }

    // Step 2: Staff Selection (skip for authenticated managers/admins)
    if (!selectedStaff && !isGuest && !currentUser) {
      return (
        <StaffSelector
          hospital={selectedHospital}
          hospitals={hospitals}
          staff={staff}
          onSelectStaff={handleSelectStaff}
          onBack={handleBackToHospitalSelection}
          onContinueAsGuest={handleContinueAsGuest}
        />
      );
    }

    // Step 3: Staff Dashboard
    // For managers/admins, pass currentUser as selectedStaff
    const effectiveSelectedStaff = selectedStaff || (currentUser && {
      id: currentUser.id,
      name: currentUser.name,
      type: currentUser.type || 'medic',
      specialization: currentUser.role === 'admin' ? 'Administrator' : 'Manager',
      hospital: currentUser.hospital,
      role: currentUser.role
    });

    return (
      <StaffDashboard
        selectedHospital={selectedHospital}
        selectedStaff={effectiveSelectedStaff}
        isGuest={isGuest || (!selectedStaff && currentUser)}
      />
    );
  };

  return (
    <>
      {renderContent()}
      <NotificationContainer 
        notifications={notifications} 
        onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
      />
    </>
  );
};