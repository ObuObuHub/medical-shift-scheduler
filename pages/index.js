import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
  Calendar, Users, Building2, ArrowLeftRight, Clock, CheckCircle, XCircle,
  AlertCircle, ChevronLeft, ChevronRight, Menu, X, Settings, Shield,
  Wand2, Plus, Edit2, Trash2, Save, UserCog, LogOut, BarChart3, Filter, Download
} from '../components/Icons';
import { AuthProvider, useAuth } from '../components/AuthContext';
import { DataProvider, useData } from '../components/DataContext';
import { LoginForm } from '../components/LoginForm';
import { ShiftTypeEditModal } from '../components/ShiftTypeEditModal';
import { StaffEditModal } from '../components/StaffEditModal';
import { HospitalEditModal } from '../components/HospitalEditModal';
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
    shiftTypes, hospitals, staff, shifts, setShifts, 
    addStaff, updateStaff, deleteStaff,
    addHospital, updateHospital, deleteHospital,
    validateDayCoverage, getCoverageForDate, generateFairSchedule
  } = useData();

  // Core state
  const [selectedHospital, setSelectedHospital] = useState(currentUser?.hospital || 'spital1');
  const [currentView, setCurrentView] = useState('matrix');
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

  // Auto-generation removed - shifts are only generated when clicking "Genereaza" button

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Business logic functions - old auto-generation removed

  const saveTemplate = () => {
    try {
      localStorage.setItem(`shift-template-${selectedHospital}`, JSON.stringify(shifts));
      // Template saved silently - no notification
    } catch (error) {
      // Error handled silently - no notification
    }
  };

  const loadTemplate = () => {
    try {
      const template = localStorage.getItem(`shift-template-${selectedHospital}`);
      if (template) {
        setShifts(JSON.parse(template));
        // Template loaded silently - no notification
      }
      // No template exists - handled silently
    } catch (error) {
      // Error handled silently - no notification
    }
  };

  const deleteTemplate = () => {
    try {
      localStorage.removeItem(`shift-template-${selectedHospital}`);
      // Template deleted silently - no notification
    } catch (error) {
      // Error handled silently - no notification
    }
  };

  const handleCellClick = (date, dayShifts, e) => {
    if (!hasPermission('assign_staff')) return;
    
    e.preventDefault();
    setAddShiftModalData({ date, editingShift: null });
  };

  // Menu items configuration
  const menuItems = [
    { id: 'matrix', label: 'Planificare', icon: BarChart3 },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
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
      hasPermission
    };

    switch (currentView) {
      case 'calendar':
        return (
          <CalendarView
            {...commonProps}
            navigateMonth={navigateMonth}
            generateFairSchedule={generateFairSchedule}
            saveTemplate={saveTemplate}
            loadTemplate={loadTemplate}
            deleteTemplate={deleteTemplate}
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
        <title>Planificare</title>
        <meta name="description" content="Sistem de Planificare Ture Medicale" />
      </Head>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">Planificare</h1>
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

      {/* Notifications - DISABLED */}

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

      {editingStaff && (
        <StaffEditModal
          staff={editingStaff}
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