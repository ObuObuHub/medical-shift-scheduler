import React, { useState, useEffect } from 'react';
import { HospitalSelector } from './HospitalSelector';
import { StaffSelector } from './StaffSelector';
import { StaffDashboard } from './StaffDashboard';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';

export const AppRouter = () => {
  const { hospitals, staff, isLoading } = useData();
  const { selectedStaff, selectStaff, clearStaffSelection, currentUser } = useAuth();
  
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [isGuest, setIsGuest] = useState(false);

  // Load saved selections from localStorage
  useEffect(() => {
    const savedHospital = localStorage.getItem('selectedHospital');
    const savedStaffId = localStorage.getItem('selectedStaffId');
    const savedIsGuest = localStorage.getItem('isGuest') === 'true';

    if (savedHospital) {
      setSelectedHospital(savedHospital);
    }

    if (savedStaffId && !savedIsGuest) {
      const staffMember = staff.find(s => s.id === parseInt(savedStaffId));
      if (staffMember) {
        selectStaff(staffMember);
      }
    }

    setIsGuest(savedIsGuest);
  }, [staff, selectStaff]);

  // Handle hospital selection
  const handleSelectHospital = (hospitalId) => {
    setSelectedHospital(hospitalId);
    localStorage.setItem('selectedHospital', hospitalId);
    // Clear staff selection when changing hospital
    clearStaffSelection();
    localStorage.removeItem('selectedStaffId');
    localStorage.removeItem('isGuest');
    setIsGuest(false);
  };

  // Handle staff selection
  const handleSelectStaff = (staffMember) => {
    selectStaff(staffMember);
    localStorage.setItem('selectedStaffId', staffMember.id);
    localStorage.setItem('isGuest', 'false');
    setIsGuest(false);
  };

  // Handle guest mode
  const handleContinueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem('isGuest', 'true');
    localStorage.removeItem('selectedStaffId');
    clearStaffSelection();
  };

  // Handle back navigation
  const handleBackToHospitalSelection = () => {
    setSelectedHospital(null);
    localStorage.removeItem('selectedHospital');
    localStorage.removeItem('selectedStaffId');
    localStorage.removeItem('isGuest');
    clearStaffSelection();
    setIsGuest(false);
  };

  // Handle staff change
  const handleChangeStaff = () => {
    clearStaffSelection();
    localStorage.removeItem('selectedStaffId');
    localStorage.removeItem('isGuest');
    setIsGuest(false);
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

  // If authenticated as admin/manager, skip selection and go directly to dashboard
  if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager')) {
    return <StaffDashboard />;
  }

  // Step 1: Hospital Selection
  if (!selectedHospital) {
    return (
      <HospitalSelector
        hospitals={hospitals}
        staff={staff}
        onSelectHospital={handleSelectHospital}
      />
    );
  }

  // Step 2: Staff Selection
  if (!selectedStaff && !isGuest) {
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
  return (
    <StaffDashboard
      selectedHospital={selectedHospital}
      selectedStaff={selectedStaff}
      isGuest={isGuest}
      onChangeHospital={handleBackToHospitalSelection}
      onChangeStaff={handleChangeStaff}
    />
  );
};