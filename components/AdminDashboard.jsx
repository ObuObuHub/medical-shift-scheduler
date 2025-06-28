import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { 
  Calendar, Users, Building2, Settings, LogOut, 
  Menu, X, Shield, BarChart3, Lock, ChevronDown
} from './Icons';
import { MatrixView } from './MatrixView';
import { CalendarView } from './CalendarView';
import { ViewSwitcher } from './ViewSwitcher';
import { StaffView } from './StaffView';
import { AdminPanel } from './AdminPanel';
import { StaffEditModal } from './StaffEditModal';
import { HospitalEditModal } from './HospitalEditModal';
import { ShiftTypeEditModal } from './ShiftTypeEditModal';
import { AddShiftModal } from './AddShiftModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { formatMonthYear, addMonths } from '../utils/dateHelpers';

export const AdminDashboard = () => {
  const { currentUser, logout, hasPermission } = useAuth();
  const { 
    shiftTypes, hospitals, staff, shifts, 
    addStaff, updateStaff, deleteStaff,
    addHospital, updateHospital, deleteHospital,
    generateFairSchedule, deleteShift, regenerateFromScratch,
    loadInitialData
  } = useData();

  // State
  const [selectedHospital, setSelectedHospital] = useState(currentUser?.hospital || 'spital1');
  const [currentView, setCurrentView] = useState('matrix');
  const [planningView, setPlanningView] = useState('calendar'); // Calendar or Matrix for planning
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Modal states
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingHospital, setEditingHospital] = useState(null);
  const [editingShiftType, setEditingShiftType] = useState(null);
  const [addShiftModalData, setAddShiftModalData] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigateMonth = (direction) => {
    const newDate = addMonths(currentDate, direction);
    setCurrentDate(newDate);
    // Load shifts for the new month with silent refresh to avoid full reload
    if (selectedHospital) {
      loadInitialData(true, selectedHospital, newDate);
    }
  };

  const handleCellClick = (date, dayShifts, e) => {
    if (!hasPermission('assign_staff')) return;
    e.preventDefault();
    setAddShiftModalData({ date, editingShift: null });
  };
  
  // Helper functions for CalendarView
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Add padding days from previous month
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      // Create date at noon to avoid timezone issues
      const date = new Date(year, month, -i, 12, 0, 0);
      days.push(date);
    }
    
    // Add all days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      // Create date at noon to avoid timezone issues
      days.push(new Date(year, month, i, 12, 0, 0));
    }
    
    // Add padding days from next month
    const endPadding = 6 - lastDay.getDay();
    for (let i = 1; i <= endPadding; i++) {
      // Create date at noon to avoid timezone issues
      days.push(new Date(year, month + 1, i, 12, 0, 0));
    }
    
    return days;
  };
  
  const getStaffName = (staffId) => {
    const member = staff.find(s => s.id === staffId);
    return member ? member.name : 'Unknown';
  };

  // Menu items for administrators
  const menuItems = [
    { id: 'matrix', label: 'Planificare', icon: BarChart3 },
    { id: 'staff', label: 'Personal', icon: Users },
    { id: 'admin', label: 'Administrare', icon: Settings }
  ];

  const renderCurrentView = () => {
    const commonProps = {
      currentDate,
      selectedHospital,
      staff,
      shifts,
      shiftTypes,
      hasPermission
    };

    switch (currentView) {
      case 'matrix':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Planificare Personal
            </h2>
            
            {/* View switcher moved here from header */}
            <div className="flex justify-center">
              <ViewSwitcher 
                currentView={planningView} 
                onViewChange={setPlanningView}
              />
            </div>
            
            {planningView === 'matrix' ? (
              <MatrixView 
                selectedHospital={selectedHospital}
                currentDate={currentDate}
                onDateChange={setCurrentDate}
              />
            ) : (
              <CalendarView
                currentDate={currentDate}
                navigateMonth={navigateMonth}
                generateFairSchedule={generateFairSchedule}
                getDaysInMonth={getDaysInMonth}
                handleCellClick={handleCellClick}
                getStaffName={getStaffName}
                hasPermission={hasPermission}
                staff={staff}
                shifts={shifts}
                setAddShiftModalData={setAddShiftModalData}
                selectedHospital={selectedHospital}
                currentUser={currentUser}
                selectedStaff={null}
                isGuest={false}
              />
            )}
          </div>
        );
      
      case 'staff':
        return (
          <StaffView
            {...commonProps}
            formatMonthYear={formatMonthYear}
          />
        );
      
      case 'admin':
        return (
          <AdminPanel
            {...commonProps}
            hospitals={hospitals}
            setEditingStaff={setEditingStaff}
            setEditingHospital={setEditingHospital}
            setEditingShiftType={setEditingShiftType}
            deleteStaff={deleteStaff}
            deleteHospital={deleteHospital}
            deleteShiftType={() => {}} // Implement if needed
          />
        );
      
      default:
        return <div>View not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Administrare - Planificare</title>
        <meta name="description" content="Interfață de administrare pentru planificarea turelor medicale" />
      </Head>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Left side - Logo and Title */}
            <div className="flex items-center">
              <h1 className="text-base sm:text-xl font-bold text-gray-900 flex items-center">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-red-600" />
                <span className="hidden sm:inline">Administrare</span>
                <span className="sm:hidden">Admin</span>
              </h1>
            </div>

            {/* Center - Navigation (Desktop only) */}
            <div className="hidden md:flex items-center space-x-1">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center transition-colors ${
                    currentView === item.id
                      ? 'bg-red-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-1.5" />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right side - User menu and mobile toggle */}
            <div className="flex items-center space-x-2">
              {/* User menu dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
                    ADMIN
                  </div>
                  <span className="hidden sm:inline text-gray-700 max-w-[150px] truncate">
                    {currentUser?.name}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    {/* Hospital selector moved to dropdown */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Spital</label>
                      <select
                        value={selectedHospital}
                        onChange={(e) => {
                          const newHospital = e.target.value;
                          setSelectedHospital(newHospital);
                          loadInitialData(false, newHospital, currentDate);
                          setShowUserMenu(false);
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                      >
                        {hospitals.map(hospital => (
                          <option key={hospital.id} value={hospital.id}>
                            {hospital.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <button
                      onClick={() => {
                        setShowChangePassword(true);
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Schimbă parola</span>
                    </button>
                    
                    <hr className="border-gray-100" />
                    
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

      </header>

      {/* Mobile menu - Full screen overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowMobileMenu(false)}
          />
          
          {/* Menu panel */}
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Meniu</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-2">
              {/* Navigation items */}
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setShowMobileMenu(false);
                  }}
                  className={`w-full px-4 py-3 rounded-lg text-left font-medium flex items-center transition-colors ${
                    currentView === item.id
                      ? 'bg-red-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              ))}
              
              <hr className="my-4 border-gray-200" />
              
              {/* Hospital selector */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Spital selectat</label>
                <select
                  value={selectedHospital}
                  onChange={(e) => {
                    const newHospital = e.target.value;
                    setSelectedHospital(newHospital);
                    loadInitialData(false, newHospital, currentDate);
                    setShowMobileMenu(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {hospitals.map(hospital => (
                    <option key={hospital.id} value={hospital.id}>
                      {hospital.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <hr className="my-4 border-gray-200" />
              
              {/* Account actions */}
              <button
                onClick={() => {
                  setShowChangePassword(true);
                  setShowMobileMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-100 rounded-lg flex items-center"
              >
                <Lock className="w-5 h-5 mr-3" />
                Schimbă parola
              </button>
              
              <button
                onClick={() => {
                  logout();
                  setShowMobileMenu(false);
                }}
                className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg flex items-center"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderCurrentView()}
      </main>

      {/* Modals */}
      {addShiftModalData && (
        <AddShiftModal
          selectedDate={addShiftModalData.date}
          editingShift={addShiftModalData.editingShift}
          selectedHospital={selectedHospital}
          onClose={() => setAddShiftModalData(null)}
          onSave={() => setAddShiftModalData(null)}
        />
      )}

      {editingShiftType && (
        <ShiftTypeEditModal
          shiftType={editingShiftType}
          onClose={() => setEditingShiftType(null)}
        />
      )}

      {editingStaff && (
        <StaffEditModal
          staff={editingStaff}
          selectedHospital={selectedHospital}
          hospitals={hospitals}
          onClose={() => setEditingStaff(null)}
        />
      )}

      {editingHospital && (
        <HospitalEditModal
          hospital={editingHospital}
          onClose={() => setEditingHospital(null)}
        />
      )}

      {showChangePassword && (
        <ChangePasswordModal
          isOpen={showChangePassword}
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => setShowChangePassword(false)}
        />
      )}
    </div>
  );
};