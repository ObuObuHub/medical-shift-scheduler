import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
  Calendar, Users, Bell, Building2, ArrowLeftRight, Clock, CheckCircle, XCircle,
  AlertCircle, ChevronLeft, ChevronRight, Menu, X, Settings, Shield,
  Wand2, Plus, Edit2, Trash2, Save, UserCog, LogOut, BarChart3, Filter, Download
} from '../components/Icons';
import { AuthProvider, useAuth } from '../components/AuthContext';
import { DataProvider, useData } from '../components/DataContext';
import { LoginForm } from '../components/LoginForm';
import { ShiftTypeEditModal } from '../components/ShiftTypeEditModal';
import { MatrixView } from '../components/MatrixView';
import { AddShiftModal } from '../components/AddShiftModal';

// Extracted View Components
import { CalendarView } from '../components/CalendarView';
import { StaffView } from '../components/StaffView';
import { AdminPanel } from '../components/AdminPanel';

// Utility Functions
import { formatMonthYear, getDaysInMonth, addMonths, getDateKey } from '../utils/dateHelpers';
import { getStaffName } from '../utils/staffHelpers';

// Main app component with authentication
function AppContent() {
  const { currentUser, logout, hasPermission, isAuthenticated } = useAuth();
  const { 
    shiftTypes, hospitals, staff, shifts, notifications, setShifts, 
    addNotification, addStaff, updateStaff, deleteStaff,
    addHospital, updateHospital, deleteHospital,
    validateDayCoverage, getCoverageForDate, generateFairSchedule
  } = useData();

  // Core state
  const [selectedHospital, setSelectedHospital] = useState(currentUser?.hospital || 'spital1');
  const [currentView, setCurrentView] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Modal states
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingHospital, setEditingHospital] = useState(null);
  const [editingShiftType, setEditingShiftType] = useState(null);
  const [addShiftModalData, setAddShiftModalData] = useState(null);

  // Navigation functions
  const navigateMonth = (direction) => {
    setCurrentDate(prev => addMonths(prev, direction));
  };

  // Initialize shifts when hospital changes
  const generateMockShifts = useCallback(() => {
    const newShifts = {};
    const startDate = new Date(currentDate);
    startDate.setDate(1);

    for (let i = 0; i < 31; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = getDateKey(date);
      
      newShifts[dateKey] = [];
      
      // Random shift generation for each day - only 12h and 24h shifts
      if (Math.random() > 0.3) {
        newShifts[dateKey].push({
          id: `${dateKey}-garda-zi`,
          type: shiftTypes.GARDA_ZI,
          staffIds: [1, 3]
        });
      }
      
      if (Math.random() > 0.5) {
        newShifts[dateKey].push({
          id: `${dateKey}-noapte`,
          type: shiftTypes.NOAPTE,
          staffIds: [2, 4, 5]
        });
      }
    }

    setShifts(newShifts);
  }, [currentDate, shiftTypes, setShifts]);

  useEffect(() => {
    if (isAuthenticated) {
      generateMockShifts();
    }
  }, [selectedHospital, isAuthenticated, generateMockShifts]);

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Business logic functions
  const generateAutomaticShifts = () => {
    if (!hasPermission('generate_shifts')) {
      addNotification('Nu aveți permisiunea de a genera ture automat', 'error');
      return;
    }

    const newShifts = {};
    const startDate = new Date(currentDate);
    startDate.setDate(1);
    const endDate = new Date(currentDate);
    endDate.setMonth(endDate.getMonth() + 1, 0);

    const availableStaff = staff.filter(s => s.hospital === selectedHospital);
    const departments = [...new Set(availableStaff.map(s => s.specialization))];

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateKey = getDateKey(date);
      newShifts[dateKey] = [];

      departments.forEach(department => {
        const deptStaff = availableStaff.filter(s => s.specialization === department);
        const doctors = deptStaff.filter(s => s.type === 'medic');
        const nurses = deptStaff.filter(s => s.type === 'asistent');

        if (doctors.length >= 1 && nurses.length >= 1) {
          const selectedDoctors = doctors.slice(0, 1);
          const selectedNurses = nurses.slice(0, 2);
          const allStaffIds = [...selectedDoctors.map(s => s.id), ...selectedNurses.map(s => s.id)];

          newShifts[dateKey].push({
            id: `${dateKey}-${department.toLowerCase()}-zi`,
            type: shiftTypes.GARDA_ZI,
            department,
            staffIds: allStaffIds,
            requirements: { minDoctors: 1, minNurses: 1, specializations: [department] }
          });

          if (doctors.length >= 2 && nurses.length >= 2) {
            const nightDoctors = doctors.slice(1, 2);
            const nightNurses = nurses.slice(2, 4);
            const nightStaffIds = [...nightDoctors.map(s => s.id), ...nightNurses.map(s => s.id)];

            newShifts[dateKey].push({
              id: `${dateKey}-${department.toLowerCase()}-noapte`,
              type: shiftTypes.NOAPTE,
              department,
              staffIds: nightStaffIds,
              requirements: { minDoctors: 1, minNurses: 1, specializations: [department] }
            });
          }
        }
      });
    }

    setShifts(newShifts);
    addNotification(`Ture generate automat pentru ${formatMonthYear(currentDate)}`, 'success');
  };

  const saveTemplate = () => {
    try {
      localStorage.setItem(`shift-template-${selectedHospital}`, JSON.stringify(shifts));
      addNotification('Șablon salvat cu succes', 'success');
    } catch (error) {
      addNotification('Eroare la salvarea șablonului', 'error');
    }
  };

  const loadTemplate = () => {
    try {
      const template = localStorage.getItem(`shift-template-${selectedHospital}`);
      if (template) {
        setShifts(JSON.parse(template));
        addNotification('Șablon încărcat cu succes', 'success');
      } else {
        addNotification('Nu există șablon salvat', 'warning');
      }
    } catch (error) {
      addNotification('Eroare la încărcarea șablonului', 'error');
    }
  };

  const handleCellClick = (date, dayShifts, e) => {
    if (!hasPermission('assign_staff')) return;
    
    e.preventDefault();
    setAddShiftModalData({ date, editingShift: null });
  };

  // Menu items configuration
  const menuItems = [
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'matrix', label: 'Planificare', icon: BarChart3 },
    { id: 'staff', label: 'Personal', icon: Users },
    ...(hasPermission('edit_system') ? [{ id: 'admin', label: 'Administrare', icon: Settings }] : [])
  ];

  // Render current view
  const renderCurrentView = () => {
    const commonProps = {
      currentDate,
      selectedHospital,
      staff,
      shifts,
      shiftTypes,
      hasPermission,
      addNotification
    };

    switch (currentView) {
      case 'calendar':
        return (
          <CalendarView
            {...commonProps}
            navigateMonth={navigateMonth}
            generateAutomaticShifts={generateAutomaticShifts}
            generateFairSchedule={generateFairSchedule}
            saveTemplate={saveTemplate}
            loadTemplate={loadTemplate}
            getDaysInMonth={() => getDaysInMonth(currentDate)}
            handleCellClick={handleCellClick}
            getStaffName={(staffId) => getStaffName(staffId, staff)}
            getCoverageForDate={getCoverageForDate}
            setAddShiftModalData={setAddShiftModalData}
          />
        );
      
      case 'matrix':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Planificare Personal - {formatMonthYear(currentDate)}
              </h2>
            </div>
            <MatrixView 
              selectedHospital={selectedHospital}
              currentDate={currentDate}
              onAddShift={(date, editingShift) => setAddShiftModalData({ date, editingShift })}
            />
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
        <title>Medical Shift Scheduler</title>
        <meta name="description" content="Hospital Medical Shift Scheduling Application" />
      </Head>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">Medical Scheduler</h1>
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
                        ? 'bg-blue-100 text-blue-700'
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
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                {hospitals.map(hospital => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </option>
                ))}
              </select>

              <div className="relative">
                <button className="p-2 text-gray-600 hover:text-gray-900">
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">{currentUser?.name}</span>
                <button
                  onClick={logout}
                  className="p-2 text-gray-600 hover:text-gray-900"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
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
                      ? 'bg-blue-100 text-blue-700'
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

      {/* Notifications */}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {notifications.slice(0, 3).map(notification => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg max-w-sm ${
              notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
              notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
              notification.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
              'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            <div className="flex items-center">
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 mr-2" />}
              {notification.type === 'error' && <XCircle className="w-5 h-5 mr-2" />}
              {notification.type === 'warning' && <AlertCircle className="w-5 h-5 mr-2" />}
              {notification.type === 'info' && <Bell className="w-5 h-5 mr-2" />}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {addShiftModalData && (
        <AddShiftModal
          selectedDate={addShiftModalData.date}
          editingShift={addShiftModalData.editingShift}
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
    </div>
  );
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