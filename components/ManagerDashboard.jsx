import React, { useState } from 'react';
import Head from 'next/head';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { 
  Calendar, Users, BarChart3, Settings, LogOut, 
  Menu, X, Shield, Plus, Edit2, Trash2
} from './Icons';
import { MatrixView } from './MatrixView';
import { StaffView } from './StaffView';
import { StaffEditModal } from './StaffEditModal';
import { AddShiftModal } from './AddShiftModal';
import { formatMonthYear, addMonths } from '../utils/dateHelpers';

export const ManagerDashboard = () => {
  const { currentUser, logout, hasPermission } = useAuth();
  const { 
    shiftTypes, hospitals, staff, shifts, 
    addStaff, updateStaff, deleteStaff,
    generateFairSchedule, deleteShift, regenerateFromScratch
  } = useData();

  // State
  const [selectedHospital, setSelectedHospital] = useState(currentUser?.hospital || 'spital1');
  const [currentView, setCurrentView] = useState('matrix');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [addShiftModalData, setAddShiftModalData] = useState(null);

  const navigateMonth = (direction) => {
    setCurrentDate(prev => addMonths(prev, direction));
  };

  const handleCellClick = (date, dayShifts, e) => {
    if (!hasPermission('assign_staff')) return;
    e.preventDefault();
    setAddShiftModalData({ date, editingShift: null });
  };

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
                        {member.specialization} • Rol: {member.role} • Max garzi: {member.maxGuardsPerMonth || 10}
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Management
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

      {/* Modals */}
      {addShiftModalData && (
        <AddShiftModal
          selectedDate={addShiftModalData.date}
          editingShift={addShiftModalData.editingShift}
          onClose={() => setAddShiftModalData(null)}
          onSave={() => setAddShiftModalData(null)}
        />
      )}

      {editingStaff && (
        <StaffEditModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
        />
      )}
    </div>
  );
};