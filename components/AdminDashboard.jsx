import React, { useState } from 'react';
import Head from 'next/head';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { 
  Calendar, Users, Building2, Settings, LogOut, 
  Menu, X, Shield, BarChart3
} from './Icons';
import { MatrixView } from './MatrixView';
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
    generateFairSchedule, deleteShift, regenerateFromScratch
  } = useData();

  // State
  const [selectedHospital, setSelectedHospital] = useState(currentUser?.hospital || 'spital1');
  const [currentView, setCurrentView] = useState('matrix');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Modal states
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingHospital, setEditingHospital] = useState(null);
  const [editingShiftType, setEditingShiftType] = useState(null);
  const [addShiftModalData, setAddShiftModalData] = useState(null);

  const navigateMonth = (direction) => {
    setCurrentDate(prev => addMonths(prev, direction));
  };

  const handleCellClick = (date, dayShifts, e) => {
    if (!hasPermission('assign_staff')) return;
    e.preventDefault();
    setAddShiftModalData({ date, editingShift: null });
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
            </div>
            <MatrixView 
              selectedHospital={selectedHospital}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onAddShift={(date, editingShift) => setAddShiftModalData({ date, editingShift })}
              onDeleteShift={deleteShift}
              onRegenerateFromScratch={regenerateFromScratch}
              onGenerateShifts={generateFairSchedule}
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
                <div className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                  ADMIN
                </div>
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
};