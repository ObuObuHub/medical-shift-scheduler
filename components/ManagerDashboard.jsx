import React, { useState } from 'react';
import Head from 'next/head';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { 
  Calendar, Users, BarChart3, Settings, LogOut, 
  Menu, X, Shield, Plus, Edit2, Trash2
} from './Icons';
import { NotificationCenter } from './NotificationCenter';
import { MatrixView } from './MatrixView';
import { CalendarView } from './CalendarView';
import { ViewSwitcher } from './ViewSwitcher';
import { StaffView } from './StaffView';
import { StaffEditModal } from './StaffEditModal';
import { AddShiftModal } from './AddShiftModal';
import { formatMonthYear, addMonths } from '../utils/dateHelpers';
import { getStaffName } from '../utils/dataHelpers';

export const ManagerDashboard = () => {
  const { currentUser, logout, hasPermission } = useAuth();
  const { 
    shiftTypes, hospitals, staff, shifts, 
    addStaff, updateStaff, deleteStaff,
    generateFairSchedule, deleteShift, regenerateFromScratch,
    loadInitialData
  } = useData();

  // State
  const [selectedHospital, setSelectedHospital] = useState(currentUser?.hospital || 'spital1');
  const [currentView, setCurrentView] = useState('matrix');
  const [planningView, setPlanningView] = useState('calendar'); // Calendar or Matrix for planning
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [addShiftModalData, setAddShiftModalData] = useState(null);
  
  // Hospital switching is disabled for managers

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

  // Hospital switching is disabled for managers
  // Managers are locked to their assigned hospital


  // Menu items for managers
  const menuItems = [
    { id: 'matrix', label: 'Planificare', icon: BarChart3 },
    { id: 'staff', label: 'Personal', icon: Users },
    { id: 'management', label: 'Gestionare', icon: Settings }
  ];

  const renderManagementView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Gestionare Personal</h2>
        <button
          onClick={() => setEditingStaff({})}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adaugă Personal
        </button>
      </div>

      {/* Staff list for management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="space-y-4">
            {staff
              .filter(member => member.hospital === selectedHospital)
              .map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{member.name}</div>
                      <div className="text-sm text-gray-600">
                        {member.specialization} • Rol: {member.role} • Max garzi: {member.maxGuardsPerMonth || 'Nesetat'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingStaff(member)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Editează"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Sigur doriți să ștergeți ${member.name}?`)) {
                          deleteStaff(member.id);
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Șterge"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );

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
                currentUser={currentUser}
                selectedStaff={null}
              />
            ) : (
              <CalendarView
                currentDate={currentDate}
                navigateMonth={navigateMonth}
                generateFairSchedule={generateFairSchedule}
                getDaysInMonth={getDaysInMonth}
                handleCellClick={handleCellClick}
                getStaffName={(staffId) => getStaffName(staffId, staff)}
                hasPermission={hasPermission}
                staff={staff}
                shifts={shifts}
                setAddShiftModalData={setAddShiftModalData}
                selectedHospital={selectedHospital}
                currentUser={currentUser}
                selectedStaff={null}
                isGuest={false}
                deleteShift={deleteShift}
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
      
      case 'management':
        return renderManagementView();
      
      default:
        return <div>View not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Management - Planificare</title>
        <meta name="description" content="Interfață de management pentru planificarea turelor medicale" />
      </Head>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Left side - Logo and Title */}
            <div className="flex items-center">
              <h1 className="text-base sm:text-xl font-bold text-gray-900 flex items-center">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-blue-600" />
                <span className="hidden sm:inline">Management</span>
                <span className="sm:hidden">Manager</span>
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
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-1.5" />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right side - Hospital name and user menu */}
            <div className="flex items-center space-x-2">
              {/* Hospital name display - managers cannot switch */}
              <div className="hidden sm:block px-2 py-1.5 text-sm text-gray-700 font-medium">
                {hospitals.find(h => h.id === selectedHospital)?.name}
              </div>

              {/* Notification Center */}
              <NotificationCenter />
              
              {/* User info and logout */}
              <div className="flex items-center space-x-2">
                <div className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                  MANAGER
                </div>
                <span className="hidden sm:inline text-sm text-gray-700 max-w-[150px] truncate">
                  {currentUser?.name}
                </span>
                <button
                  onClick={logout}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
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
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              ))}
              
              <hr className="my-4 border-gray-200" />
              
              {/* Current hospital display */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Spital curent</label>
                <div className="w-full px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700">
                  {hospitals.find(h => h.id === selectedHospital)?.name}
                </div>
              </div>
              
              <hr className="my-4 border-gray-200" />
              
              {/* Account actions */}
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

      {editingStaff && (
        <StaffEditModal
          staff={editingStaff}
          selectedHospital={selectedHospital}
          hospitals={hospitals}
          onClose={() => setEditingStaff(null)}
        />
      )}

    </div>
  );
};