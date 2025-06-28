import React, { useState } from 'react';
import Head from 'next/head';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { 
  Calendar, Users, Building2, Settings, LogOut, 
  Menu, X, Shield, BarChart3
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

  const navigateMonth = (direction) => {
    const newDate = addMonths(currentDate, direction);
    setCurrentDate(newDate);
    // Load shifts for the new month
    if (selectedHospital) {
      loadInitialData(false, selectedHospital, newDate);
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
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Planificare Personal
              </h2>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-red-600" />
                  Administrare
                </h1>
              </div>
            </div>

            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {menuItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                      currentView === item.id
                        ? 'bg-red-100 text-red-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={selectedHospital}
                onChange={(e) => {
                  const newHospital = e.target.value;
                  setSelectedHospital(newHospital);
                  loadInitialData(false, newHospital, currentDate);
                }}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                {hospitals.map(hospital => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center space-x-2">
                <div className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                  ADMIN
                </div>
                <span className="text-sm text-gray-700">{currentUser?.name}</span>
                <button
                  onClick={logout}
                  className="px-2 sm:px-3 py-2 text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-1"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>

              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {showMobileMenu && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setShowMobileMenu(false);
                  }}
                  className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left flex items-center ${
                    currentView === item.id
                      ? 'bg-red-100 text-red-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

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
    </div>
  );
};